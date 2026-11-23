function configuredOrigin(value: string | undefined, allowHttp: boolean) {
  try {
    const url = new URL(value ?? "");
    if (url.protocol !== "https:" && !(url.protocol === "http:" && (allowHttp || url.hostname === "localhost")))
      return "";
    if (url.username || url.password || url.href !== url.origin + "/") return "";
    return url.origin;
  } catch {
    return "";
  }
}

function runtimeKey(value: string | undefined, prefix: string) {
  if (!value) return undefined;
  try {
    const keys = JSON.parse(value);
    if (!keys || typeof keys !== "object" || Array.isArray(keys)) return undefined;
    const entries = Object.values(keys);
    const key = keys.default ?? (entries.length === 1 ? entries[0] : undefined);
    if (typeof key === "string" && key.startsWith(prefix)) return key;
  } catch {
    // Uma configuração inválida fica indisponível quando não há chave legada.
  }
}

export function readSettings(env: (name: string) => string | undefined) {
  return {
    origin: configuredOrigin(env("INVITATION_APP_ORIGIN"), false),
    supabaseUrl: configuredOrigin(env("SUPABASE_URL"), true),
    serviceKey: runtimeKey(env("SUPABASE_SECRET_KEYS"), "sb_secret_") ??
      env("SUPABASE_SERVICE_ROLE_KEY")?.trim(),
    authKey: runtimeKey(env("SUPABASE_PUBLISHABLE_KEYS"), "sb_publishable_") ??
      env("SUPABASE_ANON_KEY")?.trim(),
    resendKey: env("RESEND_API_KEY")?.trim(),
    sender: env("INVITATION_FROM_EMAIL")?.trim(),
  };
}

export type Settings = ReturnType<typeof readSettings>;
