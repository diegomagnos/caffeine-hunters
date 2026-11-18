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


def docker(*args, **kwargs):
    return subprocess.run([*DOCKER, *args], check=True, **kwargs)


def sql(query):
    return docker(
        "exec", "-i", CONTAINER, "psql", "-XAtqw", "-v", "ON_ERROR_STOP=1", "-d", URL,
        input=query, capture_output=True, text=True,
    ).stdout.strip()


def run_in_fixture(args, **kwargs):
    assert URL in args and args[0] in {"psql", "supabase"}
    result = subprocess.run(
        # The CLI rebuilds the URI, so it also needs the TLS mode in its environment.
        [*DOCKER, "exec", "-i", "-e", "PGSSLMODE=disable", "-w", "/tmp/caffeine", CONTAINER, *args],
        **{**kwargs, "stderr": subprocess.PIPE},
    )
    if result.returncode:
        print(result.stderr, file=sys.stderr)
    return result


def blocked(action, message):
    try:
        action()
    except SystemExit as error:
        assert message in str(error), str(error)
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

    assert deployment.remote_versions(URL) is None
    blocked(lambda: deployment.deploy(URL, local), "Histórico inicial divergente")
    assert deployment.remote_versions(URL) is None

    # An installed object with a different definition must block repair.
    sql("ALTER POLICY profiles_read_own ON public.profiles USING (false)")
    blocked(reconcile, "políticas")
    assert deployment.remote_versions(URL) is None
    sql("ALTER POLICY profiles_read_own ON public.profiles USING ((SELECT auth.uid()) = id)")

    sql("GRANT SELECT ON public.group_audit_events TO authenticated")
    blocked(reconcile, "permissões")
    assert deployment.remote_versions(URL) is None
    sql("REVOKE SELECT ON public.group_audit_events FROM authenticated")

    sql("DELETE FROM public.profiles")
    blocked(reconcile, "backfill de perfis")
    assert deployment.remote_versions(URL) is None
    sql("INSERT INTO public.profiles (id, display_name) SELECT id, 'Perfil de teste' FROM auth.users")

    def profile():
        return sql("SELECT tableoid, id, display_name, created_at FROM public.profiles")

    before = profile()
    reconcile()
    assert deployment.remote_versions(URL) == [profiles, groups]
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
    assert deployment.remote_versions(URL) == [profiles, groups]
    assert profile() == before

    sql(f"DELETE FROM supabase_migrations.schema_migrations WHERE version = '{profiles}'")
    blocked(reconcile, "Histórico remoto divergente")
    assert deployment.remote_versions(URL) == [groups]

print("Reconciliação aprovada com CLI 2.54.11 e PostgreSQL 17 descartável.")
