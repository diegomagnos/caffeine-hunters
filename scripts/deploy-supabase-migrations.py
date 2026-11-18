"""Apply only migrations that follow the verified production history."""

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


def remote_versions(db_url):
    # Read the raw ledger, including unexpected values that a CLI table can omit.
    query = """
        BEGIN READ ONLY;
        SELECT coalesce(json_agg(version ORDER BY version COLLATE "C"), '[]'::json)
        FROM supabase_migrations.schema_migrations;
        COMMIT;
    """
    result = subprocess.run(
        ["psql", "-XAtqw", "-v", "ON_ERROR_STOP=1", "-d", db_url, "-c", query],
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True,
    )
    if result.returncode != 0:
        raise SystemExit(
            "Falha ao ler o histórico remoto. Verifique acesso, TLS e reconciliação."
        )
    try:
        versions = json.loads(result.stdout)
    except ValueError:
        raise SystemExit("Resposta inesperada ao ler o histórico remoto.") from None
    if not isinstance(versions, list):
        raise SystemExit("Resposta inesperada ao ler o histórico remoto.")
    return versions


def push(db_url, *flags):
    # PostgreSQL and CLI errors may include connection details or data values.
    result = subprocess.run(
        ["supabase", "db", "push", "--db-url", db_url, *flags],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


def main():
    db_url = os.environ.get("SUPABASE_DB_URL")
    if not db_url:
        raise SystemExit("Configure SUPABASE_DB_URL no environment production.")

    local = local_versions()
    remote = remote_versions(db_url)
    if remote[:len(BASELINE)] != local[:len(BASELINE)]:
        raise SystemExit("Histórico inicial divergente. Consulte docs/SUPABASE_MIGRATIONS.md.")
    if remote != local[:len(remote)]:
        raise SystemExit("Histórico remoto divergente da sequência local. Implantação bloqueada.")

    pending = local[len(remote):]
    if not pending:
        print("Histórico verificado. Nenhuma migração pendente.")
        return

    print("Versões pendentes:", ", ".join(pending))
    if not push(db_url, "--dry-run"):
        raise SystemExit("A simulação da Supabase CLI falhou. Implantação bloqueada.")
    if remote_versions(db_url) != remote:
        raise SystemExit("Histórico alterado durante a simulação. Implantação bloqueada.")
    if not push(db_url, "--yes"):
        raise SystemExit("A aplicação falhou. Verifique o histórico e o schema antes de repetir.")
    if remote_versions(db_url) != local:
        raise SystemExit("O histórico após a aplicação diverge da sequência esperada.")

    print("Histórico final verificado. Versões aplicadas:", ", ".join(pending))


if __name__ == "__main__":
    try:
        main()
    except OSError:
        raise SystemExit("Não foi possível ler os arquivos locais ou iniciar psql/Supabase CLI.") from None
