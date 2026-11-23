import Link from "next/link";
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
    <>
      <div className="notice">
        <strong>Sua conta</strong>
        <p>
          Participe de grupos privados e gerencie seu perfil. Ciclos e avaliações
          reais ainda não estão disponíveis.
        </p>
        <Link href="/">Explorar demonstração pública</Link> ·{" "}
        <Link href="/conta/perfil/">Meu perfil real</Link> ·{" "}
        <Link href="/conta/grupos/">Meus grupos</Link>
      </div>
      {children}
    </>
  );
}
