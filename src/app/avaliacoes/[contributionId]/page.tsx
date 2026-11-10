import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoReview } from "@/components/demo-review";
import { LockedResults, PageIntro } from "@/components/demo-ui";
import { contributions, cycles, cycleHref } from "@/demo/data";
export const dynamicParams = false;
export function generateStaticParams() {
  return contributions.map((c) => ({ contributionId: c.id }));
}
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ contributionId: string }>;
}) {
  const { contributionId } = await params;
  const coffee = contributions.find((c) => c.id === contributionId);
  if (!coffee) notFound();
  const cycle = cycles.find((c) => c.id === coffee.cycleId)!;
  return (
    <>
      <Link className="text-link" href={cycleHref(coffee.cycleId)}>
        ← Voltar ao ciclo
      </Link>
      <PageIntro eyebrow="Avaliação de café · demonstração" title={coffee.name}>
        {coffee.brand} · {coffee.origin}
      </PageIntro>
      <dl className="facts">
        <div>
          <dt>Contribuição fictícia</dt>
          <dd>
            {coffee.quantity} g · {coffee.presentation} · torra{" "}
            {coffee.roast.toLowerCase()}
          </dd>
        </div>
        <div>
          <dt>Contribuído por</dt>
          <dd>{coffee.author}</dd>
        </div>
        <div>
          <dt>Prazo ilustrativo</dt>
          <dd>{cycle.deadline}</dd>
        </div>
      </dl>
      <p className="small">
        Avaliar o próprio café é permitido. No produto, a edição terá histórico
        e será bloqueada após o encerramento automático do prazo configurado.
      </p>
      <DemoReview key={coffee.id} />
      <LockedResults />
    </>
  );
}
