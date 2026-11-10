import type { Metadata } from "next";
import Link from "next/link";
import { CoffeeMark } from "@/components/coffee-mark";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Caffeine Hunters",
  description:
    "Demonstração do Caffeine Hunters: um espaço para clubes de degustação de café, com dados fictícios e sem gravação.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        <div className="demo-banner">
          <strong>Ambiente demonstrativo</strong>
          <span>Dados fictícios · sem autenticação ou gravação</span>
        </div>
        <header className="site-header">
          <div className="header-inner">
            <Link
              className="brand"
              href="/"
              aria-label="Caffeine Hunters — início"
            >
              <CoffeeMark className="h-9 w-9" />
              <span>
                Caffeine
                <br />
                Hunters<span className="brand-dot">.</span>
              </span>
            </Link>
            <Navigation />
          </div>
        </header>
        <main id="conteudo" tabIndex={-1} className="page-shell">
          {children}
        </main>
        <footer className="site-footer">
          <span>Caffeine Hunters · Feito para quem aprecia cada xícara.</span>
          <span>Primeira interface · demonstração pública</span>
        </footer>
      </body>
    </html>
  );
}
