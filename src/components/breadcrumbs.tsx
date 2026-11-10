import Link from "next/link";

type BreadcrumbLink = { label: string; href: string };

export function Breadcrumbs({
  ancestors,
  current,
}: {
  ancestors: readonly BreadcrumbLink[];
  current: string;
}) {
  return (
    <nav className="breadcrumbs" aria-label="Caminho de navegação">
      <ol role="list">
        {ancestors.map(({ label, href }) => (
          <li key={href}>
            <Link href={href}>{label}</Link>
            <span aria-hidden="true">›</span>
          </li>
        ))}
        <li>
          <span aria-current="page">{current}</span>
        </li>
      </ol>
    </nav>
  );
}
