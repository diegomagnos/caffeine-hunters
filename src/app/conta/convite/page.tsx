"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@/modules/auth/forms";
import { getAuthClient } from "@/modules/auth/client";
import { useAuth } from "@/modules/auth/provider";
import { groupDetailsHref } from "@/modules/groups/client";
import { clearInvitation, readInvitationLink } from "@/modules/groups/invitation-context";

export default function InvitationPage() {
  const { user, loading } = useAuth();
  const [token, setToken] = useState<string | null>();
  useEffect(() => {
    const read = () => setToken(readInvitationLink());
    const timer = setTimeout(read, 0);
    window.addEventListener("hashchange", read);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", read);
    };
  }, []);

  return (
    <div className="stack">
      <section className="card auth-card">
        <h1>Convite para grupo privado</h1>
        {loading || token === undefined ? (
          <p role="status">Preparando convite…</p>
        ) : !token ? (
          <p>Abra o link original recebido por e-mail ou peça um novo convite ao administrador.</p>
        ) : user ? (
          <InvitationAcceptance key={`${user.id}:${token}`} email={user.email}
            confirmed={Boolean(user.email && user.email_confirmed_at)} token={token} />
        ) : (
          <p>Entre ou crie uma conta com o mesmo endereço que recebeu o convite.</p>
        )}
      </section>
      {token && !user && !loading && <AuthForm invitation />}
    </div>
  );
}

function InvitationAcceptance({ token, email, confirmed }: {
  token: string;
  email?: string;
  confirmed: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function accept() {
    if (busy || !confirmed) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: groupId, error } = await getAuthClient()!.rpc("accept_group_invitation", {
        invitation_token: token,
      });
      if (!active.current) return;
      if (error) throw error;
      if (!groupId) {
        setMessage("O convite está indisponível ou foi enviado para outro endereço. Confira sua conta ou peça um novo link.");
        return;
      }
      clearInvitation(token);
      router.replace(groupDetailsHref(groupId));
    } catch {
      if (active.current) setMessage("Não foi possível confirmar o aceite. Verifique sua lista de grupos antes de tentar novamente.");
    } finally {
      if (active.current) setBusy(false);
    }
  }

  return (
    <>
      <p>E-mail da conta <strong>{email ?? "sem e-mail"}</strong></p>
      <p>{confirmed ? "Confira se este endereço recebeu o convite." : "Confirme seu e-mail antes de aceitar."} Para trocar de conta, use Sair no cabeçalho.</p>
      <button type="button" onClick={accept} disabled={busy || !confirmed}>
        {busy ? "Aceitando…" : "Aceitar convite"}
      </button>
      {message && <p role="status">{message} <Link href="/conta/grupos/">Meus grupos</Link></p>}
    </>
  );
}
