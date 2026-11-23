"use client";
import { useState, type FormEvent } from "react";
import { getAuthClient } from "@/modules/auth/client";
import { RequireAuth, useAuth } from "@/modules/auth/provider";
function Profile({ initialName }: { initialName: string }) {
  const { user, setDisplayName } = useAuth();
  const [name, setName] = useState(initialName);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { error, data } = await getAuthClient()!
        .from("profiles")
        .update({ display_name: name.trim() })
        .eq("id", user.id)
        .select("id")
        .single();
      if (error || !data) throw new Error();
      setDisplayName(user.id, name.trim());
      setMessage("Perfil salvo.");
    } catch {
      setMessage(
        "Não foi possível salvar. Verifique a sessão e tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      const { error } = await getAuthClient()!.auth.signOut();
      if (error) throw error;
    } catch {
      setMessage("Não foi possível sair. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card auth-card">
      <p>{user?.email}</p>
      <form onSubmit={save} className="stack">
        <label>
          Nome de exibição
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            disabled={busy}
          />
        </label>
        <button disabled={busy}>
          {busy ? "Aguarde…" : "Salvar perfil"}
        </button>
      </form>
      <p role="status">{message}</p>
      <button className="button secondary" disabled={busy} onClick={logout}>
        Sair da conta
      </button>
    </section>
  );
}
export default function ProfilePage() {
  const { user, profile } = useAuth();
  return (
    <>
      <h1>Meu perfil real</h1>
      <RequireAuth>
        {!profile ? (
          <p role="status">Carregando perfil…</p>
        ) : "error" in profile ? (
          <p role="alert">Não foi possível carregar o perfil. Recarregue e confira sua sessão.</p>
        ) : (
          <Profile key={user?.id} initialName={profile.name} />
        )}
      </RequireAuth>
    </>
  );
}
