// PostgreSQL real e descartável; auth.users/auth.uid são contratos mínimos de teste.
// Não testa JWT, PostgREST, OAuth nem a configuração de um projeto Supabase remoto.
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
const name = `caffeine-rls-${process.pid}`;
// O servidor temporário do entrypoint só abre socket Unix e depois reinicia.
// TCP no loopback do container só fica disponível no servidor definitivo.
const connection = ["-h", "127.0.0.1", "-U", "postgres", "-d", "postgres"];
function docker(args, input) {
  const result = spawnSync(
    "docker",
    ["--host=unix:///var/run/docker.sock", ...args],
    { encoding: "utf8", input },
  );
  if (result.status !== 0)
    throw new Error(
      result.stderr || result.error?.message || "Docker indisponível",
    );
  return result.stdout + result.stderr;
}
try {
  docker([
    "run",
    "-d",
    "--rm",
    "--name",
    name,
    "--network",
    "none",
    "-e",
    "POSTGRES_HOST_AUTH_METHOD=trust",
    "postgres:17-alpine",
  ]);
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      docker(["exec", name, "pg_isready", ...connection, "-t", "1"]);
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (!ready) throw new Error("PostgreSQL não iniciou em 30 segundos");
  function sql(input) {
    return docker(
      ["exec", "-i", name, "psql", ...connection, "-X", "-v", "ON_ERROR_STOP=1"],
      input,
    );
  }
  sql(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    sql(readFileSync(`supabase/migrations/${file}`, "utf8"));
  for (const file of readdirSync("supabase/tests")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    sql(readFileSync(`supabase/tests/${file}`, "utf8"));
  console.log(
    "RLS: perfis, grupos, integridade, atomicidade, permissões e auditoria aprovados em PostgreSQL 17.",
  );
} catch (error) {
  // Container descartável com fixtures: preservar diagnóstico antes da remoção.
  try {
    console.error(docker(["logs", name]));
  } catch {
    /* preservar erro original */
  }
  throw error;
} finally {
  try {
    docker(["rm", "-f", name]);
  } catch {
    /* preservar erro original */
  }
}
