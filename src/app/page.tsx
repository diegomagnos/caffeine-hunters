import Link from "next/link";
import { CoffeeMark } from "@/components/coffee-mark";
import { GroupCard, PageIntro } from "@/components/demo-ui";
import { cycleHref, cycles, groups, profile } from "@/demo/data";
export default function Home() {
  const featuredCycle = cycles[0];
  const featuredGroup = groups.find(
    (group) => group.id === featuredCycle.groupId,
  )!;
  return (
    <>
      <PageIntro
        eyebrow="Seu ponto de encontro"
        title={`Olá, ${profile.name}. Vamos descobrir um café?`}
      >
        Bons cafés. Novas descobertas. Uma experiência para compartilhar.
      </PageIntro>
      <section className="hero" aria-labelledby="cycle-title">
        <div>
          <p className="eyebrow">
            Ciclo demonstrativo · {featuredCycle.period}
          </p>
          <h2 id="cycle-title">
            Cada origem tem
            <br />
            uma boa história.
          </h2>
          <p>
            Explore o ciclo {featuredCycle.name} do grupo {featuredGroup.name} e
            conheça os cafés desta rodada.
          </p>
          <Link className="button light" href={cycleHref(featuredCycle.id)}>
            Conhecer os cafés <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="hero-mark" aria-hidden="true">
          <CoffeeMark className="w-full h-full" />
        </div>
      </section>
      <section aria-labelledby="groups-title">
        <div className="section-heading">
          <h2 id="groups-title">Seus grupos, novas descobertas</h2>
          <Link className="text-link" href="/grupos/">
            Ver grupos →
          </Link>
        </div>
        <div className="grid-two">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      </section>
      <aside className="notice">
        <h2>A primeira dose está em preparo</h2>
        <p>
          Aplicativo em desenvolvimento. Explore livremente os exemplos. Criar
          grupos, contribuir, registrar avaliações e consultar rankings ainda
          não estão disponíveis.
        </p>
      </aside>
    </>
  );
}
