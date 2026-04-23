import { NextRequest, NextResponse } from "next/server";

// UUID v4 regex for validation
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Multi-tenancy middleware.
 *
 * Injects community context into every /api/v1/* request:
 *  1. If X-Community-ID header is a valid UUID → pass it through as-is.
 *  2. If a non-trivial subdomain is present → set X-Community-Slug header
 *     (route handlers resolve slug → ID via DB).
 *  3. If communityId query param is present (dev fallback) → treat as slug.
 *
 * No DB calls here — edge runtime compatible.
 *
 * Requirements: 12.1, 12.2
 */
export function middleware(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);

  // 1. X-Community-ID header already present and valid UUID → pass through
  const existingId = request.headers.get("X-Community-ID");
  if (existingId && UUID_REGEX.test(existingId)) {
    requestHeaders.set("X-Community-ID", existingId);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 2. Subdomain extraction
  const hostname = request.headers.get("host") ?? "";
  // Strip port if present (e.g. localhost:3000)
  const host = hostname.split(":")[0];
  const parts = host.split(".");

  // A valid subdomain exists when there are at least 3 parts (sub.domain.tld)
  // and the first part is not "www" or "localhost"
  if (parts.length >= 3 && parts[0] !== "www") {
    requestHeaders.set("X-Community-Slug", parts[0]);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 3. Query param fallback (development / testing)
  const communityId = request.nextUrl.searchParams.get("communityId");
  if (communityId) {
    if (UUID_REGEX.test(communityId)) {
      requestHeaders.set("X-Community-ID", communityId);
    } else {
      requestHeaders.set("X-Community-Slug", communityId);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
