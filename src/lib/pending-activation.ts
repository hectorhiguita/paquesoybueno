const ACTIVATION_OTP_TTL_MS = 10 * 60 * 1000;

interface PendingActivationEntry {
  userId: string;
  communityId: string;
  phone: string;
  passwordHash: string;
  expiresAt: number;
}

const store = new Map<string, PendingActivationEntry>();

export function storePendingActivation(
  token: string,
  entry: Omit<PendingActivationEntry, "expiresAt">
): void {
  store.set(token, {
    ...entry,
    expiresAt: Date.now() + ACTIVATION_OTP_TTL_MS,
  });
}

export function getPendingActivation(token: string): PendingActivationEntry | null {
  const entry = store.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(token);
    return null;
  }
  return entry;
}

export function clearPendingActivation(token: string): void {
  store.delete(token);
}
