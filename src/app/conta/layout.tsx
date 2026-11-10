import Link from "next/link";
import { AuthProvider } from "@/modules/auth/provider";
export const metadata = {
  title: "Conta | Caffeine Hunters",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="notice">
        <strong>Sua conta</strong>
        <p>
          Área separada da demonstração. Grupos, ciclos e avaliações reais ainda
          não estão disponíveis.
        </p>
        <Link href="/">Explorar demonstração pública</Link> ·{" "}
        <Link href="/conta/perfil/">Meu perfil real</Link>
      </div>
      {children}
    </AuthProvider>
  );
}
