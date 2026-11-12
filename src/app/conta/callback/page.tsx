"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getAuthClient } from "@/modules/auth/client";
import { useAuth } from "@/modules/auth/provider";
export default function CallbackPage() {
  const started = useRef(false);
  const { recovery, setRecovery } = useAuth();
  const [message, setMessage] = useState("Validando link…");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    window.history.replaceState(null, "", "/conta/callback/");
    async function complete() {
      const client = getAuthClient();
      if (!client) {
        setMessage("Autenticação ainda não configurada.");
        return;
      }
      try {
        if (params.has("error") || hash.has("error")) throw new Error();
        const token = params.get("token_hash");
        const type = params.get("type");
        if (token && (type === "recovery" || type === "signup")) {
          const { error } = await client.auth.verifyOtp({
            token_hash: token,
            type,
          });
          if (error) throw error;
          if (type === "recovery") setRecovery(true);
          setMessage(
            type === "recovery"
              ? "Link verificado. Escolha sua nova senha."
              : "E-mail confirmado. Você pode acessar seu perfil.",
          );
        } else if (params.get("code")) {
          const { error } = await client.auth.exchangeCodeForSession(
            params.get("code")!,
            params.has("sb_flow_id")
              ? { flowId: params.get("sb_flow_id")! }
              : undefined,
          );
          if (error) throw error;
          setMessage("Autenticação concluída. Você pode acessar seu perfil.");
        } else throw new Error();
      } catch {
        setMessage(
          "Link inválido, expirado ou já utilizado. Solicite um novo link ou entre novamente.",
        );
      }
    }
    void complete();
  }, [setRecovery]);
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    if (values.get("password") !== values.get("confirm")) {
      setMessage("As senhas precisam ser iguais.");
      return;
    }
    const client = getAuthClient();
    if (!client || !recovery) return;
    setBusy(true);
    try {
      const { error } = await client.auth.updateUser({
        password: String(values.get("password")),
      });
      if (error) throw error;
      setRecovery(false);
      const { error: logoutError } = await client.auth.signOut();
      if (logoutError) {
        setMessage(
          "Senha atualizada, mas não foi possível encerrar a sessão. Use Sair da conta no perfil e tente novamente.",
        );
        return;
      }
      setMessage("Senha atualizada. Entre novamente com a nova senha.");
    } catch {
      setMessage(
        "Não foi possível atualizar a senha. Solicite outro link e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card auth-card">
      <h1>Confirmar acesso</h1>
      <p role="status">{message}</p>
      {recovery && (
        <form className="stack" onSubmit={update}>
          <label>
            Nova senha
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              disabled={busy}
            />
          </label>
          <label>
            Confirmar nova senha
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              disabled={busy}
            />
          </label>
          <button disabled={busy}>
            {busy ? "Atualizando…" : "Salvar nova senha"}
          </button>
        </form>
      )}
      <p>
        <Link href="/conta/perfil/">Abrir perfil real</Link> ·{" "}
        <Link href="/conta/entrar/">Entrar</Link> ·{" "}
        <Link href="/conta/recuperar/">Solicitar recuperação</Link>
      </p>
    </section>
  );
}
