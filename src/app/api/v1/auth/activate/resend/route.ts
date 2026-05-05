import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { generateActivationToken } from "@/lib/activation-tokens";
import { sendActivationEmail } from "@/lib/email";
import { SANTA_ELENA_COMMUNITY_ID } from "@/lib/constants";

const schema = z.object({
  email: z.string().email("Correo inválido"),
});

// Simple in-memory rate limit: 1 resend per email per 2 minutes
const recentResends = new Map<string, number>();
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/**
 * POST /api/v1/auth/activate/resend
 * Reenvía el correo de activación si la cuenta aún no ha sido activada.
 * Siempre responde 200 para no filtrar si el correo existe.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try { body = await request.json(); } catch {
    return Errors.validation("JSON inválido");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0].message, "email");
  }

  const email = parsed.data.email.trim().toLowerCase();

  // Rate limit
  const lastResend = recentResends.get(email);
  if (lastResend && Date.now() - lastResend < RESEND_COOLDOWN_MS) {
    // Return 200 to avoid leaking info, but don't resend
    return NextResponse.json({ data: { message: "Correo enviado" } });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        communityId: SANTA_ELENA_COMMUNITY_ID,
        email,
        passwordHash: null, // Only resend for accounts not yet activated
      },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      const token = await generateActivationToken(user.id, user.email, SANTA_ELENA_COMMUNITY_ID);
      const rawBase =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.NEXTAUTH_URL ??
        "https://santaelenacomunidad.online";
      const baseUrl = rawBase.replace(/^http:\/\//, "https://");
      const activationUrl = `${baseUrl}/activate?token=${token}`;

      await sendActivationEmail(user.email, user.name, activationUrl);
      recentResends.set(email, Date.now());
    }
  } catch (err) {
    console.error("[activate/resend]", err);
    // Still return 200 to not leak info
  }

  return NextResponse.json({ data: { message: "Si la cuenta existe y no ha sido activada, recibirás un nuevo correo." } });
}
