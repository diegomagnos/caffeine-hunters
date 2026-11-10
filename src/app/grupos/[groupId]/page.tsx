import { Breadcrumbs } from "@/components/breadcrumbs";
import { notFound } from "next/navigation";
import { CycleLink, EmptyState, PageIntro } from "@/components/demo-ui";
import { cycles, groups } from "@/demo/data";
export const dynamicParams = false;
export function generateStaticParams() {
  return groups.map((group) => ({ groupId: group.id }));
}
export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const group = groups.find((g) => g.id === groupId);
  if (!group) notFound();
  const cycle = cycles.find((c) => c.id === group.cycleId);
  return (
    <>
      <Breadcrumbs
        ancestors={[{ label: "Meus grupos", href: "/grupos/" }]}
        current={group.name}
      />
      <PageIntro
        eyebrow="Grupo fictício · experiência demonstrativa"
        title={group.name}
      >
        {group.description}
      </PageIntro>
      <div className="grid-two">
        <section className="card">
          <h2>O próximo café começa aqui</h2>
          {cycle ? (
            <>
              <p>
                {cycle.name} · {cycle.period}
              </p>
              <p>
                Contribuições e avaliações são apenas exemplos, sem operações
                reais.
              </p>
              <CycleLink id={cycle.id} />
            </>
          ) : (
            <EmptyState title="Nenhum ciclo por aqui">
              Este grupo de exemplo ainda não tem ciclos. Criar ciclos não está
              disponível.
            </EmptyState>
          )}
        </section>
        <section className="card">
          <h2>Quem está à mesa</h2>
          <ul className="member-list">
            {group.members.map((member) => (
              <li key={member.name}>
                {member.name} · {member.role}
              </li>
            ))}
          </ul>
          <p className="small">Todos os participantes são fictícios.</p>
        </section>
      </div>
      <aside className="notice">
        <h2>Um espaço de grupo privado no produto futuro</h2>
        <p>
          Este exemplo é público e não possui controle de acesso. Administração,
          mudanças de regras e participação nas médias globais não estão
          disponíveis. A autorização global começa desativada.
        </p>
      </aside>
    </>
  );
}
