"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createGroup,
  describeGroupRole,
  groupDetailsHref,
  listMyGroups,
  type MyGroup,
} from "./client";

export function MyGroups({ userId }: { userId: string }) {
  const router = useRouter();
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submitting = useRef(false);
  useEffect(() => {
    let active = true;
    listMyGroups(userId)
      .then((data) => {
        if (active) setGroups(data);
      })
      .catch(() => {
        if (active)
          setListError(
            "Não foi possível carregar seus grupos. Verifique a sessão e tente novamente.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, userId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    if (
      !trimmedName ||
      [...trimmedName].length > 80 ||
      [...trimmedDescription].length > 2000
    ) {
      setMessage(
        "Informe um nome de até 80 caracteres, sem usar somente espaços. A descrição pode ter até 2000 caracteres.",
      );
      return;
    }
    const form = event.currentTarget;
    submitting.current = true;
    setBusy(true);
    setMessage("");
    try {
      const groupId = await createGroup(trimmedName, trimmedDescription);
      if (form.isConnected) router.push(groupDetailsHref(groupId));
    } catch {
      submitting.current = false;
      setBusy(false);
      setMessage(
        "Não foi possível confirmar a criação. Atualize a lista antes de tentar novamente para evitar duplicatas.",
      );
    }
  }
  function reload() {
    setLoading(true);
    setListError("");
    setAttempt((value) => value + 1);
  }
  return (
    <div className="stack">
      <section aria-labelledby="my-groups-title" aria-busy={loading}>
        <h2 id="my-groups-title">Grupos dos quais participo</h2>
        <a href="#criar-grupo" className="button">
          Novo grupo
        </a>{" "}
        <button
          className="button secondary"
          disabled={loading || busy}
          onClick={reload}
        >
          Atualizar lista
        </button>
        {loading ? (
          <p role="status">Carregando grupos…</p>
        ) : listError ? (
          <p role="alert">{listError}</p>
        ) : groups.length === 0 ? (
          <p>
            Você ainda não participa de nenhum grupo. Crie seu primeiro grupo.
          </p>
        ) : (
          <ul className="stack" aria-label="Seus grupos">
            {groups.map((group) => (
              <li key={group.id} className="card">
                <h3 className="group-description">{group.name}</h3>
                <p className="group-description">
                  {group.description || "Sem descrição."}
                </p>
                <p>
                  Privado ·{" "}
                  {describeGroupRole(
                    group,
                    userId,
                    group.membership[0]?.is_admin ?? false,
                  )}
                </p>
                <Link
                  href={groupDetailsHref(group.id)}
                  aria-label={`Ver detalhes de ${group.name}`}
                >
                  Ver detalhes
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section
        id="criar-grupo"
        tabIndex={-1}
        className="card auth-card"
        aria-labelledby="create-group-title"
      >
        <h2 id="create-group-title">Criar grupo privado</h2>
        <p>
          Você será o Fundador permanente e o primeiro Dono, com todas as
          permissões administrativas.
        </p>
        <form onSubmit={submit} className="stack" aria-busy={busy}>
          <label>
            Nome do grupo
            <input
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            Descrição (opcional)
            <textarea
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={busy}
            />
          </label>
          <button disabled={busy}>{busy ? "Criando…" : "Criar grupo"}</button>
        </form>
        <p role="status">{message}</p>
      </section>
    </div>
  );
}
