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

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string;
  recovery: boolean;
  setRecovery: (value: boolean) => void;
};
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(
    () =>
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    const client = getAuthClient();
    if (!client) return;
    let active = true;
    let revision = 0;
    async function validate() {
      const current = ++revision;
      try {
        const { data, error } = await client!.auth.getUser();
        if (!active || current !== revision) return;
        setUser(error ? null : data.user);
        setError(error ? "Sessão ausente ou expirada. Entre novamente." : "");
      } catch {
        if (active && current === revision) {
          setUser(null);
          setError("Não foi possível verificar a sessão. Tente novamente.");
        }
      } finally {
        if (active && current === revision) setLoading(false);
      }
    }
    void validate();
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (!session) {
        ++revision;
        setUser(null);
        setRecovery(false);
        setLoading(false);
      } else {
        setLoading(true);
        setTimeout(() => {
          if (active) void validate();
        }, 0);
      }
    });
    return () => {
      active = false;
      ++revision;
      data.subscription.unsubscribe();
    };
  }, []);
  return (
    <Context.Provider value={{ user, loading, error, recovery, setRecovery }}>
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
