// Feature: santa-elena-platform, Property 20: Auto-suspensión por umbral de reportes
import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      create: vi.fn(),
      count: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

import { POST } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const REPORTER_ID = "550e8400-e29b-41d4-a716-446655440002";
const TARGET_USER_ID = "550e8400-e29b-41d4-a716-446655440003";
const REPORT_ID = "550e8400-e29b-41d4-a716-446655440010";

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/reports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-ID": COMMUNITY_ID,
      "X-User-ID": REPORTER_ID,
    },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Property 20: Auto-suspensión por umbral de reportes
// ---------------------------------------------------------------------------

describe("Property 20: Auto-suspensión por umbral de reportes", () => {
  /**
   * Validates: Requirements 9.5
   *
   * For any member who accumulates 5 or more reports within a 30-day window,
   * the system must automatically suspend the account and notify the administrator.
   */

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.report.create).mockResolvedValue({
      id: REPORT_ID,
      communityId: COMMUNITY_ID,
      reporterId: REPORTER_ID,
      targetUserId: TARGET_USER_ID,
      targetListingId: null,
      reason: "Comportamiento inapropiado en la plataforma",
      status: "pending",
      createdAt: new Date(),
      resolvedAt: null,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);
  });

  it("suspends user when report count reaches 5 or more in last 30 days", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        async (reportCount) => {
          vi.mocked(prisma.report.count).mockResolvedValue(reportCount);

          const res = await POST(
            makePostRequest({
              targetUserId: TARGET_USER_ID,
              reason: "Comportamiento inapropiado en la plataforma",
            })
          );

          if (res.status !== 201) return false;

          // User must be suspended
          const updateCalls = vi.mocked(prisma.user.update).mock.calls;
          const suspendCall = updateCalls.find(
            (call) =>
              call[0].where?.id === TARGET_USER_ID &&
              (call[0].data as Record<string, unknown>)?.status === "suspended"
          );

          return suspendCall !== undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("does not suspend user when report count is below 5", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 4 }),
        async (reportCount) => {
          vi.clearAllMocks();
          vi.mocked(prisma.report.create).mockResolvedValue({
            id: REPORT_ID,
            communityId: COMMUNITY_ID,
            reporterId: REPORTER_ID,
            targetUserId: TARGET_USER_ID,
            targetListingId: null,
            reason: "Comportamiento inapropiado en la plataforma",
            status: "pending",
            createdAt: new Date(),
            resolvedAt: null,
          } as never);
          vi.mocked(prisma.report.count).mockResolvedValue(reportCount);
          vi.mocked(prisma.user.update).mockResolvedValue({} as never);
          vi.mocked(prisma.user.findMany).mockResolvedValue([]);

          const res = await POST(
            makePostRequest({
              targetUserId: TARGET_USER_ID,
              reason: "Comportamiento inapropiado en la plataforma",
            })
          );

          if (res.status !== 201) return false;

          // User must NOT be suspended
          const updateCalls = vi.mocked(prisma.user.update).mock.calls;
          const suspendCall = updateCalls.find(
            (call) =>
              call[0].where?.id === TARGET_USER_ID &&
              (call[0].data as Record<string, unknown>)?.status === "suspended"
          );

          return suspendCall === undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("notifies admins when user is auto-suspended", async () => {
    const adminId = "550e8400-e29b-41d4-a716-446655440099";
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: adminId }] as never);

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        async (reportCount) => {
          vi.mocked(prisma.report.count).mockResolvedValue(reportCount);
          vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

          const res = await POST(
            makePostRequest({
              targetUserId: TARGET_USER_ID,
              reason: "Comportamiento inapropiado en la plataforma",
            })
          );

          if (res.status !== 201) return false;

          // Notification must be created for admin
          const notifCalls = vi.mocked(prisma.notification.create).mock.calls;
          const adminNotif = notifCalls.find(
            (call) =>
              call[0].data?.userId === adminId &&
              call[0].data?.type === "user_auto_suspended"
          );

          return adminNotif !== undefined;
        }
      ),
      { numRuns: 100 }
    );
  });
});
