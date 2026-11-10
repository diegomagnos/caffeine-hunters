import { GroupCard, PageIntro } from "@/components/demo-ui";
import { groups } from "@/demo/data";
export const metadata = { title: "Meus grupos | Caffeine Hunters" };
export default function GroupsPage() {
  return (
    <>
      <PageIntro eyebrow="Café é melhor em companhia" title="Meus grupos">
        Dois grupos fictícios para conhecer a experiência de um clube de
        degustação.
      </PageIntro>
      <div className="grid-two">
        {groups.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
      <aside className="notice">
        <h2>Mais encontros, em breve</h2>
        <p>
          Criação de grupos, convites, entrada e saída ainda não estão
          disponíveis. Nenhum grupo real é criado nesta demonstração.
        </p>
      </aside>
    </>
  );
}
