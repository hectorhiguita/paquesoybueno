/**
 * Tokens de activación de cuenta de único uso.
 * Se generan al registrarse y expiran en 24 horas.
 * En producción usar Redis o tabla DB; aquí usamos Map en memoria.
 */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

interface ActivationEntry {
  userId: string;
  email: string;
  communityId: string;
  expiresAt: number;
  used: boolean;
}

const store = new Map<string, ActivationEntry>();

export function generateActivationToken(
  userId: string,
  email: string,
  communityId: string
): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  store.set(token, {
    userId,
    email,
    communityId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
    used: false,
  });

  return token;
}

export function validateActivationToken(
  token: string
): { userId: string; email: string; communityId: string } | null {
  const entry = store.get(token);
  if (!entry) return null;
  if (entry.used) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(token);
    return null;
  }
  return { userId: entry.userId, email: entry.email, communityId: entry.communityId };
}

export function consumeActivationToken(token: string): boolean {
  const entry = store.get(token);
  if (!entry || entry.used || Date.now() > entry.expiresAt) return false;
  entry.used = true;
  store.set(token, entry);
  return true;
}
