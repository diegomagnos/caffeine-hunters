"use client";
import { useEffect, useState, type FormEvent } from "react";
import { getAuthClient } from "@/modules/auth/client";
import { RequireAuth, useAuth } from "@/modules/auth/provider";
function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    getAuthClient()!
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error)
          setMessage(
            "Não foi possível carregar o perfil. Recarregue e confira sua sessão.",
          );
        else {
          setName(data.display_name);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [user]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || busy || !loaded) return;
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
      {!loaded && !message && <p role="status">Carregando perfil…</p>}
      <form onSubmit={save} className="stack">
        <label>
          Nome de exibição
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            disabled={!loaded || busy}
          />
        </label>
        <button disabled={!loaded || busy}>
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
  const { user } = useAuth();
  return (
    <>
      <h1>Meu perfil real</h1>
      <RequireAuth>
        <Profile key={user?.id} />
      </RequireAuth>
    </>
  );
}
