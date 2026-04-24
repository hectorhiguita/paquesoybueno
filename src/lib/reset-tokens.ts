/**
 * Password reset token management.
 *
 * In production, replace the in-memory store with Redis (Upstash) or a
 * dedicated DB table. The in-memory store works for single-instance
 * development and testing.
 */

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface TokenEntry {
  email: string;
  communityId: string;
  expiresAt: number;
}

// token -> TokenEntry
const store = new Map<string, TokenEntry>();

/**
 * Generates a cryptographically random 32-byte hex token,
 * stores it with a 30-minute TTL for the given email + community pair.
 */
export function generateResetToken(email: string, communityId: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  store.set(token, {
    email,
    communityId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });

  return token;
}

/**
 * Validates a reset token.
 * Returns the associated email and communityId if valid and not expired;
 * deletes the entry on success (single-use token).
 * Returns null if invalid or expired.
 */
export function validateResetToken(
  token: string
): { email: string; communityId: string } | null {
  const entry = store.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(token);
    return null;
  }
  store.delete(token);
  return { email: entry.email, communityId: entry.communityId };
}

/**
 * Checks whether a valid (non-expired) reset token exists for the given
 * email + community pair.
 */
export function hasValidResetToken(email: string, communityId: string): boolean {
  for (const entry of store.values()) {
    if (entry.email === email && entry.communityId === communityId) {
      if (Date.now() <= entry.expiresAt) return true;
    }
  }
  return false;
}
