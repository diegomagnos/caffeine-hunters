"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { cancelInvitation, listInvitations, sendInvitation, type GroupInvitation } from "./client";

const statusLabels = {
  pending: "Pendente",
  accepted: "Aceito",
  cancelled: "Cancelado",
  expired: "Expirado",
};

const deliveryLabels = {
  pending: "Aguardando confirmação de envio",
  sent: "Envio aceito pelo provedor",
  unconfirmed: "Envio não confirmado",
};

const formatDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function GroupInvitations({ groupId }: { groupId: string }) {
  const [list, setList] = useState<GroupInvitation[] | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [listError, setListError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const working = useRef(false);

  useEffect(() => {
    let active = true;
    listInvitations(groupId).then(
      (data) => { if (active) setList(data); },
      () => { if (active) setListError(true); },
    );
    return () => { active = false; };
  }, [groupId, attempt]);

  function refresh() {
    setListError(false);
    setList(null);
    setAttempt((value) => value + 1);
  }

  async function run(operation: () => Promise<string>) {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setMessage("");
    try {
      setMessage(await operation());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operação indisponível. Tente novamente.");
    } finally {
      refresh();
      setBusy(false);
      working.current = false;
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      const sent = await sendInvitation(groupId, { email: email.trim() });
      setEmail("");
      return sent ? "Convite criado. O provedor aceitou o envio." : "Convite criado. O envio não foi confirmado.";
    });
  }

  return (
    <section className="card auth-card" aria-labelledby="group-invitations">
      <h2 id="group-invitations">Convites</h2>
      <form onSubmit={create} className="stack" aria-busy={busy}>
        <label>
          E-mail do convidado
          <input type="email" autoComplete="off" value={email}
            onChange={(event) => setEmail(event.target.value)} required maxLength={254} disabled={busy} />
        </label>
        <button disabled={busy}>Enviar convite</button>
      </form>
      {message && <p role="status">{message}</p>}
      <button type="button" className="button secondary" onClick={refresh}
        disabled={busy || (!list && !listError)}>Atualizar convites</button>
      {listError ? <p role="alert">Não foi possível carregar os convites.</p> :
        !list ? <p aria-live="polite">Carregando convites…</p> :
        list.length === 0 ? <p>Nenhum convite registrado.</p> : (
          <ul className="stack">
            {list.map((invitation) => (
              <li key={invitation.id}>
                <strong>{invitation.email}</strong>
                <p>{statusLabels[invitation.status]} · {deliveryLabels[invitation.delivery_status]}</p>
                <p>Validade até <time dateTime={invitation.expires_at}>{formatDate.format(new Date(invitation.expires_at))}</time></p>
                {invitation.can_manage && (
                  <div className="invitation-actions" role="group" aria-label={`Convite para ${invitation.email}`}>
                    <button type="button" className="button secondary" disabled={busy} onClick={() => void run(async () =>
                      await sendInvitation(groupId, { invitationId: invitation.id })
                        ? "Novo link gerado. O provedor aceitou o envio."
                        : "Novo link gerado. O envio não foi confirmado.",
                    )}>Reenviar</button>
                    <button type="button" className="button secondary" disabled={busy} onClick={() => void run(async () => {
                      await cancelInvitation(groupId, invitation.id);
                      return "Convite cancelado.";
                    })}>Cancelar</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
    </section>
  );
}
