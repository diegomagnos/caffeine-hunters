import assert from "node:assert/strict";
import { test } from "node:test";
import { readSettings } from "./configuration.mts";
import { handleRequest } from "./handler.mts";

const app = "https://app.example.test";
const project = "https://db.example.test";
const actor = "11111111-1111-4111-8111-111111111111";
const groupId = "22222222-2222-4222-8222-222222222222";
const attempt = "33333333-3333-4333-8333-333333333333";
const settings = {
  origin: app, supabaseUrl: project, serviceKey: "synthetic-admin-credential",
  authKey: "synthetic-public-credential",
  resendKey: "synthetic-provider-key", sender: "Convites <convites@example.test>",
};
const user = { id: actor, role: "authenticated" };
const authorization = "Bearer synthetic-user-jwt";
const recipient = { groupId, email: "new@example.test" };

function request(payload = recipient, overrides = {}) {
  const headers = new Headers({ Origin: app, Authorization: authorization, "Content-Type": "application/json" });
  for (const [name, value] of Object.entries(overrides)) {
    if (value === null) headers.delete(name);
    else headers.set(name, value);
  }
  return new Request(project + "/functions/v1/send-group-invitation", {
    method: "POST", body: JSON.stringify(payload), headers,
  });
}

async function denyWithoutUpstream(request, config, expected) {
  let calls = 0;
  const result = await handleRequest(request, config, async () => {
    calls++;
    throw new Error("Unexpected upstream request");
  });
  assert.equal(result.status, expected);
  assert.deepEqual(await result.json(), {});
  assert.equal(calls, 0);
}

for (const serviceKey of ["synthetic-admin-credential", "sb_secret_synthetic"]) {
  test(`isolates credentials and authenticates the actor with ${serviceKey.startsWith("sb_") ? "modern" : "legacy"} keys`, async () => {
    const calls = [];
    const result = await handleRequest(request(recipient, { apikey: "synthetic-untrusted-key" }), { ...settings, serviceKey }, async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/user")) return Response.json(user);
      if (url.endsWith("/issue_group_invitation"))
        return Response.json([{ email: recipient.email, group_name: "<Clube>", attempt_id: attempt }]);
      if (url.endsWith("/emails")) return Response.json({ id: "provider-message-id" });
      return new Response(null, { status: 204 });
    });
    assert.deepEqual(await result.json(), { delivery: "sent" });
    assert.deepEqual(calls.map(({ url }) => url), [
      project + "/auth/v1/user", project + "/rest/v1/rpc/issue_group_invitation", "https://api.resend.com/emails",
      project + "/rest/v1/rpc/record_group_invitation_delivery",
    ]);
    const [auth, issue, provider, record] = calls.map(({ options }) => options);
    assert.ok(calls.every(({ options }) => options.redirect === "error"));
    assert.deepEqual(auth.headers, { apikey: settings.authKey, Authorization: authorization });
    for (const rpc of [issue, record]) {
      assert.equal(rpc.headers.apikey, serviceKey);
      assert.equal(rpc.headers.Authorization, serviceKey.startsWith("sb_") ? undefined : `Bearer ${serviceKey}`);
    }
    const email = JSON.parse(provider.body);
    assert.deepEqual(email.to, [recipient.email]);
    assert.match(email.html, /&lt;Clube&gt;/);
    const link = email.html.match(/https:\/\/app.example.test\/conta\/convite\/#token=([a-f0-9]{64})/);
    assert.ok(link);
    const bytes = Buffer.from(link[1], "hex");
    const digest = Buffer.from(await crypto.subtle.digest("SHA-256", bytes)).toString("hex");
    assert.deepEqual(JSON.parse(issue.body), {
      actor_id: actor, target_group_id: groupId, invited_email: recipient.email,
      invitation_id: null, token_digest: digest,
    });
    assert.equal(provider.headers["Idempotency-Key"], attempt);
    assert.deepEqual(JSON.parse(record.body), { target_attempt_id: attempt, provider_accepted: true });
  });
}

test("blocks requests without an approved origin and allows preflight without a JWT", async () => {
  for (const origin of [null, "null", "https://untrusted.example.test", ""])
    await denyWithoutUpstream(request(recipient, { Origin: origin }), settings, 403);
  for (const origin of [app, "https://untrusted.example.test"]) {
    const preflight = await handleRequest(new Request(project, { method: "OPTIONS", headers: { Origin: origin } }), settings,
      () => assert.fail("Preflight must not call an upstream"));
    assert.equal(preflight.status, origin === app ? 204 : 403);
    assert.equal(preflight.headers.get("access-control-allow-origin"), app);
  }
});

test("blocks missing or malformed Authorization and rejects injected RPC arguments", async () => {
  for (const header of [null, "Bearer", "Basic not-a-user", "Bearer two tokens"])
    await denyWithoutUpstream(request(recipient, { Authorization: header }), settings, 401);
  for (const field of ["actor_id", "actorId", "token_digest", "invitationId"])
    await denyWithoutUpstream(request({ ...recipient, [field]: attempt }), settings, 400);
});

test("rejects oversized payloads without relying on Content-Length", async () => {
  await denyWithoutUpstream(request(recipient, { "Content-Length": "2049" }), settings, 400);
  await denyWithoutUpstream(request({ ...recipient, email: "a".repeat(2048) }, { "Content-Length": "30" }), settings, 400);
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(" ".repeat(1025)));
      controller.enqueue(encoder.encode(" ".repeat(1024)));
      controller.close();
    },
  });
  await denyWithoutUpstream(new Request(project, {
    method: "POST", body, duplex: "half",
    headers: { Origin: app, Authorization: authorization, "Content-Type": "application/json" },
  }), settings, 400);
});

test("fails without side effects when a required setting is missing or keys are mixed", async () => {
  for (const name of Object.keys(settings))
    await denyWithoutUpstream(request({ groupId, invitationId: attempt }), { ...settings, [name]: "" }, 503);
  await denyWithoutUpstream(request(), { ...settings, authKey: settings.serviceKey }, 503);
});

test("loads modern and legacy runtime keys and handles invalid configuration without throwing", () => {
  const env = (values) => readSettings((name) => values[name]);
  assert.deepEqual(env({
    INVITATION_APP_ORIGIN: app, SUPABASE_URL: project,
    SUPABASE_SECRET_KEYS: '{"default":"sb_secret_synthetic"}',
    SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_synthetic"}',
    RESEND_API_KEY: settings.resendKey, INVITATION_FROM_EMAIL: settings.sender,
  }), { ...settings, serviceKey: "sb_secret_synthetic", authKey: "sb_publishable_synthetic" });
  const legacy = env({
    INVITATION_APP_ORIGIN: "http://localhost:3000/", SUPABASE_URL: "http://kong:8000",
    SUPABASE_SECRET_KEYS: "broken JSON", SUPABASE_SERVICE_ROLE_KEY: "legacy-service",
    SUPABASE_PUBLISHABLE_KEYS: "null", SUPABASE_ANON_KEY: "legacy-anon",
  });
  assert.equal(legacy.origin, "http://localhost:3000");
  assert.equal(legacy.supabaseUrl, "http://kong:8000");
  assert.equal(legacy.serviceKey, "legacy-service");
  assert.equal(legacy.authKey, "legacy-anon");
  for (const invalid of ["broken", app + "/path", app + "?query=1", "http://app.example.test", "https://user:pass@app.example.test"])
    assert.equal(env({ INVITATION_APP_ORIGIN: invalid }).origin, "");
});

test("rejects invalid sessions, anonymous users and service roles even with an approved Origin", async () => {
  for (const verified of [
    new Response(null, { status: 401 }),
    Response.json({ ...user, is_anonymous: true }),
    Response.json({ ...user, role: "service_role" }),
    Response.json({ ...user, id: "invalid" }),
  ]) {
    const calls = [];
    const result = await handleRequest(request(), settings, async (url) => { calls.push(url); return verified; });
    assert.equal(result.status, 401);
    assert.deepEqual(calls, [project + "/auth/v1/user"]);
  }
});

test("forwards the actual member ID and stops on database permission or rate errors", async () => {
  for (const [code, status] of [["42501", 403], ["PT429", 429]]) {
    const member = "44444444-4444-4444-8444-444444444444";
    const calls = [];
    const result = await handleRequest(request(), settings, async (url, options) => {
      calls.push(url);
      if (url.endsWith("/user")) return Response.json({ ...user, id: member });
      assert.equal(JSON.parse(options.body).actor_id, member);
      return Response.json({ code }, { status });
    });
    assert.equal(result.status, status);
    assert.deepEqual(calls, [project + "/auth/v1/user", project + "/rest/v1/rpc/issue_group_invitation"]);
  }
});

for (const mode of ["provider error", "unconfirmed response", "record error"]) {
  test(`retains an unconfirmed invitation on ${mode}`, async () => {
    const calls = [];
    const result = await handleRequest(request({ groupId, invitationId: attempt }), settings,
      async (url, options) => {
        calls.push({ url, body: options.body && JSON.parse(options.body) });
        if (url.endsWith("/user")) return Response.json(user);
        if (url.endsWith("/issue_group_invitation"))
          return Response.json([{ email: recipient.email, group_name: "Clube", attempt_id: attempt }]);
        if (url.endsWith("/emails"))
          return mode === "record error" ? Response.json({ id: "provider-message-id" }) :
            mode === "provider error" ? new Response(null, { status: 503 }) : Response.json({});
        return new Response(null, { status: mode === "record error" ? 503 : 204 });
      });
    assert.deepEqual(await result.json(), { delivery: "unconfirmed" });
    assert.equal(calls.length, 4);
    assert.equal(calls[1].body.invitation_id, attempt);
    assert.deepEqual(calls[3], {
      url: project + "/rest/v1/rpc/record_group_invitation_delivery",
      body: { target_attempt_id: attempt, provider_accepted: mode === "record error" },
    });
  });
}
