import { NextRequest, NextResponse } from "next/server";
import { signAdminSession, setAdminSessionCookie, verifyAdminSession } from "@/lib/admin/session";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Middleware unificado:
 *  - /admin/*   → valida cookie admin_session (JWT HS256). Redirige a /admin/login si inválida.
 *  - /api/v1/*  → inyecta contexto de comunidad (multi-tenancy).
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // ──────────────────────────────────────────────────────
  // Protección de rutas admin + sesión deslizante por inactividad
  // ──────────────────────────────────────────────────────
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/v1/admin");
  const isAdminLogin = pathname === "/admin/login" || pathname === "/api/v1/admin/auth/login";
  const isAdminLogout = pathname === "/api/v1/admin/auth/logout";
  const isAdminPromote = pathname === "/api/v1/admin/auth/promote";

  if ((isAdminPage || isAdminApi) && !isAdminLogin && !isAdminLogout && !isAdminPromote) {
    const sessionToken = request.cookies.get("admin_session")?.value;
    const session = await verifyAdminSession(sessionToken);

    if (session) {
      const response = NextResponse.next();
      const refreshedToken = await signAdminSession();
      setAdminSessionCookie(response, refreshedToken);
      return response;
    }

    if (isAdminApi) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Sesión de administrador expirada",
            requestId: crypto.randomUUID(),
          },
        },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ──────────────────────────────────────────────────────
  // Multi-tenancy para /api/v1/*
  // ──────────────────────────────────────────────────────
  const requestHeaders = new Headers(request.headers);

  const existingId = request.headers.get("X-Community-ID");
  if (existingId && UUID_REGEX.test(existingId)) {
    requestHeaders.set("X-Community-ID", existingId);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const hostname = request.headers.get("host") ?? "";
  const host = hostname.split(":")[0];
  const parts = host.split(".");

  if (parts.length >= 3 && parts[0] !== "www") {
    requestHeaders.set("X-Community-Slug", parts[0]);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

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
  matcher: ["/api/v1/:path*", "/admin/:path*"],
};
