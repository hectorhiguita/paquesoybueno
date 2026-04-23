// Feature: santa-elena-platform, Property 2: Mensaje de error de duplicado no revela campo
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

// Mock Prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(),
    },
  },
}));

// Mock SMS to avoid real calls
vi.mock("@/lib/sms", () => ({
  sendVerificationSms: vi.fn().mockResolvedValue({ success: true }),
}));

import { POST } from "../route";
import { prisma } from "@/lib/prisma";

const VALID_BODY = {
  name: "Juan García",
  email: "juan@example.com",
  phone: "3001234567",
  password: "securepass123",
  communityId: "550e8400-e29b-41d4-a716-446655440000",
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Maps a duplicate scenario to the Prisma P2002 error target array.
 */
function makeP2002Error(scenario: "email" | "phone" | "both"): Prisma.PrismaClientKnownRequestError {
  const targetMap = {
    email: ["community_id", "email"],
    phone: ["community_id", "phone"],
    both: ["community_id", "email", "phone"],
  };
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "5.0.0",
    meta: { target: targetMap[scenario] },
  });
}

describe("Property 2: Mensaje de error de duplicado no revela campo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Validates: Requirements 1.4
   *
   * For any of the 3 duplicate scenarios (email, phone, or both duplicated),
   * the response must:
   * - Have status 409
   * - Have error.code === "CONFLICT"
   * - Have error.message === "Ya existe una cuenta con estos datos" (identical in all cases)
   * - NOT have error.field defined (must be undefined/absent)
   */
  it("returns identical generic error regardless of which field is duplicated", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom("email" as const, "phone" as const, "both" as const),
        async (scenario) => {
          const mockCreate = vi.mocked(prisma.user.create);
          mockCreate.mockRejectedValueOnce(makeP2002Error(scenario));

          const res = await POST(makeRequest(VALID_BODY));
          const json = await res.json();

          // Status must be 409 in all cases
          expect(res.status).toBe(409);

          // Error code must be CONFLICT
          expect(json.error.code).toBe("CONFLICT");

          // Message must be identical regardless of which field caused the conflict
          expect(json.error.message).toBe("Ya existe una cuenta con estos datos");

          // Must NOT reveal which field caused the conflict
          expect(json.error.field).toBeUndefined();

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
