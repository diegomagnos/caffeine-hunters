"""Reconcile the baseline or apply migrations after the verified history."""

import argparse
import json
import os
from pathlib import Path
import re
import subprocess

MIGRATIONS = Path("supabase/migrations")
FILENAME = re.compile(r"([0-9]{12}|[0-9]{14})_[a-z0-9_]+\.sql")
BASELINE = ("202611100001_profiles.sql", "202611170001_groups.sql")


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


def read_json(db_url, query, description):
    result = subprocess.run(
        ["psql", "-XAtqw", "-v", "ON_ERROR_STOP=1", "-d", db_url],
        input=query, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True,
    )
    if result.returncode != 0:
        raise SystemExit(f"Falha na leitura de {description}. Verifique acesso, TLS e schema.")
    try:
        return json.loads(result.stdout)
    except ValueError:
        raise SystemExit(f"Resposta inesperada na leitura de {description}.") from None


def remote_versions(db_url):
    # Read the raw ledger, including unexpected values that a CLI table can omit.
    query = r"""
        BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
        SET LOCAL statement_timeout = '30s';
        SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS has_history \gset
        \if :has_history
        SELECT coalesce(json_agg(version ORDER BY version COLLATE "C"), '[]'::json)
        FROM supabase_migrations.schema_migrations;
        \else
        SELECT 'null'::json;
        \endif
        COMMIT;
    """
    versions = read_json(db_url, query, "histórico remoto")
    if versions is not None and not isinstance(versions, list):
        raise SystemExit("Resposta inesperada ao ler o histórico remoto.")
    return versions


def run_cli(db_url, *args):
    # PostgreSQL and CLI errors may include connection details or data values.
    result = subprocess.run(
        ["supabase", *args, "--db-url", db_url],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


def reconcile(db_url, local, reference_path):
    baseline = local[:len(BASELINE)]
    remote = remote_versions(db_url)
    recorded = remote if remote is not None else []
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

    if remote_versions(db_url) != remote:
        raise SystemExit("Histórico alterado durante a verificação. Reconciliação bloqueada.")
    print("Registrando no histórico:", ", ".join(pending))
    if not run_cli(db_url, "migration", "repair", "--status", "applied", *pending):
        raise SystemExit("O reparo falhou. Verifique o estado antes de disparar outra execução.")
    if remote_versions(db_url) != baseline:
        raise SystemExit("O histórico após o reparo diverge do esperado.")
    print("Histórico inicial verificado:", ", ".join(baseline))


def deploy(db_url, local):
    remote = remote_versions(db_url)
    if remote is None or remote[:len(BASELINE)] != local[:len(BASELINE)]:
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
    if remote_versions(db_url) != remote:
        raise SystemExit("Histórico alterado durante a simulação. Implantação bloqueada.")
    if not run_cli(db_url, "db", "push", "--yes"):
        raise SystemExit("A aplicação falhou. Verifique o histórico e o schema antes de repetir.")
    if remote_versions(db_url) != local:
        raise SystemExit("O histórico após a aplicação diverge da sequência esperada.")

    print("Histórico final verificado. Versões aplicadas:", ", ".join(pending))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reconcile", type=Path, metavar="REFERENCE")
    args = parser.parse_args()
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        raise SystemExit("Configure SUPABASE_DB_URL no environment production.")

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
