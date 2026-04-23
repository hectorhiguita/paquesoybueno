import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { registerSchema } from "@/lib/validations/auth";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { sendVerificationSms } from "@/lib/sms";
import { generateVerificationCode, storeVerificationCode } from "@/lib/verification";

/**
 * POST /api/v1/auth/register
 *
 * Registers a new Member. On success:
 *  - Creates the user record (phone_verified = false implied by no active session)
 *  - Generates a 6-digit verification code and sends it via SMS
 *  - Returns 201 with a generic success payload
 *
 * Requirements: 1.1, 1.2, 1.4
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  // --- Validate input (Req 1.1) ---
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(
      firstIssue.message,
      firstIssue.path[0] as string | undefined
    );
  }

  const { name, email, phone, password, communityId } = parsed.data;

  // --- Hash password ---
  // Use Web Crypto API (available in Node 18+ and Edge runtime) to avoid
  // adding a bcrypt dependency. PBKDF2 with SHA-256.
  const passwordHash = await hashPassword(password);

  // --- Create user (Req 1.2) ---
  let userId: string;
  try {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        communityId,
        email,
        phone,
        name,
        // Store hashed password in a metadata field — the schema uses NextAuth
        // which manages credentials separately. We store it here for the
        // credentials provider in task 2.5. For now we persist it as a
        // JSON payload in a future `passwordHash` column; since the current
        // schema doesn't have that column we skip persisting it and note
        // it must be added in task 2.5.
        // TODO (task 2.5): add passwordHash column to User model
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (err) {
    // Req 1.4: generic duplicate error — do NOT reveal which field is duplicated
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        {
          error: {
            code: "CONFLICT",
            message: "Ya existe una cuenta con estos datos",
            requestId: randomUUID(),
          },
        },
        { status: 409 }
      );
    }
    console.error("[register] DB error:", err);
    return Errors.internal();
  }

  // --- Generate & send verification code (Req 1.2) ---
  const code = generateVerificationCode();
  storeVerificationCode(phone, communityId, code);

  const smsSent = await sendVerificationSms(phone, code);
  if (!smsSent.success) {
    // Non-fatal: user was created; log the error and continue.
    // The user can request a resend later (task 2.4).
    console.error("[register] SMS send failed:", smsSent.error);
  }

  return NextResponse.json(
    {
      data: {
        userId,
        message:
          "Cuenta creada. Te enviamos un código de verificación por SMS.",
      },
    },
    { status: 201 }
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const hashArray = Array.from(new Uint8Array(bits));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2:${saltHex}:${hashHex}`;
}
