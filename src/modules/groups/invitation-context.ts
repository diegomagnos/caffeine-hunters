export const invitationPath = "/conta/convite/";
const storageKey = "caffeine-hunters:invitation";
const authKey = "caffeine-hunters:invitation-auth";
const tokenPattern = /^[0-9a-f]{64}$/;
const sevenDays = 7 * 24 * 60 * 60 * 1000;

export function pendingInvitation(): string | null {
  try {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return null;
    const { token, expires } = JSON.parse(saved);
    if (typeof token === "string" && tokenPattern.test(token) && expires > Date.now()) return token;
    localStorage.removeItem(storageKey);
  } catch {
    // O navegador pode bloquear armazenamento persistente.
  }
  return null;
}

export function readInvitationLink() {
  const fragment = window.location.hash.slice(1);
  if (!fragment) return pendingInvitation();
  const token = new URLSearchParams(fragment).get("token");
  window.history.replaceState(null, "", invitationPath);
  if (!token || !tokenPattern.test(token)) return null;
  try {
    if (pendingInvitation() !== token)
      localStorage.setItem(storageKey, JSON.stringify({ token, expires: Date.now() + sevenDays }));
  } catch {
    // O link ainda funciona nesta página quando já existe uma sessão.
  }
  return token;
}

export function clearInvitation(token: string) {
  try {
    if (pendingInvitation() === token) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(authKey);
    }
  } catch {
    // O aceite já foi confirmado no servidor.
  }
}


export function markInvitationAuth(method: "signup" | "google") {
  try {
    const token = pendingInvitation();
    if (token) localStorage.setItem(authKey, JSON.stringify({ token, method }));
  } catch {
    // Neste caso, o destinatário pode reabrir o link original após autenticar.
  }
}

export function finishInvitationAuth(method: "signup" | "google") {
  try {
    const marker = localStorage.getItem(authKey);
    if (!marker) return false;
    const { token, method: savedMethod } = JSON.parse(marker);
    if (!token || token !== pendingInvitation() || savedMethod !== method) return false;
    localStorage.removeItem(authKey);
    return true;
  } catch {
    return false;
  }
}
