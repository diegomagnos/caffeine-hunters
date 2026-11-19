"""Reconcile the baseline or apply migrations after the verified history."""

import argparse
from collections import Counter, defaultdict
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import parse_qsl, unquote, urlsplit

MIGRATIONS = Path("supabase/migrations")
FILENAME = re.compile(r"([0-9]{12}|[0-9]{14})_[a-z0-9_]+\.sql")
BASELINE = ("202611100001_profiles.sql", "202611170001_groups.sql")
HISTORY_ABSENCES = {
    "schema_absent": "Schema supabase_migrations ausente.",
    "table_absent": "Tabela schema_migrations ausente no schema supabase_migrations.",
}
PLATFORM_ROLES = {
    "postgres", "PUBLIC", "anon", "authenticated", "service_role", "supabase_admin", "supabase_auth_admin",
}
PRIVILEGES = {
    "SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER", "MAINTAIN",
    "EXECUTE", "USAGE", "CREATE",
}
# Exact ACL delta observed in inspect #4, scoped to the two baseline migrations.
REDUCED_SERVICE_ROLE_ACL = Counter(
    (kind, name, "postgres", "postgres", "service_role", privilege, False)
    for kind, names, privileges in (
        ("table", ("group_admin_permissions", "group_audit_events", "group_members", "groups", "profiles"),
         ("SELECT", "INSERT", "UPDATE", "DELETE")),
        ("function", ("public.create_group(text,text)", "public.create_user_profile()"), ("EXECUTE",)),
    )
    for name in names for privilege in privileges
)
REDUCED_SERVICE_ROLE_DEFAULTS = Counter(
    ("r", privilege, False) for privilege in ("TRUNCATE", "REFERENCES", "TRIGGER", "MAINTAIN")
)

# Only fixed messages reach the logs. libpq's English diagnostics can contain
# connection parameters, credentials, hostnames or arbitrary server messages.
CONNECTION_ERRORS = (
    (("could not translate host name", "name or service not known"),
     "DNS do PostgreSQL. Confira o host do Session pooler."),
    (("does not match host name", "does not match the host name"),
     "TLS do PostgreSQL. O nome não corresponde ao certificado. Use o hostname do Session pooler exibido no painel."),
    (("certificate verify failed", "root certificate file"),
     "TLS do PostgreSQL. Não foi possível validar a cadeia. Confira a CA do painel em SUPABASE_DB_SSL_ROOT_CERT."),
    (("ssl error", "ssl was required", "ssl handshake", "tls handshake", "ssl negotiation", "invalid sslmode"),
     "TLS do PostgreSQL. A negociação falhou. Confira o endpoint do Session pooler e mantenha verify-full."),
    (("authentication failed", "no password supplied", "tenant or user not found",
      "no pg_hba.conf entry", "is not permitted to log in"),
     "autenticação ou acesso ao PostgreSQL. Confira projeto, usuário, senha e restrições de acesso."),
    (("invalid connection option", "invalid uri", "missing key/value", "invalid integer value"),
     "formato da conexão PostgreSQL. Confira a URI e o percent-encoding no secret."),
)
SQL_ERRORS = {
    "42501": "permissão insuficiente para a consulta.",
    "3F000": "schema necessário à consulta indisponível.",
    "42P01": "relação necessária à consulta indisponível.",
    "42703": "coluna esperada pela consulta ausente.",
    "57014": "consulta cancelada ou limite de tempo excedido.",
}


def validate_db_url(db_url):
    if "#" in db_url or re.search(r"[\x00-\x20\x7f]", db_url):
        raise SystemExit("SUPABASE_DB_URL inválida. Use percent-encoding na URI do Session pooler.")
    try:
        url = urlsplit(db_url)
        host = unquote(url.hostname or "")
        options = parse_qsl(url.query, keep_blank_values=True)
    except ValueError:
        raise SystemExit("SUPABASE_DB_URL inválida. Confira a URI do Session pooler.") from None
    if url.scheme not in ("postgresql", "postgres") or not host or host.startswith(("/", "@")) or "," in host:
        raise SystemExit("SUPABASE_DB_URL deve conter a URI PostgreSQL com o host do Session pooler.")
    # libpq honors URI options over the environment. The CLI rebuilds the URI
    # and gets its TLS settings from PGSSLMODE and PGSSLROOTCERT again.
    workflow_options = {"sslrootcert", "requiressl", "sslsni", "sslnegotiation",
                        "gssencmode", "service", "host", "hostaddr"}
    for key, value in options:
        if key in workflow_options or (key == "sslmode" and value != "verify-full"):
            raise SystemExit("Remova as opções de conexão que sobrepõem o TLS ou host do workflow de SUPABASE_DB_URL.")


def local_versions():
    files = sorted(MIGRATIONS.iterdir())
    if tuple(file.name for file in files[:len(BASELINE)]) != BASELINE:
        raise SystemExit("As migrações de perfis e grupos devem iniciar a sequência local.")

    versions = []
    for file in files:
        match = FILENAME.fullmatch(file.name)
        if not match or not file.is_file() or file.is_symlink():
            raise SystemExit("Arquivo inválido em supabase/migrations.")
        versions.append(match[1])
    if len(set(versions)) != len(versions):
        raise SystemExit("Versões duplicadas em supabase/migrations.")
    return versions


def psql_failure(result):
    if result.returncode == 2:
        stderr = result.stderr.lower()
        for fragments, message in CONNECTION_ERRORS:
            if any(fragment in stderr for fragment in fragments):
                return message
        return "conexão PostgreSQL indisponível ou interrompida. Confira host, porta e rede."
    if result.returncode == 3:
        match = re.search(r"\bERROR:\s+([0-9A-Z]{5}):", result.stderr)
        return SQL_ERRORS.get(match[1] if match else None, "consulta recusada pelo PostgreSQL.")
    return "erro no cliente psql."


def read_json(db_url, query, description):
    result = subprocess.run(
        ["psql", "-XAtqw", "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose", "-d", db_url],
        input=query, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        encoding="utf-8", errors="replace",
        env={**os.environ, "LC_ALL": "C", "PGCLIENTENCODING": "UTF8"},
    )
    if result.returncode != 0:
        raise SystemExit(f"Falha na leitura de {description}: {psql_failure(result)}")
    try:
        return json.loads(result.stdout)
    except ValueError:
        raise SystemExit(f"Resposta inesperada na leitura de {description}.") from None


def remote_history(db_url):
    # Read the catalogs and ledger from the same read-only snapshot. A SQL
    # error or a relation of another kind must never become an empty history.
    query = r"""
        BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
        SET LOCAL search_path = pg_catalog;
        SET LOCAL row_security = off;
        SET LOCAL statement_timeout = '30s';
        SELECT state, state = 'table_present' AS has_history
        FROM (
            SELECT CASE
                WHEN n.oid IS NULL THEN 'schema_absent'
                WHEN NOT has_schema_privilege(n.oid, 'USAGE') THEN 'schema_denied'
                WHEN c.oid IS NULL THEN 'table_absent'
                WHEN c.relkind <> 'r' OR c.relpersistence <> 'p' THEN 'invalid_table'
                ELSE 'table_present'
            END AS state
            FROM (VALUES ('supabase_migrations', 'schema_migrations')) AS expected(schema_name, table_name)
            LEFT JOIN pg_namespace n ON n.nspname = expected.schema_name
            LEFT JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = expected.table_name
        ) AS history \gset
        \if :has_history
        SELECT json_build_object(
            'state', :'state', 'versions', coalesce(json_agg(version ORDER BY version COLLATE "C"), '[]'::json)
        )
        FROM supabase_migrations.schema_migrations;
        \else
        SELECT json_build_object('state', :'state', 'versions', '[]'::json);
        \endif
        COMMIT;
    """
    history = read_json(db_url, query, "histórico remoto")
    if not isinstance(history, dict):
        raise SystemExit("Resposta inesperada ao ler o histórico remoto.")
    state, versions = history.get("state"), history.get("versions")
    if not isinstance(state, str) or not isinstance(versions, list):
        raise SystemExit("Resposta inesperada ao ler o histórico remoto.")
    if state == "schema_denied":
        raise SystemExit("Falha na leitura de histórico remoto: sem permissão USAGE no schema supabase_migrations.")
    if state == "invalid_table":
        raise SystemExit("Falha na leitura de histórico remoto: schema_migrations deve ser uma tabela permanente.")
    if state in HISTORY_ABSENCES and versions == []:
        return state, versions
    if state == "table_present" and all(isinstance(version, str) for version in versions):
        return state, versions
    raise SystemExit("Resposta inesperada ao ler o histórico remoto.")


def run_cli(db_url, *args):
    # PostgreSQL and CLI errors may include connection details or data values.
    result = subprocess.run(
        ["supabase", *args, "--db-url", db_url],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


def visible_role(role):
    return role if role in PLATFORM_ROLES else "outro papel"


def equivalent_function_line_endings(expected, actual):
    body = expected["body"]
    remote_body = actual["body"]
    if not body or remote_body == body or remote_body.replace("\r\n", "\n") != body:
        return False
    # Only normalize when we can establish that line endings are outside SQL
    # tokens. Reject escaped strings, multiline quotes, comments and dollar quotes.
    if any(marker in body for marker in ("\\", '"', "$", "--", "/*", "*/")):
        return False
    if "'" in re.sub(r"'(?:[^'\r\n]|'')*'", "", body):
        return False
    before = (expected["definition"] or "").split(body)
    after = (actual["definition"] or "").split(remote_body)
    return len(before) == 2 and before == after


def compare_function_line_endings(expected, actual):
    before = {item["signature"]: item for item in expected or ()}
    result = []
    for item in actual or ():
        versioned = before.get(item["signature"])
        if versioned and equivalent_function_line_endings(versioned, item):
            print(f"Função {versioned['signature']}: corpo equivalente com fim de linha CRLF/LF.")
            item = item | {"body": versioned["body"], "definition": versioned["definition"]}
        result.append(item)
    return result if actual is not None else None


def report_function_differences(expected, actual):
    before = {item["signature"]: item for item in expected or ()}
    after = {item["signature"]: item for item in actual or ()}
    known_names = {item["routine"] for item in before.values()}
    for signature, item in before.items():
        current = after.get(signature)
        if current is None:
            print(f"Função {signature}: assinatura esperada ausente.")
            continue
        if item["owner"] != current["owner"]:
            print(f"Função {signature}: proprietário esperado {visible_role(item['owner'])}, "
                  f"encontrado {visible_role(current['owner'])}.")
        fields = [
            label for key, label in (
                ("body", "corpo SQL"),
                ("security_definer", "SECURITY DEFINER"),
                ("settings", "configuração da função"),
            ) if item[key] != current[key]
        ]
        if item["definition"] != current["definition"] and not fields:
            fields.append("declaração ou atributos")
        if fields:
            print(f"Função {signature}: diferença em " + ", ".join(fields) + ".")
    for name in sorted(known_names):
        count = sum(item["routine"] == name for signature, item in after.items() if signature not in before)
        if count:
            print(f"Função {name}: {count} assinatura(s) adicional(is).")


def report_permission_differences(expected, actual, reference):
    known_objects = {(kind, name) for kind, name, *_ in expected}
    known_objects.update(("column", f"{row[0]}.{row[1]}") for row in reference["colunas e defaults"] or ())
    for delta, label in ((expected - actual, "ausente"), (actual - expected, "adicional")):
        groups = defaultdict(list)
        for (kind, name, owner, grantor, grantee, privilege, grantable), count in sorted(delta.items()):
            object_label = name if (kind, name) in known_objects else "objeto extra"
            privilege_label = privilege if privilege in PRIVILEGES else "outro privilégio"
            group = (object_label, visible_role(owner), visible_role(grantor), visible_role(grantee), grantable)
            groups[group].extend([privilege_label] * count)
        for (name, owner, grantor, grantee, grantable), privileges in groups.items():
            option = "com repasse" if grantable else "sem repasse"
            print(f"ACL {label} em {name}: {', '.join(sorted(set(privileges)))}; "
                  f"proprietário {owner}, concedente {grantor}, beneficiário {grantee}, {option}.")


def check_reconciliation(db_url, local, reference_path, *, accept_reduced_service_role_acl=False):
    state, recorded = remote_history(db_url)
    if state in HISTORY_ABSENCES:
        print(HISTORY_ABSENCES[state])
    if recorded != local[:len(recorded)]:
        raise SystemExit("Histórico remoto divergente da sequência local. Reconciliação bloqueada.")
    pending = local[len(recorded):len(BASELINE)]
    if not pending:
        print("Histórico inicial já registrado. Nenhuma alteração necessária.")
        return state, recorded, pending

    try:
        reference = json.loads(reference_path.read_text(encoding="utf-8"))
    except (UnicodeError, json.JSONDecodeError):
        raise SystemExit("Referência descartável inválida. Reconciliação bloqueada.") from None
    if not isinstance(reference, dict) or reference.get("backfill de perfis") is not True:
        raise SystemExit("Referência descartável inválida. Reconciliação bloqueada.")
    query = Path("scripts/supabase-baseline.sql").read_text(encoding="utf-8")
    installed = read_json(db_url, query, "definições e backfill em produção")
    if not isinstance(installed, dict) or installed.keys() != reference.keys():
        raise SystemExit("Resposta inesperada na comparação. Reconciliação bloqueada.")
    version_key = "versão principal do PostgreSQL"
    versions = reference.pop(version_key), installed.pop(version_key)
    if all(type(version) is int for version in versions):
        print(f"PostgreSQL principal: referência {versions[0]}, remoto {versions[1]}.")
    defaults_key = "defaults de service_role em public"
    reference.pop(defaults_key)
    installed_defaults = Counter(map(tuple, installed.pop(defaults_key)))
    expected_acl = Counter(map(tuple, reference["permissões"] or ()))
    actual_acl = Counter(map(tuple, installed["permissões"] or ()))
    function_key = "funções e proprietários"
    installed[function_key] = compare_function_line_endings(reference[function_key], installed[function_key])
    differences = [
        section for section in reference
        if section != "permissões" and reference[section] != installed[section]
    ]
    if expected_acl != actual_acl:
        reduced_pattern = (
            versions == (17, 17)
            and expected_acl - actual_acl == REDUCED_SERVICE_ROLE_ACL
            and not actual_acl - expected_acl
        )
        matched = reduced_pattern and installed_defaults == REDUCED_SERVICE_ROLE_DEFAULTS
        if reduced_pattern:
            if matched:
                print("ACL reduzida de service_role confirmada pelos defaults atuais de postgres em public.")
            else:
                print("ACL reduzida de service_role sem correspondência com os defaults atuais de postgres em public.")
        if matched and accept_reduced_service_role_acl:
            print("Perfil reduzido de service_role aceito por autorização explícita. Nenhum grant será alterado.")
        else:
            differences.append("permissões")
            report_permission_differences(expected_acl, actual_acl, reference)
            if matched:
                print("O perfil reduzido exige revisão e aceite explícito.")
    if function_key in differences:
        report_function_differences(reference[function_key], installed[function_key])
    if differences:
        raise SystemExit("Reconciliação bloqueada. Divergências em: " + ", ".join(differences))
    print("Definições do banco e backfill de perfis conferidos.")
    return state, recorded, pending


def reconcile(db_url, local, reference_path, *, accept_reduced_service_role_acl=False):
    state, recorded, pending = check_reconciliation(
        db_url, local, reference_path, accept_reduced_service_role_acl=accept_reduced_service_role_acl,
    )
    if not pending:
        return
    if remote_history(db_url) != (state, recorded):
        raise SystemExit("Histórico alterado durante a verificação. Reconciliação bloqueada.")
    print("Registrando no histórico:", ", ".join(pending))
    if not run_cli(db_url, "migration", "repair", "--status", "applied", *pending):
        raise SystemExit("O reparo falhou. Verifique o estado antes de disparar outra execução.")
    baseline = local[:len(BASELINE)]
    if remote_history(db_url) != ("table_present", baseline):
        raise SystemExit("O histórico após o reparo diverge do esperado.")
    print("Histórico inicial verificado:", ", ".join(baseline))


def deploy(db_url, local):
    state, remote = remote_history(db_url)
    if state in HISTORY_ABSENCES:
        print(HISTORY_ABSENCES[state])
    if remote[:len(BASELINE)] != local[:len(BASELINE)]:
        raise SystemExit("Histórico inicial divergente. Consulte docs/SUPABASE_MIGRATIONS.md.")
    if remote != local[:len(remote)]:
        raise SystemExit("Histórico remoto divergente da sequência local. Implantação bloqueada.")

    pending = local[len(remote):]
    if not pending:
        print("Histórico verificado. Nenhuma migração pendente.")
        return

    print("Versões pendentes:", ", ".join(pending))
    if not run_cli(db_url, "db", "push", "--dry-run"):
        raise SystemExit("A simulação da Supabase CLI falhou. Implantação bloqueada.")
    if remote_history(db_url) != (state, remote):
        raise SystemExit("Histórico alterado durante a simulação. Implantação bloqueada.")
    if not run_cli(db_url, "db", "push", "--yes"):
        raise SystemExit("A aplicação falhou. Verifique o histórico e o schema antes de repetir.")
    if remote_history(db_url) != ("table_present", local):
        raise SystemExit("O histórico após a aplicação diverge da sequência esperada.")

    print("Histórico final verificado. Versões aplicadas:", ", ".join(pending))


def main():
    parser = argparse.ArgumentParser()
    operation = parser.add_mutually_exclusive_group()
    operation.add_argument("--reconcile", type=Path, metavar="REFERENCE")
    operation.add_argument("--inspect", type=Path, metavar="REFERENCE")
    parser.add_argument("--accept-reduced-service-role-acl", action="store_true")
    args = parser.parse_args()
    if args.accept_reduced_service_role_acl and not (args.inspect or args.reconcile):
        parser.error("O aceite da ACL reduzida só se aplica a inspect ou reconcile.")
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        raise SystemExit("Configure SUPABASE_DB_URL no environment production.")
    validate_db_url(db_url)

    local = local_versions()
    if args.inspect:
        check_reconciliation(
            db_url, local, args.inspect, accept_reduced_service_role_acl=args.accept_reduced_service_role_acl,
        )
        print("Inspeção somente leitura concluída.")
    elif args.reconcile:
        reconcile(
            db_url, local, args.reconcile, accept_reduced_service_role_acl=args.accept_reduced_service_role_acl,
        )
    else:
        deploy(db_url, local)


if __name__ == "__main__":
    try:
        main()
    except OSError:
        raise SystemExit("Não foi possível ler os arquivos locais ou iniciar psql/Supabase CLI.") from None
