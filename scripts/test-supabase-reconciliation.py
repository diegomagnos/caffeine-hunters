"""Exercise the production reconciliation against the isolated RLS fixture."""

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
from types import SimpleNamespace

SPEC = spec_from_file_location("deployment", "scripts/deploy-supabase-migrations.py")
deployment = module_from_spec(SPEC)
SPEC.loader.exec_module(deployment)

CONTAINER = sys.argv[1]
DOCKER = ["docker", "--host=unix:///var/run/docker.sock"]
URL = "postgresql://postgres@127.0.0.1:5432/postgres?sslmode=disable"
DIAGNOSTICS_URL = URL.replace("/postgres?", "/history_diagnostics?")
READER_URL = DIAGNOSTICS_URL.replace("postgres@", "history_reader@")
REFUSED_URL = URL.replace(":5432/", ":1/")
TLS_URL = URL.replace("sslmode=disable", "sslmode=require")
INVALID_URL = URL + "&synthetic_private_option=synthetic_private_value"
FIXTURE_URLS = {URL, DIAGNOSTICS_URL, READER_URL, REFUSED_URL, TLS_URL, INVALID_URL}


def docker(*args, **kwargs):
    return subprocess.run([*DOCKER, *args], check=True, **kwargs)


def sql(query, url=URL):
    return docker(
        "exec", "-i", CONTAINER, "psql", "-XAtqw", "-v", "ON_ERROR_STOP=1", "-d", url,
        input=query, capture_output=True, text=True,
    ).stdout.strip()


def run_in_fixture(args, **kwargs):
    assert args[-1] in FIXTURE_URLS and args[0] in {"psql", "supabase"}
    return subprocess.run(
        # The CLI rebuilds the URI, so it also needs the TLS mode in its environment.
        [*DOCKER, "exec", "-i", "-e", "PGSSLMODE=disable", "-e", "LC_ALL=C",
         "-w", "/tmp/caffeine", CONTAINER, *args],
        **kwargs,
    )


def blocked(action, message, hidden=()):
    try:
        action()
    except SystemExit as error:
        assert message in str(error), str(error)
        assert all(fragment not in str(error) for fragment in hidden), str(error)
    else:
        raise AssertionError("A operação deveria ter sido bloqueada.")


cli = shutil.which("supabase")
assert cli, "Instale Supabase CLI 2.54.11 para executar este teste."
docker("exec", CONTAINER, "mkdir", "-p", "/tmp/caffeine/supabase")
docker("cp", cli, f"{CONTAINER}:/usr/local/bin/supabase")
docker("cp", "supabase/migrations", f"{CONTAINER}:/tmp/caffeine/supabase")
version = docker("exec", CONTAINER, "supabase", "--version", capture_output=True, text=True)
assert version.stdout.strip() == "2.54.11", version.stdout

deployment.subprocess = SimpleNamespace(
    run=run_in_fixture, PIPE=subprocess.PIPE, DEVNULL=subprocess.DEVNULL,
)
# Exercise real psql/libpq exit codes using an isolated database and loopback.
blocked(lambda: deployment.remote_history(REFUSED_URL), "conexão PostgreSQL indisponível", ("127.0.0.1",))
blocked(lambda: deployment.remote_history(TLS_URL), "TLS do PostgreSQL", ("127.0.0.1",))
blocked(lambda: deployment.remote_history(INVALID_URL), "formato da conexão", ("synthetic_private",))

sql("CREATE DATABASE history_diagnostics")
sql("CREATE ROLE history_reader LOGIN")
assert deployment.remote_history(DIAGNOSTICS_URL) == ("schema_absent", [])
sql("CREATE SCHEMA supabase_migrations", DIAGNOSTICS_URL)
assert deployment.remote_history(DIAGNOSTICS_URL) == ("table_absent", [])
blocked(lambda: deployment.remote_history(READER_URL), "sem permissão USAGE", ("history_reader",))
sql("GRANT USAGE ON SCHEMA supabase_migrations TO history_reader", DIAGNOSTICS_URL)
assert deployment.remote_history(READER_URL) == ("table_absent", [])

sql("CREATE VIEW supabase_migrations.schema_migrations AS SELECT '202611100001'::text AS version", DIAGNOSTICS_URL)
blocked(lambda: deployment.remote_history(DIAGNOSTICS_URL), "deve ser uma tabela permanente")
sql("DROP VIEW supabase_migrations.schema_migrations", DIAGNOSTICS_URL)
sql("CREATE TABLE supabase_migrations.schema_migrations (other text)", DIAGNOSTICS_URL)
blocked(lambda: deployment.remote_history(DIAGNOSTICS_URL), "coluna esperada", ("other",))
sql("ALTER TABLE supabase_migrations.schema_migrations RENAME COLUMN other TO version", DIAGNOSTICS_URL)
assert deployment.remote_history(DIAGNOSTICS_URL) == ("table_present", [])
blocked(lambda: deployment.remote_history(READER_URL), "permissão insuficiente", ("history_reader",))
sql("GRANT SELECT ON supabase_migrations.schema_migrations TO history_reader", DIAGNOSTICS_URL)
sql("ALTER TABLE supabase_migrations.schema_migrations ENABLE ROW LEVEL SECURITY", DIAGNOSTICS_URL)
blocked(lambda: deployment.remote_history(READER_URL), "permissão insuficiente")
sql("ALTER ROLE history_reader NOLOGIN")
blocked(lambda: deployment.remote_history(READER_URL), "autenticação ou acesso", ("history_reader",))

local = deployment.local_versions()
profiles, groups = local[:2]

with TemporaryDirectory() as directory:
    reference = Path(directory) / "baseline.json"
    with reference.open("w", encoding="utf-8") as output:
        subprocess.run(
            ["node", "scripts/test-rls.mjs", "--baseline-reference"], stdout=output, check=True,
        )

    def reconcile():
        deployment.reconcile(URL, local, reference)

    assert deployment.remote_history(URL) == ("schema_absent", [])
    blocked(lambda: deployment.deploy(URL, local), "Histórico inicial divergente")
    assert deployment.remote_history(URL) == ("schema_absent", [])

    # An installed object with a different definition must block repair.
    sql("ALTER POLICY profiles_read_own ON public.profiles USING (false)")
    blocked(reconcile, "políticas")
    assert deployment.remote_history(URL) == ("schema_absent", [])
    sql("ALTER POLICY profiles_read_own ON public.profiles USING ((SELECT auth.uid()) = id)")

    sql("GRANT SELECT ON public.group_audit_events TO authenticated")
    blocked(reconcile, "permissões")
    assert deployment.remote_history(URL) == ("schema_absent", [])
    sql("REVOKE SELECT ON public.group_audit_events FROM authenticated")

    sql("DELETE FROM public.profiles")
    blocked(reconcile, "backfill de perfis")
    assert deployment.remote_history(URL) == ("schema_absent", [])
    sql("INSERT INTO public.profiles (id, display_name) SELECT id, 'Perfil de teste' FROM auth.users")

    def profile():
        return sql("SELECT tableoid, id, display_name, created_at FROM public.profiles")

    before = profile()
    reconcile()
    assert deployment.remote_history(URL) == ("table_present", [profiles, groups])
    assert profile() == before
    deployment.deploy(URL, [profiles, groups])
    assert sql("""
        SELECT count(*) FROM supabase_migrations.schema_migrations
        WHERE name IN ('profiles', 'groups') AND cardinality(statements) > 0
    """) == "2"

    # An interrupted operator can resume a prefix, and repeated runs are harmless.
    sql(f"DELETE FROM supabase_migrations.schema_migrations WHERE version = '{groups}'")
    reconcile()
    reconcile()
    assert deployment.remote_history(URL) == ("table_present", [profiles, groups])
    assert profile() == before

    sql(f"DELETE FROM supabase_migrations.schema_migrations WHERE version = '{profiles}'")
    blocked(reconcile, "Histórico remoto divergente")
    assert deployment.remote_history(URL) == ("table_present", [groups])

print("Reconciliação aprovada com CLI 2.54.11 e PostgreSQL 17 descartável.")
