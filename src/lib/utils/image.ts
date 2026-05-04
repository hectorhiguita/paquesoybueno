/**
 * Returns true only for external HTTPS image URLs.
 * Filters out localhost/127.x URLs that come from dev-mode storage fallback.
 */
export function isSafeImageUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") return false;
    if (hostname === "localhost" || hostname.startsWith("127.") || hostname.startsWith("192.168.")) return false;
    return true;
  } catch {
    return false;
  }
}
