"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { callbackUrl, getAuthClient, providers } from "./client";
import { useAuth } from "./provider";
export function AuthForm({ reset = false }: { reset?: boolean }) {
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const router = useRouter();
  const configured = !!getAuthClient();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getAuthClient();
    if (!client || busy) return;
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email")).trim().toLowerCase();
    const password = String(values.get("password") || "");
    setBusy(true);
    setMessage("");
    try {
      if (reset) {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: callbackUrl(),
        });
        if (error) throw error;
        setMessage(
          "Se o endereço puder receber a mensagem, enviaremos um link de recuperação. Confira também o spam.",
        );
      } else if (signup) {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: callbackUrl() },
        });
        if (error) throw error;
        setMessage(
          "Confira seu e-mail para confirmar o cadastro. Se já possui conta, entre ou recupere a senha.",
        );
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.replace("/conta/perfil/");
      }
    } catch {
      setMessage(
        "Não foi possível concluir. Verifique os dados, a confirmação do e-mail e tente novamente. Aguarde se houver limite de tentativas.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    const client = getAuthClient();
    if (!client || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl(), scopes: "openid email profile" },
      });
      if (error) throw error;
    } catch {
      setMessage("Não foi possível abrir o Google. Tente novamente.");
      setBusy(false);
    }
  }
  return (
    <section className="card auth-card">
      <h1>{reset ? "Recuperar senha" : signup ? "Criar conta" : "Entrar"}</h1>
      {!configured && (
        <p role="status">
          Autenticação ainda não configurada. Nenhuma credencial será enviada.
        </p>
      )}
      {user && (
        <p>
          Você já tem uma sessão.{" "}
          <Link href="/conta/perfil/">Abrir perfil real</Link>
        </p>
      )}
      <form onSubmit={submit} className="stack" aria-busy={busy}>
        <label>
          E-mail
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            disabled={!configured || busy}
          />
        </label>
        {!reset && (
          <label>
            Senha
            <input
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              required
              minLength={signup ? 12 : undefined}
              maxLength={128}
              disabled={!configured || busy}
            />
          </label>
        )}
        {signup && (
          <p>
            Use pelo menos 12 caracteres. O e-mail precisa ser confirmado antes
            de entrar.
          </p>
        )}
        <button disabled={!configured || busy}>
          {busy
            ? "Aguarde…"
            : reset
              ? "Enviar recuperação"
              : signup
                ? "Cadastrar"
                : "Entrar com e-mail"}
        </button>
      </form>
      <p role="status" aria-live="polite">
        {message}
      </p>
      {!reset && (
        <div className="stack">
          <button
            onClick={google}
            disabled={!configured || busy || !providers.google}
          >
            Continuar com Google
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setSignup(!signup);
              setMessage("");
            }}
          >
            {signup ? "Já tenho conta" : "Criar conta com e-mail"}
          </button>
          <Link href="/conta/recuperar/">Esqueci minha senha</Link>
          <p>
            Use o mesmo e-mail verificado para evitar contas separadas. Se já
            usa Google, continue por esse método.
          </p>
        </div>
      )}
      {reset && <Link href="/conta/entrar/">Voltar para entrar</Link>}
    </section>
  );
}
