import type { NextConfig } from "next";

// Falhar antes do bundle se uma credencial privilegiada for colocada no campo público.
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!!publicUrl !== !!publicKey) {
  throw new Error(
    "Configure as duas variáveis públicas Supabase ou deixe ambas vazias.",
  );
}
if (publicKey && !publicKey.startsWith("sb_publishable_")) {
  let role: unknown;
  try {
    role = JSON.parse(
      Buffer.from(publicKey.split(".")[1], "base64url").toString(),
    ).role;
  } catch {
    /* formato não público */
  }
  if (role !== "anon")
    throw new Error(
      "A chave pública Supabase deve ser publishable ou anon; credenciais privilegiadas são proibidas.",
    );
}

const nextConfig: NextConfig = {
  // Exportação opt-in: o build normal preserva o runtime Next.js futuro.
  ...(process.env.NEXT_STATIC_EXPORT === "1" ? { output: "export" } : {}),
  trailingSlash: true,
  // AGENTS.md é mantido pelo projeto, sem alterações automáticas do framework.
  agentRules: false,
};

export default nextConfig;
