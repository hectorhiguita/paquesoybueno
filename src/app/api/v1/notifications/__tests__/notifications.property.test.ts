// Feature: santa-elena-platform, Property 17: Notificaciones no leídas ordenadas por fecha descendente

import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// Mock Prisma before importing route handlers
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
    },
  },
}));

import { GET } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL("http://localhost/api/v1/notifications");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString(), {
    headers: {
      "X-Community-ID": COMMUNITY_ID,
      "X-User-ID": USER_ID,
    },
  });
}

// ---------------------------------------------------------------------------
// Property 17: Notificaciones no leídas ordenadas por fecha descendente
// ---------------------------------------------------------------------------

describe("Property 17: Notificaciones no leídas ordenadas por fecha descendente", () => {
  /**
   * Validates: Requirements 7.5
   *
   * For any set of unread notifications of a member, the notifications panel
   * must show them ordered by created_at descending (most recent first),
   * without exception.
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unread notifications are always returned ordered by createdAt descending", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an array of 1–20 notifications with random createdAt timestamps
        fc.array(
          fc.record({
            id: fc.uuid(),
            type: fc.constantFrom("new_message", "new_rating", "listing_update", "system"),
            payload: fc.constant({}),
            read: fc.constant(false),
            createdAt: fc.date({
              min: new Date("2020-01-01T00:00:00Z"),
              max: new Date("2030-12-31T23:59:59Z"),
            }),
            expiresAt: fc.constant(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (notifications) => {
          // Prisma returns them in arbitrary order — the route must sort them
          const shuffled = [...notifications].sort(() => Math.random() - 0.5);
          vi.mocked(prisma.notification.findMany).mockResolvedValue(shuffled as never);

          const res = await GET(makeRequest({ read: "false" }));
          const json = await res.json();

          if (res.status !== 200) return false;

          const returned: { createdAt: string }[] = json.data.notifications;

          // Verify descending order: each item must be >= the next
          for (let i = 0; i < returned.length - 1; i++) {
            const current = new Date(returned[i].createdAt).getTime();
            const next = new Date(returned[i + 1].createdAt).getTime();
            if (current < next) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
