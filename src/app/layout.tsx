import type { Metadata } from "next";
import Link from "next/link";
import { CoffeeMark } from "@/components/coffee-mark";
import { Navigation } from "@/components/navigation";
import "./globals.css";
import { EnvironmentBanner } from "@/components/environment-banner";

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
        <EnvironmentBanner />
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
          <span>Em desenvolvimento</span>
        </footer>
      </body>
    </html>
  );
}
