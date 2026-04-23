// Feature: santa-elena-platform, Property 3: Contador de intentos fallidos incrementa siempre
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// Mock Prisma before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock password verification
vi.mock("@/lib/auth/password", () => ({
  verifyPassword: vi.fn(),
}));

// Mock email to avoid SMTP calls
vi.mock("@/lib/email", () => ({
  sendAccountLockedEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440000";

const VALID_BODY = {
  email: "juan@example.com",
  password: "wrongpassword",
  communityId: COMMUNITY_ID,
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Property 3: Contador de intentos fallidos incrementa siempre", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
  });

  /**
   * Validates: Requirements 1.6
   *
   * For any starting failedLoginAttempts value N (0–3, to avoid triggering the lock at 5):
   * - prisma.user.update must be called with failedLoginAttempts: N + 1
   * - Response status must be 401
   * - error.message must be "Credenciales inválidas" (generic, never reveals which field)
   */
  it("increments failed attempt counter by exactly 1 and returns generic error", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 3 }),
        async (startingAttempts) => {
          vi.clearAllMocks();
          vi.mocked(prisma.user.update).mockResolvedValue({} as never);

          // Mock a user with the given starting attempt count
          vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
            id: "user-uuid-1",
            email: "juan@example.com",
            name: "Juan García",
            passwordHash: "pbkdf2:aabbcc:ddeeff",
            status: "active",
            failedLoginAttempts: startingAttempts,
            lockedUntil: null,
            communityId: COMMUNITY_ID,
            role: "member",
            isVerifiedProvider: false,
            phoneVerified: true,
          } as never);

          // Mock verifyPassword to return false (invalid credentials)
          vi.mocked(verifyPassword).mockResolvedValueOnce(false);

          const res = await POST(makeRequest(VALID_BODY));
          const json = await res.json();

          // Assert response status is 401
          expect(res.status).toBe(401);

          // Assert error message is generic (never reveals which field is wrong)
          expect(json.error.message).toBe("Credenciales inválidas");

          // Assert prisma.user.update was called with failedLoginAttempts: N + 1
          expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                failedLoginAttempts: startingAttempts + 1,
              }),
            })
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
