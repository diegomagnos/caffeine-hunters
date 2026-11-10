import Link from "next/link";
import type { ReactNode } from "react";
import {
  contributions,
  cycleHref,
  groupHref,
  reviewHref,
  type DemoGroup,
} from "@/demo/data";
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="page-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
  );
}
export function GroupCard({ group }: { group: DemoGroup }) {
  return (
    <article className="card group-card">
      <span className="monogram" aria-hidden="true">
        {group.initials}
      </span>
      <p className="eyebrow">
        Grupo fictício · {group.members.length}{" "}
        {group.members.length === 1 ? "participante" : "participantes"}
      </p>
      <h2>{group.name}</h2>
      <p>{group.description}</p>
      <Link className="text-link" href={groupHref(group.id)}>
        Explorar grupo <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span aria-hidden="true">○</span>
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}
export function LockedResults() {
  return (
    <aside className="notice">
      <h2>Uma descoberta de cada vez</h2>
      <p>
        As avaliações dos colegas e a média deste café só ficam visíveis após
        registrar sua própria avaliação, inclusive para administradores. O
        encerramento do ciclo não libera esse acesso.
      </p>
      <p>
        Nesta demonstração, não há registro de avaliações. Os resultados
        permanecem indisponíveis.
      </p>
    </aside>
  );
}
export function CoffeeList({ cycleId }: { cycleId: string }) {
  const items = contributions.filter((c) => c.cycleId === cycleId);
  return (
    <div className="stack">
      {items.map((coffee, index) => (
        <article className="card coffee-row" key={coffee.id}>
          <span className="coffee-number" aria-hidden="true">
            0{index + 1}
          </span>
          <div>
            <p className="eyebrow">{coffee.brand}</p>
            <h3>{coffee.name}</h3>
            <p>
              {coffee.origin} · {coffee.quantity} g · {coffee.presentation}
            </p>
            <p className="small">Contribuição de {coffee.author}</p>
          </div>
          <Link className="button secondary" href={reviewHref(coffee.id)}>
            Explorar avaliação<span className="sr-only"> de {coffee.name}</span>
          </Link>
        </article>
      ))}
    </div>
  );
}
export function CycleLink({ id }: { id: string }) {
  return (
    <Link className="button" href={cycleHref(id)}>
      Explorar ciclo <span aria-hidden="true">→</span>
    </Link>
  );
}
