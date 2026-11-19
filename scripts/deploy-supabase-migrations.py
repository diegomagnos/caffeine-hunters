"""Reconcile the baseline or apply migrations after the verified history."""

import argparse
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


def reconcile(db_url, local, reference_path):
    baseline = local[:len(BASELINE)]
    state, recorded = remote_history(db_url)
    if state in HISTORY_ABSENCES:
        print(HISTORY_ABSENCES[state])
    if recorded != local[:len(recorded)]:
        raise SystemExit("Histórico remoto divergente da sequência local. Reconciliação bloqueada.")
    pending = baseline[len(recorded):]
    if not pending:
        print("Histórico inicial já registrado. Nenhuma alteração necessária.")
        return

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
    differences = [section for section in reference if reference[section] != installed[section]]
    if differences:
        raise SystemExit("Reconciliação bloqueada. Divergências em: " + ", ".join(differences))
    print("Definições do banco e backfill de perfis conferidos.")

    if remote_history(db_url) != (state, recorded):
        raise SystemExit("Histórico alterado durante a verificação. Reconciliação bloqueada.")
    print("Registrando no histórico:", ", ".join(pending))
    if not run_cli(db_url, "migration", "repair", "--status", "applied", *pending):
        raise SystemExit("O reparo falhou. Verifique o estado antes de disparar outra execução.")
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
    parser.add_argument("--reconcile", type=Path, metavar="REFERENCE")
    args = parser.parse_args()
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        raise SystemExit("Configure SUPABASE_DB_URL no environment production.")
    validate_db_url(db_url)

    local = local_versions()
    if args.reconcile:
        reconcile(db_url, local, args.reconcile)
    else:
        deploy(db_url, local)


if __name__ == "__main__":
    try:
        main()
    except OSError:
        raise SystemExit("Não foi possível ler os arquivos locais ou iniciar psql/Supabase CLI.") from None
