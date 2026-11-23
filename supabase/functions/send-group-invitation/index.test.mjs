import assert from "node:assert/strict";
import { test } from "node:test";
import { handleRequest } from "./handler.mts";

const app = "https://app.example.test";
const project = "https://db.example.test";
const actor = "11111111-1111-4111-8111-111111111111";
const groupId = "22222222-2222-4222-8222-222222222222";
const attempt = "33333333-3333-4333-8333-333333333333";
const settings = {
  origin: app, supabaseUrl: project, serviceKey: "synthetic-admin-credential",
  resendKey: "synthetic-provider-key", sender: "Convites <convites@example.test>",
};

const request = (payload, authorization = "Bearer synthetic-user-jwt") =>
  new Request(project + "/functions/v1/send-group-invitation", {
    method: "POST", body: JSON.stringify(payload),
    headers: { Origin: app, Authorization: authorization },
  });

test("verifies the actor, persists the digest and records only a confirmed provider response", async () => {
  const calls = [];
  const result = await handleRequest(request({ groupId, email: "new@example.test", actorId: "forged" }),
    settings, async (url, options) => {
      calls.push(url);
      switch (url) {
        case project + "/auth/v1/user":
          assert.equal(options.headers.Authorization, "Bearer synthetic-user-jwt");
          return Response.json({ id: actor });
        case project + "/rest/v1/rpc/issue_group_invitation": {
          assert.equal(options.headers.Authorization, "Bearer synthetic-admin-credential");
          const args = JSON.parse(options.body);
          assert.equal(args.actor_id, actor);
          assert.equal(args.target_group_id, groupId);
          assert.equal(args.invited_email, "new@example.test");
          assert.equal(args.invitation_id, null);
          assert.match(args.token_digest, /^[a-f0-9]{64}$/);
          return Response.json([{ email: args.invited_email, group_name: "<Clube>", attempt_id: attempt }]);
        }
        case "https://api.resend.com/emails": {
          assert.equal(options.headers["Idempotency-Key"], attempt);
          const body = JSON.parse(options.body);
          assert.deepEqual(body.to, ["new@example.test"]);
          assert.match(body.html, /&lt;Clube&gt;/);
          assert.match(body.html, /https:\/\/app.example.test\/conta\/convite\/#token=[a-f0-9]{64}/);
          return Response.json({ id: "provider-message-id" });
        }
        case project + "/rest/v1/rpc/record_group_invitation_delivery":
          assert.deepEqual(JSON.parse(options.body), { target_attempt_id: attempt, provider_accepted: true });
          return new Response(null, { status: 204 });
        default:
          throw new Error("Unexpected request");
      }
    });
  assert.equal(calls.length, 4);
  assert.deepEqual(await result.json(), { delivery: "sent" });
});

test("blocks requests when Auth or the database denies them", async () => {
  let count = 0;
  const unauthorized = await handleRequest(request({ groupId, email: "new@example.test" }),
    settings, async () => { count++; return new Response(null, { status: 401 }); });
  assert.equal(unauthorized.status, 401);
  assert.equal(count, 1);
  const forbidden = await handleRequest(request({ groupId, email: "new@example.test" }),
    settings, async (url) => {
      count++;
      return url.endsWith("/user") ? Response.json({ id: actor }) : Response.json({ code: "42501" }, { status: 403 });
    });
  assert.equal(forbidden.status, 403);
  assert.equal(count, 3);
});

for (const mode of ["missing config", "provider error", "unconfirmed response", "record error"]) {
  test(`retains an unconfirmed invitation on ${mode}`, async () => {
    const result = await handleRequest(request({ groupId, invitationId: attempt }),
      { ...settings, resendKey: mode === "missing config" ? undefined : settings.resendKey },
      async (url, options) => {
        if (url.endsWith("/user")) return Response.json({ id: actor });
        if (url.endsWith("/issue_group_invitation")) {
          assert.equal(JSON.parse(options.body).invitation_id, attempt);
          return Response.json([{ email: "new@example.test", group_name: "Clube", attempt_id: attempt }]);
        }
        if (url.endsWith("/emails")) {
          assert.notEqual(mode, "missing config");
          return mode === "record error" ? Response.json({ id: "provider-message-id" }) :
            mode === "provider error" ? new Response(null, { status: 503 }) : Response.json({});
        }
        assert.equal(url, project + "/rest/v1/rpc/record_group_invitation_delivery");
        assert.equal(JSON.parse(options.body).provider_accepted, mode === "record error");
        return new Response(null, { status: mode === "record error" ? 503 : 204 });
      });
    assert.deepEqual(await result.json(), { delivery: "unconfirmed" });
  });
}
