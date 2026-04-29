import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { requireSessionContext } from "@/lib/auth/session";
import type { MessageThreadListItem } from "@/types/prisma";

const sendMessageSchema = z.object({
  threadId: z.string().uuid("El threadId debe ser un UUID válido").optional(),
  participantId: z.string().uuid("El participantId debe ser un UUID válido").optional(),
  listingId: z.string().uuid().optional(),
  content: z
    .string()
    .min(1, "El contenido no puede estar vacío")
    .max(2000, "El contenido no puede superar 2000 caracteres"),
});

// ---------------------------------------------------------------------------
// GET /api/v1/messages
// List all message threads for the authenticated user
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) return error ?? Errors.unauthorized();
  const { userId, communityId } = context;

  try {
    const threads = await prisma.messageThread.findMany({
      where: {
        communityId,
        OR: [{ participantA: userId }, { participantB: userId }],
      },
      include: {
        userA: { select: { id: true, name: true } },
        userB: { select: { id: true, name: true } },
        messages: {
          orderBy: { sentAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            sentAt: true,
            senderId: true,
            delivered: true,
          },
        },
      },
      orderBy: { lastMessageAt: "desc" },
    });

    const result = threads.map((t: MessageThreadListItem) => ({
      id: t.id,
      listingId: t.listingId,
      other: t.userA.id === userId ? t.userB : t.userA,
      lastMessage: t.messages[0] ?? null,
      lastMessageAt: t.lastMessageAt,
      hasUnread:
        t.messages[0] !== undefined &&
        t.messages[0].senderId !== userId &&
        !t.messages[0].delivered,
    }));

    return NextResponse.json({ data: { threads: result } }, { status: 200 });
  } catch (err) {
    console.error("[GET /messages] DB error:", err);
    return Errors.internal();
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/messages
// Send a message — creates a thread if participantId is given, uses existing if threadId is given
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) {
    return error ?? Errors.unauthorized("Se requiere autenticación para enviar mensajes");
  }
  const { userId: senderId, communityId } = context;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Errors.validation("El cuerpo de la solicitud debe ser JSON válido");
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0].message, parsed.error.issues[0].path[0] as string);
  }

  const { threadId, participantId, listingId, content } = parsed.data;

  if (!threadId && !participantId) {
    return Errors.validation("Se requiere threadId o participantId");
  }

  try {
    const sender = await prisma.user.findFirst({
      where: { id: senderId, communityId },
      select: { status: true },
    });

    if (!sender) return Errors.unauthorized("Usuario no encontrado");

    if (sender.status === "locked" || sender.status === "under_review" || sender.status === "suspended") {
      return Errors.forbidden("Tu cuenta está restringida y no puedes enviar mensajes");
    }

    let resolvedThreadId = threadId;

    if (!resolvedThreadId && participantId) {
      if (participantId === senderId) {
        return Errors.validation("No puedes enviarte mensajes a ti mismo");
      }

      const existing = await prisma.messageThread.findFirst({
        where: {
          communityId,
          OR: [
            { participantA: senderId, participantB: participantId },
            { participantA: participantId, participantB: senderId },
          ],
          ...(listingId ? { listingId } : {}),
        },
      });

      if (existing) {
        resolvedThreadId = existing.id;
      } else {
        const newThread = await prisma.messageThread.create({
          data: {
            communityId,
            participantA: senderId,
            participantB: participantId,
            ...(listingId ? { listingId } : {}),
          },
        });
        resolvedThreadId = newThread.id;
      }
    }

    const thread = await prisma.messageThread.findFirst({
      where: {
        id: resolvedThreadId,
        communityId,
        OR: [{ participantA: senderId }, { participantB: senderId }],
      },
    });

    if (!thread) return Errors.forbidden("No tienes acceso a este hilo de mensajes");

    const message = await prisma.message.create({
      data: { communityId, threadId: resolvedThreadId!, senderId, content, delivered: false },
      select: {
        id: true,
        content: true,
        sentAt: true,
        delivered: true,
        threadId: true,
        sender: { select: { id: true, name: true } },
      },
    });

    await prisma.messageThread.update({
      where: { id: resolvedThreadId },
      data: { lastMessageAt: new Date() },
    });

    return NextResponse.json({ data: { message, threadId: resolvedThreadId } }, { status: 201 });
  } catch (err) {
    console.error("[POST /messages] DB error:", err);
    return Errors.internal();
  }
}
