"use client";

import Link from "next/link";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getAuthClient } from "./client";
import { useAuth } from "./provider";

function googleAvatar(user: User) {
  const identity = user.identities?.find(({ provider }) => provider === "google");
  const photo = identity?.identity_data?.avatar_url ?? identity?.identity_data?.picture ??
    (user.app_metadata?.provider === "google" ? user.user_metadata?.avatar_url : null);
  if (typeof photo !== "string") return null;
  try {
    const url = new URL(photo);
    if (url.protocol === "https:" && !url.port && !url.username && !url.password &&
      /^(?:lh[0-9]+\.)?googleusercontent\.com$/.test(url.hostname)) return url.href;
  } catch {
    // Metadados de foto são opcionais.
  }
  return null;
}

export function HeaderAccount() {
  const { user, profile } = useAuth();
  if (!user) return null;
  const name = profile && "name" in profile && profile.name.trim() || user.email || "Minha conta";
  return <Account key={user.id} name={name} photo={googleAvatar(user)} />;
}

function Account({ name, photo }: { name: string; photo: string | null }) {
  const [brokenPhoto, setBrokenPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const { error } = await getAuthClient()!.auth.signOut();
      if (error) throw error;
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="header-account">
      <Link href="/conta/perfil/" className="header-profile" aria-label={`Perfil de ${name}`}>
        <span className="account-avatar" aria-hidden="true">
          {Array.from(name)[0]?.toLocaleUpperCase("pt-BR")}
          {photo && brokenPhoto !== photo && (
            // eslint-disable-next-line @next/next/no-img-element -- foto externa, compatível com o export estático.
            <img src={photo} alt="" width={36} height={36}
              referrerPolicy="no-referrer" onError={() => setBrokenPhoto(photo)} />
          )}
        </span>
        <span className="header-account-name">{name}</span>
      </Link>
      <button className="button secondary" onClick={signOut} disabled={busy}>
        {busy ? "Saindo…" : "Sair"}
      </button>
      {error && <p role="alert">Não foi possível sair. Tente novamente.</p>}
    </div>
  );
}
