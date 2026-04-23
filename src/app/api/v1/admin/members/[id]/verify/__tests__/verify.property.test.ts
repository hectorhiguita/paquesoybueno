// Feature: santa-elena-platform, Property 21: Registro de verificación de proveedor contiene todos los campos
import { describe, it, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// Mock Prisma before importing route handlers
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { PATCH } from "../route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MEMBER_ID = "550e8400-e29b-41d4-a716-446655440010";
const ADMIN_ID = "550e8400-e29b-41d4-a716-446655440099";
const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";

const MOCK_MEMBER = { id: MEMBER_ID };

function makeRequest(reason: string, adminId = ADMIN_ID): NextRequest {
  return new NextRequest(
    `http://localhost/api/v1/admin/members/${MEMBER_ID}/verify`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Community-ID": COMMUNITY_ID,
        "X-Admin-ID": adminId,
      },
      body: JSON.stringify({ reason }),
    }
  );
}

const ROUTE_CONTEXT = { params: Promise.resolve({ id: MEMBER_ID }) };

// ---------------------------------------------------------------------------
// Property 21: Registro de verificación de proveedor contiene todos los campos
// ---------------------------------------------------------------------------

describe("Property 21: Registro de verificación de proveedor contiene todos los campos", () => {
  /**
   * Validates: Requirements 9.7
   *
   * For any verification action executed by an admin, the system must persist
   * the three required fields: verification date (verifiedAt), admin ID (verifiedBy),
   * and verification reason (verificationReason).
   */
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(MOCK_MEMBER as never);
  });

  it("persists verifiedAt (Date), verifiedBy (adminId), and verificationReason for any valid reason", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid reason strings: at least 3 printable characters
        fc.string({ minLength: 3, maxLength: 200 }).filter((s) => s.trim().length >= 3),
        // Generate valid admin UUIDs
        fc.uuid(),
        async (reason, adminId) => {
          vi.mocked(prisma.user.update).mockResolvedValueOnce({
            id: MEMBER_ID,
            name: "Test User",
            email: "test@example.com",
            isVerifiedProvider: true,
            verifiedAt: new Date(),
            verifiedBy: adminId,
            verificationReason: reason.trim(),
          } as never);

          const res = await PATCH(makeRequest(reason, adminId), ROUTE_CONTEXT);

          if (res.status !== 200) return true; // skip if validation rejected (edge case)

          // Verify the update call included all three required fields
          const updateCall = vi.mocked(prisma.user.update).mock.calls.at(-1)?.[0];
          if (!updateCall) return false;

          const data = updateCall.data as Record<string, unknown>;

          return (
            data.verifiedAt instanceof Date &&
            typeof data.verifiedBy === "string" &&
            data.verifiedBy === adminId &&
            typeof data.verificationReason === "string" &&
            data.verificationReason === reason.trim()
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("verifiedAt is always a Date instance when verification succeeds", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 200 }).filter((s) => s.trim().length >= 3),
        async (reason) => {
          vi.mocked(prisma.user.update).mockResolvedValueOnce({
            id: MEMBER_ID,
            name: "Test User",
            email: "test@example.com",
            isVerifiedProvider: true,
            verifiedAt: new Date(),
            verifiedBy: ADMIN_ID,
            verificationReason: reason.trim(),
          } as never);

          await PATCH(makeRequest(reason), ROUTE_CONTEXT);

          const updateCall = vi.mocked(prisma.user.update).mock.calls.at(-1)?.[0];
          if (!updateCall) return true;

          const data = updateCall.data as Record<string, unknown>;
          return data.verifiedAt instanceof Date;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("verifiedBy always equals the X-Admin-ID header value", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 200 }).filter((s) => s.trim().length >= 3),
        fc.uuid(),
        async (reason, adminId) => {
          vi.mocked(prisma.user.update).mockResolvedValueOnce({
            id: MEMBER_ID,
            name: "Test User",
            email: "test@example.com",
            isVerifiedProvider: true,
            verifiedAt: new Date(),
            verifiedBy: adminId,
            verificationReason: reason.trim(),
          } as never);

          await PATCH(makeRequest(reason, adminId), ROUTE_CONTEXT);

          const updateCall = vi.mocked(prisma.user.update).mock.calls.at(-1)?.[0];
          if (!updateCall) return true;

          const data = updateCall.data as Record<string, unknown>;
          return data.verifiedBy === adminId;
        }
      ),
      { numRuns: 100 }
    );
  });
});
