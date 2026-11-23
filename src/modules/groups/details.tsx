"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { RequireAuth, useAuth } from "@/modules/auth/provider";
import {
  describeGroupRole,
  readGroupDetails,
  type GroupDetails,
} from "./client";

const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export function GroupDetailsPage() {
  const groupId = useSearchParams().get("id");
  const { user } = useAuth();
  return (
    <>
      <Link href="/conta/grupos/">Voltar para Meus grupos</Link>
      <RequireAuth>
        {user && groupId && uuidPattern.test(groupId) ? (
          <GroupDetailsView
            key={`${user.id}:${groupId}`}
            groupId={groupId}
            userId={user.id}
          />
        ) : (
          <h1>Grupo indisponível</h1>
        )}
      </RequireAuth>
    </>
  );
}

type DetailsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; details: GroupDetails | null };

function GroupDetailsView({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const [state, setState] = useState<DetailsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    readGroupDetails(groupId).then(
      (details) => {
        if (active) setState({ status: "loaded", details });
      },
      () => {
        if (active) setState({ status: "error" });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt, groupId]);

  if (state.status === "loading") return <p role="status">Carregando grupo…</p>;
  if (state.status === "error") {
    return (
      <>
        <h1>Detalhes do grupo</h1>
        <p role="alert">Não foi possível carregar o grupo. Tente novamente.</p>
        <button
          type="button"
          onClick={() => {
            setState({ status: "loading" });
            setAttempt((value) => value + 1);
          }}
        >
          Tentar novamente
        </button>
      </>
    );
  }
  if (!state.details) {
    return (
      <>
        <h1>Grupo indisponível</h1>
        <p>Este grupo não foi encontrado ou você não tem acesso.</p>
      </>
    );
  }

  const { group, members } = state.details;
  function memberName(id: string, name?: string | null) {
    if (id === userId) return name ? `${name} (você)` : "Você";
    return name || `Usuário ${id.slice(0, 8)}`;
  }

  return (
    <div className="stack">
      <section className="card group-description" aria-labelledby="group-name">
        <h1 id="group-name">{group.name}</h1>
        <p>{group.description || "Sem descrição."}</p>
        <dl>
          <dt>Dono</dt>
          <dd>
            {memberName(
              group.owner_id,
              members.find((member) => member.user_id === group.owner_id)
                ?.display_name,
            )}
          </dd>
          <dt>Fundador</dt>
          <dd>
            {memberName(
              group.founder_id,
              members.find((member) => member.user_id === group.founder_id)
                ?.display_name,
            )}
          </dd>
        </dl>
      </section>
      <section className="card" aria-labelledby="group-members">
        <h2 id="group-members">Membros</h2>
        <ul>
          {members.map((member) => (
            <li key={member.user_id} className="group-description">
              <strong>{memberName(member.user_id, member.display_name)}</strong>
              {" · "}
              {describeGroupRole(group, member.user_id, member.is_admin)}
            </li>
          ))}
        </ul>
      </section>
      <section className="card" aria-labelledby="group-features">
        <h2 id="group-features">Recursos ainda indisponíveis</h2>
        <p>
          Convites, gestão de membros e administradores, regras, ciclos, cafés e
          avaliações.
        </p>
      </section>
    </div>
  );
}
