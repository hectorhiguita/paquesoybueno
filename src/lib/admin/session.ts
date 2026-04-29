import { jwtVerify, SignJWT } from "jose";
import type { NextRequest, NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_DURATION_SECONDS = 15 * 60;

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ?? "dev-secret-change-in-production"
);

export interface AdminSessionPayload {
  sub: string;
  role: "admin";
}

export async function signAdminSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("admin")
    .setAudience("admin-panel")
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_DURATION_SECONDS}s`)
    .sign(secret);
}

export async function verifyAdminSession(
  token?: string | null
): Promise<AdminSessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret, { audience: "admin-panel" });
    if (payload.sub !== "admin" || payload.role !== "admin") return null;
    return { sub: "admin", role: "admin" };
  } catch {
    return null;
  }
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_DURATION_SECONDS,
    path: "/",
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function requireAdminSessionFromRequest(
  request: NextRequest
): Promise<AdminSessionPayload | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSession(token);
}
