"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  { href: "/", label: "Início" },
  { href: "/grupos/", label: "Meus grupos" },
  { href: "/perfil/", label: "Perfil" },
];
export function Navigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal">
      {links.map(({ href, label }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname.startsWith(href.replace(/\/$/, "")) ||
              (href === "/grupos/" &&
                /^\/(ciclos|avaliacoes)\//.test(pathname));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
