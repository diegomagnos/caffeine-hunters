import Link from "next/link";
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
          Nenhum grupo real é criado nesta demonstração. Para criar e consultar
          seus grupos privados, acesse a área de conta. Convites, entrada e
          saída ainda não estão disponíveis.
        </p>
        <Link href="/conta/grupos/">Acessar meus grupos reais</Link>
      </aside>
    </>
  );
}
