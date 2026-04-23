import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// GET /api/v1/messages/:threadId
// Returns messages in a thread ordered by sent_at asc
// Requirements: 5.2
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
): Promise<NextResponse> {
  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  const userId = request.headers.get("X-User-ID");
  if (!userId) {
    return Errors.unauthorized("Se requiere autenticación");
  }

  const { threadId } = params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(threadId)) {
    return Errors.validation("ID de hilo inválido", "threadId");
  }

  try {
    // Verify thread exists and user is a participant
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: threadId,
        communityId,
        OR: [{ participantA: userId }, { participantB: userId }],
      },
    });

    if (!thread) {
      return Errors.forbidden("No tienes acceso a este hilo de mensajes");
    }

    const messages = await prisma.message.findMany({
      where: { threadId, communityId },
      select: {
        id: true,
        content: true,
        sentAt: true,
        delivered: true,
        sender: { select: { id: true, name: true } },
      },
      orderBy: { sentAt: "asc" },
    });

    return NextResponse.json({ data: { messages } }, { status: 200 });
  } catch (err) {
    console.error("[GET /messages/:threadId] DB error:", err);
    return Errors.internal();
  }
}
