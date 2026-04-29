import { NextRequest, NextResponse } from "next/server";
import { Errors } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { requireSessionContext } from "@/lib/auth/session";

// ---------------------------------------------------------------------------
// GET /api/v1/messages/stream
// Server-Sent Events endpoint for real-time message delivery
// Requirements: 5.3
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) return error ?? Errors.unauthorized("Se requiere autenticación");
  const { userId, communityId } = context;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let lastMessageAt = new Date(0).toISOString();

      const send = (event: string, payload: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
        );
      };

      // Send initial connection event
      send("connected", { userId, communityId });

      const checkUpdates = async () => {
        if (closed) return;
        try {
          const latest = await prisma.message.findFirst({
            where: {
              communityId,
              thread: {
                OR: [{ participantA: userId }, { participantB: userId }],
              },
            },
            orderBy: { sentAt: "desc" },
            select: { id: true, threadId: true, sentAt: true, senderId: true },
          });

          if (latest && latest.sentAt.toISOString() > lastMessageAt) {
            lastMessageAt = latest.sentAt.toISOString();
            send("thread-update", {
              messageId: latest.id,
              threadId: latest.threadId,
              sentAt: lastMessageAt,
              senderId: latest.senderId,
            });
          }
        } catch {
          send("heartbeat", { ts: Date.now() });
        }
      };

      await checkUpdates();

      const heartbeatInterval = setInterval(() => {
        if (closed) return;
        send("heartbeat", { ts: Date.now() });
      }, 30_000);

      const pollInterval = setInterval(() => {
        void checkUpdates();
      }, 5000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeatInterval);
        clearInterval(pollInterval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
