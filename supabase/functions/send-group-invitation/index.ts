import { handleRequest } from "./handler.mts";

function defaultKey(variable: string) {
  const value = Deno.env.get(variable);
  if (!value) return undefined;
  const keys: Record<string, string> = JSON.parse(value);
  return keys.default ?? Object.values(keys)[0];
}

const configuredOrigin = Deno.env.get("INVITATION_APP_ORIGIN");
const url = configuredOrigin ? new URL(configuredOrigin) : null;
const origin = url && (url.protocol === "https:" ||
  (url.protocol === "http:" && url.hostname === "localhost")) ? url.origin : "";

const settings = {
  origin,
  supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
  serviceKey: defaultKey("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  authKey: defaultKey("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_ANON_KEY"),
  resendKey: Deno.env.get("RESEND_API_KEY"),
  sender: Deno.env.get("INVITATION_FROM_EMAIL"),
};

Deno.serve((request) => handleRequest(request, settings));
