"""Exercise the production reconciliation against the isolated RLS fixture."""

from importlib.util import module_from_spec, spec_from_file_location
from contextlib import redirect_stdout
from io import StringIO
import os
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
from time import sleep
from types import SimpleNamespace
from unittest.mock import patch

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
INSPECT_URL = URL.replace("sslmode=disable", "application_name=inspection_fixture")
VERIFIED_URL = "postgresql://postgres@localhost:5432/postgres"
MISMATCHED_URL = VERIFIED_URL.replace("@localhost", "@127.0.0.1")
TLS_TARGETS = {VERIFIED_URL, MISMATCHED_URL}
FIXTURE_URLS = {URL, DIAGNOSTICS_URL, READER_URL, REFUSED_URL, TLS_URL, INVALID_URL, INSPECT_URL} | TLS_TARGETS


def docker(*args, **kwargs):
    return subprocess.run([*DOCKER, *args], check=True, **kwargs)


def sql(query, url=URL):
    return docker(
        "exec", "-i", CONTAINER, "psql", "-XAtqw", "-v", "ON_ERROR_STOP=1", "-d", url,
        input=query, capture_output=True, text=True,
    ).stdout.strip()


def run_in_fixture(args, **kwargs):
    assert args[-1] in FIXTURE_URLS and args[0] in {"psql", "supabase"}
    env = kwargs.get("env", os.environ)
    tls_env = ["-e", "PGSSLMODE=disable"]
    if args[-1] in TLS_TARGETS:
        assert env["PGSSLMODE"] == "verify-full"
        tls_env = ["-e", "PGSSLMODE=verify-full", "-e", f"PGSSLROOTCERT={env['PGSSLROOTCERT']}"]
    return subprocess.run(
        # The CLI rebuilds the URI, so it also needs the TLS mode in its environment.
        [*DOCKER, "exec", "-i", *tls_env, "-e", "LC_ALL=C",
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


def install_tls_fixture(directory):
    # A private test CA reproduces a pooler chain that the system bundle cannot verify.
    ca = Path(directory) / "root.crt"
    ca_key = Path(directory) / "root.key"
    cert = Path(directory) / "server.crt"
    key = Path(directory) / "server.key"
    request = Path(directory) / "server.csr"
    extensions = Path(directory) / "server.ext"
    extensions.write_text("subjectAltName=DNS:localhost\nextendedKeyUsage=serverAuth\n", encoding="utf-8")
    openssl_commands = [
        ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "2",
         "-subj", "/CN=Caffeine Test CA", "-addext", "basicConstraints=critical,CA:TRUE",
         "-keyout", ca_key, "-out", ca],
        ["req", "-new", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=localhost",
         "-keyout", key, "-out", request],
        ["x509", "-req", "-in", request, "-CA", ca, "-CAkey", ca_key, "-CAcreateserial",
         "-days", "2", "-extfile", extensions, "-out", cert],
    ]
    for command in openssl_commands:
        subprocess.run(["openssl", *command], check=True, capture_output=True)
    for file in (ca, cert, key):
        docker("cp", file, f"{CONTAINER}:/tmp/caffeine/{file.name}")
    docker("cp", "-L", "/etc/ssl/certs/ca-certificates.crt", f"{CONTAINER}:/tmp/caffeine/system-ca.crt")
    docker("exec", CONTAINER, "chown", "postgres:postgres", "/tmp/caffeine/server.crt", "/tmp/caffeine/server.key")
    docker("exec", CONTAINER, "chmod", "600", "/tmp/caffeine/server.key")
    sql("ALTER SYSTEM SET ssl_cert_file = '/tmp/caffeine/server.crt'")
    sql("ALTER SYSTEM SET ssl_key_file = '/tmp/caffeine/server.key'")
    sql("ALTER SYSTEM SET ssl = on")
    sql("SELECT pg_reload_conf()")
    for _ in range(20):
        try:
            sql("SELECT 1", TLS_URL)
            return
        except subprocess.CalledProcessError:
            sleep(0.25)
    raise AssertionError("O PostgreSQL descartável não ativou TLS.")


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

    def inspect():
        args = ["deploy-supabase-migrations.py", "--inspect", str(reference)]
        with patch.object(sys, "argv", args), patch.dict(os.environ, SUPABASE_DB_URL=INSPECT_URL):
            deployment.main()

    def check_report(action, *labels, hidden=()):
        output = StringIO()
        with redirect_stdout(output), patch.object(deployment, "run_cli") as cli:
            blocked(action, "Reconciliação bloqueada")
            cli.assert_not_called()
        report = output.getvalue()
        assert all(label in report for label in labels), report
        assert all(value not in report for value in hidden), report
        assert deployment.remote_history(URL) == ("schema_absent", [])

    assert deployment.remote_history(URL) == ("schema_absent", [])
    blocked(lambda: deployment.deploy(URL, local), "Histórico inicial divergente")
    assert deployment.remote_history(URL) == ("schema_absent", [])

    # Supabase-managed objects outside the application's scope stay out of the comparison.
    sql("CREATE FUNCTION auth.managed_fixture() RETURNS int LANGUAGE sql AS 'SELECT 1'")
    sql("GRANT EXECUTE ON FUNCTION auth.managed_fixture() TO service_role")
    with patch.object(deployment, "run_cli") as cli:
        inspect()
        cli.assert_not_called()
    assert deployment.remote_history(URL) == ("schema_absent", [])

    # PostgreSQL 17 adds MAINTAIN to table ALL. An ACL variation is evidence, not an exemption.
    sql("REVOKE MAINTAIN ON public.profiles FROM service_role")
    check_report(inspect, "ACL ausente em profiles: MAINTAIN", "beneficiário service_role")
    sql("GRANT MAINTAIN ON public.profiles TO service_role")

    versioned_function = sql("SELECT pg_get_functiondef('private.is_group_member(uuid)'::regprocedure)")
    sql("CREATE ROLE synthetic_private_owner")
    sql("ALTER FUNCTION private.is_group_member(uuid) OWNER TO synthetic_private_owner")
    check_report(reconcile, "proprietário esperado postgres, encontrado outro papel",
                 hidden=("synthetic_private_owner",))
    sql("ALTER FUNCTION private.is_group_member(uuid) OWNER TO postgres")
    sql("""
        CREATE OR REPLACE FUNCTION private.is_group_member(target_group_id uuid) RETURNS boolean
        LANGUAGE sql STABLE SECURITY INVOKER SET search_path = synthetic_private_schema AS
        $$ SELECT true /* synthetic_private_body */ $$
    """)
    check_report(inspect, "is_group_member(uuid): diferença em corpo SQL, SECURITY DEFINER, configuração",
                 hidden=("synthetic_private_schema", "synthetic_private_body"))
    sql(versioned_function)
    sql("CREATE FUNCTION public.create_group(integer) RETURNS int LANGUAGE sql AS 'SELECT 1'")
    check_report(reconcile, "Função public.create_group: 1 assinatura(s) adicional(is).")
    sql("DROP FUNCTION public.create_group(integer)")

    # An installed object with a different definition must block repair.
    sql("ALTER POLICY profiles_read_own ON public.profiles USING (false)")
    blocked(reconcile, "políticas")
    assert deployment.remote_history(URL) == ("schema_absent", [])
    sql("ALTER POLICY profiles_read_own ON public.profiles USING ((SELECT auth.uid()) = id)")

    sql("GRANT SELECT ON public.group_audit_events TO authenticated")
    check_report(reconcile, "ACL adicional em group_audit_events: SELECT", "beneficiário authenticated")
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

deployment.validate_db_url(VERIFIED_URL)
deployment.validate_db_url(VERIFIED_URL + "?sslmode=verify-full")
blocked(lambda: deployment.validate_db_url(VERIFIED_URL + "?application_name=fixture#&sslmode=disable"),
        "SUPABASE_DB_URL inválida", ("localhost",))
for option in ("sslmode=require", "sslmode=disable&sslmode=verify-full",
               "sslrootcert=synthetic_private_value", "requiressl=1", "service=synthetic_private_value",
               "host=%2Ftmp", "gssencmode=require"):
    blocked(lambda: deployment.validate_db_url(VERIFIED_URL + "?" + option),
            "sobrepõem o TLS ou host", ("localhost", "synthetic_private_value"))

with TemporaryDirectory() as directory:
    install_tls_fixture(directory)
    with patch.dict(os.environ, PGSSLMODE="verify-full", PGSSLROOTCERT="/tmp/caffeine/system-ca.crt"):
        blocked(lambda: deployment.remote_history(VERIFIED_URL),
                "Não foi possível validar a cadeia", ("localhost",))
        assert not deployment.run_cli(VERIFIED_URL, "migration", "list")

    with patch.dict(os.environ, PGSSLMODE="verify-full", PGSSLROOTCERT="/tmp/caffeine/root.crt"):
        assert deployment.remote_history(VERIFIED_URL) == ("table_present", [groups])
        assert deployment.run_cli(VERIFIED_URL, "migration", "list")
        blocked(lambda: deployment.remote_history(MISMATCHED_URL),
                "O nome não corresponde ao certificado", ("127.0.0.1", "localhost"))
        assert not deployment.run_cli(MISMATCHED_URL, "migration", "list")

print("Reconciliação aprovada com CLI 2.54.11 e PostgreSQL 17 descartável.")
