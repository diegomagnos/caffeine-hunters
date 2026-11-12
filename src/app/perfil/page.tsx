import { EmptyState, PageIntro } from "@/components/demo-ui";
import { profile } from "@/demo/data";
export const metadata = { title: "Perfil | Caffeine Hunters" };
export default function ProfilePage() {
  return (
    <>
      <PageIntro eyebrow="Seu lugar à mesa" title="Perfil">
        Conheça o perfil fictício usado para explorar o Caffeine Hunters.
      </PageIntro>
      <section className="card profile">
        <span className="monogram" aria-hidden="true">
          {profile.initials}
        </span>
        <div>
          <h2>{profile.name}</h2>
          <p>{profile.role}</p>
          <p>Sem conta, sessão ou autenticação real.</p>
        </div>
      </section>
      <EmptyState title="Seu histórico ainda está em preparo">
        Não há avaliações registradas. Seleções feitas na demonstração não
        compõem um histórico.
      </EmptyState>
      <aside className="notice">
        <h2>Em uma próxima etapa</h2>
        <p>
          Este perfil é fictício. Para entrar, sair e editar seu perfil real,
          acesse a área de Conta. Exportação e exclusão de conta ainda não
          estão disponíveis nesta interface.
        </p>
      </aside>
    </>
  );
}
