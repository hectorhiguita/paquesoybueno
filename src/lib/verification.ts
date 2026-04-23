/**
 * Verification code management.
 *
 * In production, replace the in-memory store with Redis (Upstash) or a
 * dedicated DB table. The in-memory store works for single-instance
 * development and testing.
 */

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CodeEntry {
  code: string;
  expiresAt: number;
  communityId: string;
}

// phone -> CodeEntry
const store = new Map<string, CodeEntry>();

/**
 * Generates a cryptographically random 6-digit numeric code.
 */
export function generateVerificationCode(): string {
  // Use crypto.getRandomValues for better randomness
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  // Map to 000000–999999
  return String(array[0] % 1_000_000).padStart(6, "0");
}

/**
 * Stores a verification code for the given phone + community pair.
 * Overwrites any existing code (allows resend).
 */
export function storeVerificationCode(
  phone: string,
  communityId: string,
  code: string
): void {
  store.set(`${communityId}:${phone}`, {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
    communityId,
  });
}

/**
 * Verifies a code for the given phone + community pair.
 * Returns true if valid and not expired; deletes the entry on success.
 */
export function verifyCode(
  phone: string,
  communityId: string,
  code: string
): boolean {
  const key = `${communityId}:${phone}`;
  const entry = store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return false;
  }
  if (entry.code !== code) return false;
  store.delete(key);
  return true;
}

/**
 * Checks whether a pending (non-expired) code exists for the given phone.
 */
export function hasPendingCode(phone: string, communityId: string): boolean {
  const key = `${communityId}:${phone}`;
  const entry = store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return false;
  }
  return true;
}
