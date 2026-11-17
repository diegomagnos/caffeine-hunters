"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/modules/auth/provider";
import { createGroup, listMyGroups, type Group } from "./client";

export function MyGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
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
    listMyGroups()
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
  }, [attempt]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    if (
      !trimmedName ||
      [...trimmedName].length > 80 ||
      !trimmedDescription ||
      [...trimmedDescription].length > 2000
    ) {
      setMessage(
        "Informe um nome de até 80 caracteres e uma descrição de até 2000 caracteres, sem usar somente espaços.",
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    setMessage("");
    try {
      await createGroup(trimmedName, trimmedDescription);
      setName("");
      setDescription("");
      setMessage("Grupo criado com sucesso. Você é Fundador e Dono.");
      reload();
    } catch {
      setMessage(
        "Não foi possível confirmar a criação. Atualize a lista antes de tentar novamente para evitar duplicatas.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  function reload() {
    setLoading(true);
    setListError("");
    setAttempt((value) => value + 1);
  }
  return (
    <div className="stack">
      <section className="card auth-card" aria-labelledby="create-group-title">
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
            Descrição
            <textarea
              required
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
      <section aria-labelledby="my-groups-title" aria-busy={loading}>
        <h2 id="my-groups-title">Grupos dos quais participo</h2>
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
                <h3>{group.name}</h3>
                <p className="group-description">{group.description}</p>
                <p>
                  Privado
                  {group.founder_id === user?.id && " · Fundador (Founder)"}
                  {group.owner_id === user?.id &&
                    " · Dono (Owner) · Administrador"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
