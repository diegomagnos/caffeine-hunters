"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getAuthClient } from "./client";

type ProfileState = { id: string; name: string } | { id: string; error: true };
type AuthState = {
  user: User | null;
  loading: boolean;
  error: string;
  recovery: boolean;
  setRecovery: (value: boolean) => void;
  profile: ProfileState | null;
  setDisplayName: (id: string, name: string) => void;
};
const Context = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(
    () => !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const userId = user?.id;
  useEffect(() => {
    const client = getAuthClient();
    if (!client) return;
    let revision = 0;
    let expectedId: string | undefined;
    let timer: ReturnType<typeof setTimeout>;
    async function validate(id: string, current: number) {
      try {
        const { data, error } = await client!.auth.getUser();
        if (current !== revision) return;
        const verified = !error && data.user?.id === id ? data.user : null;
        setUser(verified);
        setError(verified ? "" : "Sessão ausente ou expirada. Entre novamente.");
      } catch {
        if (current === revision) {
          setUser(null);
          setError("Não foi possível verificar a sessão. Tente novamente.");
        }
      } finally {
        if (current === revision) setLoading(false);
      }
    }
    const { data } = client.auth.onAuthStateChange((event, session) => {
      const current = ++revision;
      clearTimeout(timer);
      const id = session?.user.id;
      if (id !== expectedId) {
        expectedId = id;
        setUser(null);
        setProfile(null);
        setRecovery(false);
        setError("");
        setLoading(Boolean(id));
      }
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (id) timer = setTimeout(() => void validate(id, current), 0);
      else setLoading(false);
    });
    return () => {
      ++revision;
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getAuthClient()!.from("profiles").select("display_name").eq("id", userId).single()
      .then(({ data, error }) => {
        if (!active) return;
        setProfile(error ? { id: userId, error: true } : { id: userId, name: data.display_name });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <Context.Provider value={{
      user, loading, error, recovery, setRecovery,
      profile: user && profile?.id === user.id ? profile : null,
      setDisplayName: (id, name) => setProfile((current) => current?.id === id ? { id, name } : current),
    }}>
      {children}
    </Context.Provider>
  );
}

export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider ausente");
  return value;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, error } = useAuth();
  if (loading) return <p role="status">Verificando sessão…</p>;
  if (!getAuthClient())
    return (
      <p role="status">
        Autenticação ainda não configurada. A demonstração pública continua
        disponível.
      </p>
    );
  if (!user)
    return (
      <p role="status">
        {error || "Entre para acessar sua conta."}{" "}
        <a href="/conta/entrar/">Entrar</a>
      </p>
    );
  return children;
}
