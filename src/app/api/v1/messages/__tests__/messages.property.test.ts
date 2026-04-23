// Feature: santa-elena-platform, Property 14: Bloqueo de mensajería para cuentas restringidas

import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// Mock Prisma before importing route handlers
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    messageThread: { findFirst: vi.fn(), update: vi.fn() },
    message: { create: vi.fn() },
  },
}));

import { POST } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const THREAD_ID = "550e8400-e29b-41d4-a716-446655440004";

const MOCK_THREAD = {
  id: THREAD_ID,
  communityId: COMMUNITY_ID,
  participantA: USER_ID,
  participantB: "550e8400-e29b-41d4-a716-446655440003",
  lastMessageAt: new Date(),
};

const MOCK_MESSAGE = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  content: "Hola, ¿está disponible?",
  sentAt: new Date("2024-01-01T10:00:00Z"),
  delivered: false,
  sender: { id: USER_ID, name: "Ana García" },
};

const VALID_BODY = { threadId: THREAD_ID, content: "Hola, ¿está disponible?" };

function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-ID": COMMUNITY_ID,
      "X-User-ID": USER_ID,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Property 14: Bloqueo de mensajería para cuentas restringidas
// ---------------------------------------------------------------------------

describe("Property 14: Bloqueo de mensajería para cuentas restringidas", () => {
  /**
   * Validates: Requirements 5.6
   *
   * For any member whose account is in `locked` or `under_review` status,
   * any attempt to send an internal message must be blocked by the system.
   */
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.messageThread.findFirst).mockResolvedValue(MOCK_THREAD as never);
    vi.mocked(prisma.messageThread.update).mockResolvedValue(MOCK_THREAD as never);
    vi.mocked(prisma.message.create).mockResolvedValue(MOCK_MESSAGE as never);
  });

  it("blocks message sending for any restricted account status (locked or under_review)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("locked", "under_review"),
        async (restrictedStatus) => {
          vi.mocked(prisma.user.findFirst).mockResolvedValue(
            { status: restrictedStatus } as never
          );

          const res = await POST(makeRequest(VALID_BODY));
          const json = await res.json();

          return (
            res.status === 403 &&
            json.error?.code === "FORBIDDEN"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("allows message sending for active accounts (not blocked)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("active"),
        async (activeStatus) => {
          vi.mocked(prisma.user.findFirst).mockResolvedValue(
            { status: activeStatus } as never
          );

          const res = await POST(makeRequest(VALID_BODY));

          return res.status === 201;
        }
      ),
      { numRuns: 100 }
    );
  });
});
