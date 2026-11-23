import type { Settings } from "./configuration.mts";

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

type Invitation = { id: string; email: string; group_name: string; attempt_id: string };
const maxBodyBytes = 2048;

async function readPayload(request: Request): Promise<{
  groupId: string;
  email?: string;
  invitationId?: string;
} | null> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return null;
  if (!request.body || Number(request.headers.get("content-length")) > maxBodyBytes) return null;

  const reader = request.body.getReader();
  const buffer = new Uint8Array(maxBodyBytes);
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (size + value.byteLength > maxBodyBytes) {
        void reader.cancel().catch(() => {});
        return null;
      }
      buffer.set(value, size);
      size += value.byteLength;
    }
    const body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, size)));
    if (!body || typeof body.groupId !== "string" || !uuid.test(body.groupId)) return null;

    // O contrato não aceita parâmetros da RPC, especialmente actor_id e token_digest.
    const keys = Object.keys(body);
    if (keys.length !== 2) return null;
    if (typeof body.invitationId === "string" && uuid.test(body.invitationId))
      return { groupId: body.groupId, invitationId: body.invitationId };
    if (typeof body.email === "string" && body.email.length <= 254)
      return { groupId: body.groupId, email: body.email };
    return null;
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function handleRequest(request: Request, settings: Settings, send = fetch) {
  const { origin, supabaseUrl, serviceKey, authKey, resendKey, sender } = settings;
  const headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, x-retry-count, traceparent, tracestate, baggage",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  const json = (data: object, status = 200) => Response.json(data, { status, headers });
  const requestOrigin = request.headers.get("origin");
  if (!origin) return json({}, 503);
  if (requestOrigin !== origin) return json({}, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return json({}, 405);

  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Bearer \S+$/i.test(authorization)) return json({}, 401);
  if (!supabaseUrl || !authKey || !serviceKey || authKey === serviceKey || !resendKey || !sender)
    return json({}, 503);

  const body = await readPayload(request);
  if (!body) return json({}, 400);

  const rpc = (name: string, args: object) => send(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      ...(serviceKey.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${serviceKey}` }),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(8000),
    redirect: "error",
  });

  try {
    const verified = await send(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: authKey, Authorization: authorization },
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });
    if (!verified.ok) return json({}, verified.status >= 500 ? 503 : 401);
    const actor = await verified.json();
    if (!actor || actor.role !== "authenticated" || actor.is_anonymous ||
      typeof actor.id !== "string" || !uuid.test(actor.id)) return json({}, 401);

    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = hex(bytes);
    const digest = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
    const issued = await rpc("issue_group_invitation", {
      actor_id: actor.id,
      target_group_id: body.groupId,
      invited_email: body.email ?? null,
      invitation_id: body.invitationId ?? null,
      token_digest: digest,
    });
    if (!issued.ok) {
      const { code } = await issued.json().catch(() => ({}));
      const statuses: Record<string, number> = { "22023": 400, "42501": 403, PT409: 409, PT429: 429 };
      return json({}, statuses[code] ?? 503);
    }
    const [invitation]: Invitation[] = await issued.json();
    let accepted = false;
    const link = `${origin}/conta/convite/#token=${token}`;
    const name = escapeHtml(invitation.group_name);
    const subjectGroup = invitation.group_name.replace(/[\r\n]+/g, " ");
    try {
      const response = await send("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": invitation.attempt_id,
        },
        body: JSON.stringify({
          from: sender,
          to: [invitation.email],
          subject: `Convite para ${subjectGroup} · Caffeine Hunters`,
          html: `<p>Você recebeu um convite para participar do grupo <strong>${name}</strong>.</p>
            <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 18px;background:#582d20;color:#fff;border-radius:8px">Aceitar convite</a></p>
            <p>Entre ou crie uma conta com este endereço. O convite é válido por sete dias.</p>`,
          text: `Você recebeu um convite para ${invitation.group_name}. Aceite usando este endereço de e-mail em ${link}. O convite é válido por sete dias.`,
        }),
        signal: AbortSignal.timeout(10000),
        redirect: "error",
      });
      if (response.ok) {
        const result = await response.json();
        accepted = typeof result?.id === "string" && result.id.length > 0;
      }
    } catch {
      // Timeout ou resposta ambígua: a interface só confirma após resposta do provedor.
    }
    try {
      const recorded = await rpc("record_group_invitation_delivery", {
        target_attempt_id: invitation.attempt_id,
        provider_accepted: accepted,
      });
      if (!recorded.ok) return json({ delivery: "unconfirmed" });
    } catch {
      return json({ delivery: "unconfirmed" });
    }
    return json({ delivery: accepted ? "sent" : "unconfirmed" });
  } catch {
    return json({}, 503);
  }
}
