import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireSessionContext } from "@/lib/auth/session";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/v1/messages/:threadId — messages in a thread ordered asc
export async function GET(
  request: NextRequest,
  { params }: { params: { threadId: string } }
): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) return error ?? Errors.unauthorized();
  const { userId, communityId } = context;

  const { threadId } = params;
  if (!UUID_RE.test(threadId)) return Errors.validation("ID de hilo inválido", "threadId");

  try {
    const thread = await prisma.messageThread.findFirst({
      where: {
        id: threadId,
        communityId,
        OR: [{ participantA: userId }, { participantB: userId }],
      },
    });
    if (!thread) return Errors.forbidden("No tienes acceso a este hilo de mensajes");

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

    // Mark delivered for messages not sent by current user
    await prisma.message.updateMany({
      where: { threadId, communityId, senderId: { not: userId }, delivered: false },
      data: { delivered: true },
    });

    return NextResponse.json({ data: { messages } }, { status: 200 });
  } catch (err) {
    console.error("[GET /messages/:threadId] DB error:", err);
    return Errors.internal();
  }
}
