// Feature: santa-elena-platform, Property 18: Suspensión bloquea login y oculta listings
import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    listing: {
      updateMany: vi.fn(),
    },
  },
}));

import { PATCH } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const ADMIN_ID = "550e8400-e29b-41d4-a716-446655440099";
const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";

function makeRequest(memberId: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/v1/admin/members/${memberId}/suspend`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Community-ID": COMMUNITY_ID,
        "X-Admin-ID": ADMIN_ID,
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Property 18: Suspensión bloquea login y oculta listings
// ---------------------------------------------------------------------------

describe("Property 18: Suspensión bloquea login y oculta listings", () => {
  /**
   * Validates: Requirements 9.3
   *
   * For any suspended member, the system must simultaneously:
   * (a) reject any login attempt (status='suspended' blocks login), and
   * (b) exclude all their active listings from any search result or public listing
   *     (by setting listing status to 'inactive').
   */

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "member-id",
      name: "Test User",
      email: "test@example.com",
      status: "suspended",
    } as never);
    vi.mocked(prisma.listing.updateMany).mockResolvedValue({ count: 0 } as never);
  });

  it("sets user status to suspended for any member ID", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (memberId) => {
          vi.mocked(prisma.user.findUnique).mockResolvedValue(
            { id: memberId } as never
          );
          vi.mocked(prisma.user.update).mockResolvedValue({
            id: memberId,
            name: "Test User",
            email: "test@example.com",
            status: "suspended",
          } as never);

          const res = await PATCH(makeRequest(memberId), {
            params: Promise.resolve({ id: memberId }),
          });

          if (res.status !== 200) return false;

          const userUpdateCall = vi.mocked(prisma.user.update).mock.calls.at(-1)?.[0];
          if (!userUpdateCall) return false;

          return (
            userUpdateCall.where?.id === memberId &&
            (userUpdateCall.data as Record<string, unknown>)?.status === "suspended"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("sets all active listings to inactive for any member ID", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (memberId) => {
          vi.mocked(prisma.user.findUnique).mockResolvedValue(
            { id: memberId } as never
          );
          vi.mocked(prisma.user.update).mockResolvedValue({
            id: memberId,
            name: "Test User",
            email: "test@example.com",
            status: "suspended",
          } as never);
          vi.mocked(prisma.listing.updateMany).mockResolvedValue({ count: 3 } as never);

          const res = await PATCH(makeRequest(memberId), {
            params: Promise.resolve({ id: memberId }),
          });

          if (res.status !== 200) return false;

          const listingUpdateCall = vi.mocked(prisma.listing.updateMany).mock.calls.at(-1)?.[0];
          if (!listingUpdateCall) return false;

          return (
            listingUpdateCall.where?.authorId === memberId &&
            listingUpdateCall.where?.status === "active" &&
            (listingUpdateCall.data as Record<string, unknown>)?.status === "inactive"
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("performs user suspension and listing deactivation simultaneously", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (memberId) => {
          vi.mocked(prisma.user.findUnique).mockResolvedValue(
            { id: memberId } as never
          );
          vi.mocked(prisma.user.update).mockResolvedValue({
            id: memberId,
            name: "Test User",
            email: "test@example.com",
            status: "suspended",
          } as never);
          vi.mocked(prisma.listing.updateMany).mockResolvedValue({ count: 2 } as never);

          const res = await PATCH(makeRequest(memberId), {
            params: Promise.resolve({ id: memberId }),
          });

          if (res.status !== 200) return false;

          // Both operations must have been called
          const userUpdated = vi.mocked(prisma.user.update).mock.calls.some(
            (call) =>
              call[0].where?.id === memberId &&
              (call[0].data as Record<string, unknown>)?.status === "suspended"
          );

          const listingsHidden = vi.mocked(prisma.listing.updateMany).mock.calls.some(
            (call) =>
              call[0].where?.authorId === memberId &&
              (call[0].data as Record<string, unknown>)?.status === "inactive"
          );

          return userUpdated && listingsHidden;
        }
      ),
      { numRuns: 100 }
    );
  });
});
