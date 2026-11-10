import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CoffeeList,
  EmptyState,
  LockedResults,
  PageIntro,
} from "@/components/demo-ui";
import { contributions, cycles, groupHref } from "@/demo/data";
export const dynamicParams = false;
export function generateStaticParams() {
  return cycles.map((c) => ({ cycleId: c.id }));
}
export default async function CyclePage({
  params,
}: {
  params: Promise<{ cycleId: string }>;
}) {
  const { cycleId } = await params;
  const cycle = cycles.find((c) => c.id === cycleId);
  if (!cycle) notFound();
  return (
    <>
      <Link className="text-link" href={groupHref(cycle.groupId)}>
        ← Voltar ao grupo
      </Link>
      <PageIntro
        eyebrow={`Ciclo demonstrativo · ${cycle.period}`}
        title={cycle.name}
      >
        Uma viagem pelos cafés brasileiros, uma xícara por vez.
      </PageIntro>
      <dl className="facts">
        <div>
          <dt>Prazo de avaliação ilustrativo</dt>
          <dd>{cycle.deadline}</dd>
        </div>
        <div>
          <dt>Regras do exemplo</dt>
          <dd>
            {cycle.ruleVersion} · {cycle.frequency} · mínimo de{" "}
            {cycle.minimumGrams} g
          </dd>
        </div>
      </dl>
      <p className="small">
        Frequência e quantidade são exemplos configuráveis por grupo. Não há
        encerramento automático nesta demonstração.
      </p>
      <section aria-labelledby="coffees">
        <div className="section-heading">
          <h2 id="coffees">Cafés para explorar</h2>
          <span>
            {contributions.filter((c) => c.cycleId === cycle.id).length}{" "}
            contribuições fictícias
          </span>
        </div>
        <CoffeeList cycleId={cycle.id} />
      </section>
      <LockedResults />
      <EmptyState title="Sem avaliações">
        Nenhuma avaliação foi registrada nesta demonstração. Ausência de
        avaliação não equivale a zero e não gera penalidade automática.
      </EmptyState>
      <p className="small">
        Cadastrar contribuições, confirmar entregas e editar regras ainda não
        estão disponíveis. No produto, alterações de regras valem para próximos
        ciclos e preservam o histórico.
      </p>
    </>
  );
}
