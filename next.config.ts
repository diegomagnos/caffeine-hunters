import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exportação opt-in: o build normal preserva o runtime Next.js futuro.
  ...(process.env.NEXT_STATIC_EXPORT === "1" ? { output: "export" } : {}),
  trailingSlash: true,
  // AGENTS.md é mantido pelo projeto, sem alterações automáticas do framework.
  agentRules: false,
};

export default nextConfig;
