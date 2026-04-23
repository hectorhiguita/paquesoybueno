import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

const createMessageSchema = z.object({
  threadId: z.string().uuid("El threadId debe ser un UUID válido"),
  content: z
    .string()
    .min(1, "El contenido no puede estar vacío")
    .max(2000, "El contenido no puede superar 2000 caracteres"),
});

// ---------------------------------------------------------------------------
// POST /api/v1/messages
// Creates a new message in a thread
// Requirements: 5.2, 5.3, 5.6
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const senderId = request.headers.get("X-User-ID");
  if (!senderId) {
    return Errors.unauthorized("Se requiere autenticación para enviar mensajes");
  }

  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return Errors.validation(firstIssue.message, firstIssue.path[0] as string | undefined);
  }

  const { threadId, content } = parsed.data;

  try {
    // Check sender's account status (Req 5.6)
    const sender = await prisma.user.findFirst({
      where: { id: senderId, communityId },
      select: { status: true },
    });

    if (!sender) {
      return Errors.unauthorized("Usuario no encontrado");
    }

    if (sender.status === "locked" || sender.status === "under_review") {
      return Errors.forbidden(
        "Tu cuenta está restringida y no puedes enviar mensajes"
      );
    }

    // Verify thread exists and sender is a participant
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: threadId,
        communityId,
        OR: [{ participantA: senderId }, { participantB: senderId }],
      },
    });

    if (!thread) {
      return Errors.forbidden("No tienes acceso a este hilo de mensajes");
    }

    const message = await prisma.message.create({
      data: {
        communityId,
        threadId,
        senderId,
        content,
        delivered: false,
      },
      select: {
        id: true,
        content: true,
        sentAt: true,
        delivered: true,
        sender: { select: { id: true, name: true } },
      },
    });

    // Update thread's lastMessageAt
    await prisma.messageThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ data: { message } }, { status: 201 });
  } catch (err) {
    console.error("[POST /messages] DB error:", err);
    return Errors.internal();
  }
}
