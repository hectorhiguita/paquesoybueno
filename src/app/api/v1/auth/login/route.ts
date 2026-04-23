import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { loginSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { sendAccountLockedEmail } from "@/lib/email";
import { Errors } from "@/lib/api/errors";

/**
 * POST /api/v1/auth/login
 *
 * Authenticates a Member with email + password.
 *
 * - Returns 200 with session info on success (Req 1.5)
 * - Returns 401 with generic error on invalid credentials (Req 1.6)
 * - Returns 429 with Retry-After header when account is locked (Req 1.7)
 * - Increments failedLoginAttempts on each failure (Req 1.6)
 * - Locks account after 5 failures within 10 minutes (Req 1.7)
 *
 * Requirements: 1.5, 1.6, 1.7
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  // --- Validate input ---
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(
      firstIssue.message,
      firstIssue.path[0] as string | undefined
    );
  }

  const { email, password, communityId } = parsed.data;

  // --- Fetch user ---
  let user: {
    id: string;
    email: string;
    name: string;
    passwordHash: string | null;
    status: string;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    communityId: string;
    role: string;
    isVerifiedProvider: boolean;
    phoneVerified: boolean;
  } | null;

  try {
    user = await prisma.user.findFirst({
      where: { email, communityId },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        status: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        communityId: true,
        role: true,
        isVerifiedProvider: true,
        phoneVerified: true,
      },
    });
  } catch (err) {
    console.error("[login] DB error:", err);
    return Errors.internal();
  }

  // --- Check if account is locked (Req 1.7) ---
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const retryAfterSeconds = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 1000
    );
    const minutesLeft = Math.ceil(retryAfterSeconds / 60);

    return NextResponse.json(
      {
        error: {
          code: "ACCOUNT_LOCKED",
          message: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutesLeft} minutos.`,
          requestId: randomUUID(),
        },
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      }
    );
  }

  // --- Validate credentials (Req 1.5, 1.6) ---
  // Generic error — never reveal if email or password is wrong
  const genericUnauthorized = () =>
    NextResponse.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Credenciales inválidas",
          requestId: randomUUID(),
        },
      },
      { status: 401 }
    );

  if (!user || !user.passwordHash) {
    // User not found — still increment nothing (no user to track), return generic error
    return genericUnauthorized();
  }

  // Check account status (suspended accounts cannot log in)
  if (user.status === "suspended") {
    return genericUnauthorized();
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    // Increment failed attempts (Req 1.6)
    await incrementFailedAttempts(user.id, user.email, user.failedLoginAttempts);
    return genericUnauthorized();
  }

  // --- Successful login (Req 1.5) ---
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, status: "active" },
    });
  } catch (err) {
    console.error("[login] Failed to reset attempt counter:", err);
    // Non-fatal — continue
  }

  return NextResponse.json(
    {
      data: {
        userId: user.id,
        email: user.email,
        name: user.name,
        communityId: user.communityId,
        role: user.role,
        isVerifiedProvider: user.isVerifiedProvider,
        phoneVerified: user.phoneVerified,
        message: "Autenticación exitosa",
      },
    },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function incrementFailedAttempts(
  userId: string,
  email: string,
  currentAttempts: number
): Promise<void> {
  const newCount = currentAttempts + 1;

  if (newCount >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: newCount,
        lockedUntil,
        status: "locked",
      },
    });

    // Notify via email (non-fatal)
    sendAccountLockedEmail(email, lockedUntil).catch((err) => {
      console.error("[login] Failed to send account-locked email:", err);
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: newCount },
    });
  }
}
