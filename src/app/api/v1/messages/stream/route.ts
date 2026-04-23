import { NextRequest, NextResponse } from "next/server";
import { Errors } from "@/lib/api/errors";

// ---------------------------------------------------------------------------
// GET /api/v1/messages/stream
// Server-Sent Events endpoint for real-time message delivery
// Requirements: 5.3
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  const communityId = request.headers.get("X-Community-ID");
  if (!communityId) {
    return Errors.validation("El header X-Community-ID es requerido", "communityId");
  }

  const userId = request.headers.get("X-User-ID");
  if (!userId) {
    return Errors.unauthorized("Se requiere autenticación");
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId, communityId })}\n\n`)
      );

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`)
          );
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30_000);

      // Clean up on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        controller.close();
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
