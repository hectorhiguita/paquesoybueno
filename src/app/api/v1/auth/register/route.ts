import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { generateActivationToken } from "@/lib/activation-tokens";
import { sendActivationEmail } from "@/lib/email";
import { colombianPhoneSchema } from "@/lib/validations/auth";

const registerSchema = z.object({
  name:        z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email:       z.string().email("Correo electrónico inválido"),
  phone:       colombianPhoneSchema,
  communityId: z.string().uuid("ID de comunidad inválido"),
  veredaId:    z.string().uuid("Vereda inválida").optional(),
  // Compatibilidad temporal con el flujo anterior de registro directo.
  password:    z.string().min(8, "La contraseña debe tener al menos 8 caracteres").optional(),
});

/**
 * POST /api/v1/auth/register
 *
 * Crea la cuenta sin contraseña y envía un link de activación único por email.
 * El usuario crea su contraseña al hacer clic en el link.
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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const { name, email, phone, communityId } = parsed.data;

  // Crear usuario sin contraseña — se establece al activar la cuenta
  let userId: string;
  try {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        communityId,
        email,
        phone,
        name,
        // Sin passwordHash — se establece en el flujo de activación
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (err) {
    // Req 1.4: error genérico — no revelar qué campo está duplicado
    if ((err as { code?: string } | null)?.code === "P2002") {
      return NextResponse.json(
        { error: { code: "CONFLICT", message: "Ya existe una cuenta con estos datos", requestId: randomUUID() } },
        { status: 409 }
      );
    }
    console.error("[register] DB error:", err);
    return Errors.internal();
  }

  // Generar token de activación de único uso (24h)
  const token = generateActivationToken(userId, email, communityId);
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://santaelenacomunidad.online";
  const activationUrl = `${baseUrl}/activate?token=${token}`;

  // Enviar email con el link
  const emailResult = await sendActivationEmail(email, name, activationUrl);
  if (!emailResult.success) {
    console.error("[register] Email send failed:", emailResult.error);
    // No fatal — el usuario puede solicitar reenvío
  }

  return NextResponse.json(
    {
      data: {
        userId,
        message: "Cuenta creada. Revisa tu correo para activarla y crear tu contraseña.",
      },
    },
    { status: 201 }
  );
}
