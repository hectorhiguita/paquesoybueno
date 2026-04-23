/**
 * Integration tests for critical platform flows.
 * Tests the full request/response cycle through actual route handlers with mocked Prisma.
 *
 * Requirements: 1.1–1.9, 3.1–3.7, 5.1–5.6, 8.1–8.7, 9.1–9.7
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Shared UUIDs
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID      = "550e8400-e29b-41d4-a716-446655440002";
const CATEGORY_ID  = "550e8400-e29b-41d4-a716-446655440003";
const VEREDA_ID    = "550e8400-e29b-41d4-a716-446655440004";
const THREAD_ID    = "550e8400-e29b-41d4-a716-446655440005";
const TOOL_ID      = "550e8400-e29b-41d4-a716-446655440006";
const TARGET_USER  = "550e8400-e29b-41d4-a716-446655440007";

// ---------------------------------------------------------------------------
// Mock Prisma (must be before any route imports)
// ---------------------------------------------------------------------------

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    listing: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    message: { create: vi.fn() },
    messageThread: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    reservation: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    notification: { create: vi.fn() },
    report: {
      create: vi.fn(),
      count: vi.fn(),
    },
    vereda: { findFirst: vi.fn() },
    category: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/sms", () => ({
  sendVerificationSms: vi.fn().mockResolvedValue({ success: true }),
}));

// ---------------------------------------------------------------------------
// Route imports (after mocks)
// ---------------------------------------------------------------------------

import { POST as registerPOST } from "@/app/api/v1/auth/register/route";
import { POST as listingsPOST } from "@/app/api/v1/listings/route";
import { POST as messagesPOST } from "@/app/api/v1/messages/route";
import { POST as reservationsPOST } from "@/app/api/v1/tools/[id]/reservations/route";
import { POST as reportsPOST } from "@/app/api/v1/reports/route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  url: string,
  body: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// 1. Registration flow (Requirements 1.1–1.9)
// ---------------------------------------------------------------------------

describe("Integration: Registration flow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST /api/v1/auth/register with valid data → 201", async () => {
    vi.mocked(prisma.user.create).mockResolvedValueOnce({ id: "new-user-id" } as never);

    const req = makeRequest("http://localhost/api/v1/auth/register", {
      name: "María López",
      email: "maria@example.com",
      phone: "3001234567",
      password: "securepass123",
      communityId: COMMUNITY_ID,
    });

    const res = await registerPOST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.userId).toBe("new-user-id");
    expect(json.data.message).toBeTruthy();
  });

  it("returns 400 for invalid email", async () => {
    const req = makeRequest("http://localhost/api/v1/auth/register", {
      name: "María López",
      email: "not-an-email",
      phone: "3001234567",
      password: "securepass123",
      communityId: COMMUNITY_ID,
    });

    const res = await registerPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 on duplicate registration", async () => {
    const { Prisma } = await import("@prisma/client");
    vi.mocked(prisma.user.create).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "5.0.0",
        meta: { target: ["email"] },
      })
    );

    const req = makeRequest("http://localhost/api/v1/auth/register", {
      name: "María López",
      email: "maria@example.com",
      phone: "3001234567",
      password: "securepass123",
      communityId: COMMUNITY_ID,
    });

    const res = await registerPOST(req);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
  });
});

// ---------------------------------------------------------------------------
// 2. Listing creation flow (Requirements 3.1–3.7)
// ---------------------------------------------------------------------------

describe("Integration: Listing creation flow", () => {
  const MOCK_LISTING = {
    id: "listing-id-1",
    communityId: COMMUNITY_ID,
    authorId: USER_ID,
    categoryId: CATEGORY_ID,
    veredaId: VEREDA_ID,
    title: "Servicio de plomería",
    description: "Reparación de tuberías y grifos en general",
    type: "service",
    status: "active",
    priceCop: null,
    tradeDescription: null,
    isFeatured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: USER_ID, name: "Juan Pérez", isVerifiedProvider: false },
    category: { id: CATEGORY_ID, name: "Hogar" },
    vereda: { id: VEREDA_ID, name: "El Placer" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ activeReportCount: 0 } as never);
    vi.mocked(prisma.vereda.findFirst).mockResolvedValue({ id: VEREDA_ID, communityId: COMMUNITY_ID } as never);
    vi.mocked(prisma.category.findFirst).mockResolvedValue({ id: CATEGORY_ID, communityId: COMMUNITY_ID, active: true } as never);
    vi.mocked(prisma.listing.create).mockResolvedValue(MOCK_LISTING as never);
  });

  it("POST /api/v1/listings with valid data → 201", async () => {
    const req = makeRequest(
      "http://localhost/api/v1/listings",
      {
        title: "Servicio de plomería",
        description: "Reparación de tuberías y grifos en general",
        type: "service",
        categoryId: CATEGORY_ID,
        veredaId: VEREDA_ID,
      },
      { "X-Community-ID": COMMUNITY_ID, "X-User-ID": USER_ID }
    );

    const res = await listingsPOST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.listing).toBeDefined();
    expect(json.data.listing.title).toBe("Servicio de plomería");
  });

  it("returns 401 when unauthenticated", async () => {
    const req = makeRequest(
      "http://localhost/api/v1/listings",
      { title: "Test", description: "Test description here", type: "service", categoryId: CATEGORY_ID, veredaId: VEREDA_ID },
      { "X-Community-ID": COMMUNITY_ID }
    );

    const res = await listingsPOST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has 3+ active reports", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ activeReportCount: 3 } as never);

    const req = makeRequest(
      "http://localhost/api/v1/listings",
      {
        title: "Servicio de plomería",
        description: "Reparación de tuberías y grifos en general",
        type: "service",
        categoryId: CATEGORY_ID,
        veredaId: VEREDA_ID,
      },
      { "X-Community-ID": COMMUNITY_ID, "X-User-ID": USER_ID }
    );

    const res = await listingsPOST(req);
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 3. Messaging flow (Requirements 5.1–5.6)
// ---------------------------------------------------------------------------

describe("Integration: Messaging flow", () => {
  const MOCK_THREAD = {
    id: THREAD_ID,
    communityId: COMMUNITY_ID,
    participantA: USER_ID,
    participantB: TARGET_USER,
    lastMessageAt: new Date(),
  };

  const MOCK_MESSAGE = {
    id: "msg-id-1",
    content: "Hola, ¿está disponible?",
    sentAt: new Date(),
    delivered: false,
    sender: { id: USER_ID, name: "Ana García" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findFirst).mockResolvedValue({ status: "active" } as never);
    vi.mocked(prisma.messageThread.findFirst).mockResolvedValue(MOCK_THREAD as never);
    vi.mocked(prisma.messageThread.update).mockResolvedValue(MOCK_THREAD as never);
    vi.mocked(prisma.message.create).mockResolvedValue(MOCK_MESSAGE as never);
  });

  it("POST /api/v1/messages with valid data → 201", async () => {
    const req = makeRequest(
      "http://localhost/api/v1/messages",
      { threadId: THREAD_ID, content: "Hola, ¿está disponible?" },
      { "X-Community-ID": COMMUNITY_ID, "X-User-ID": USER_ID }
    );

    const res = await messagesPOST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.message).toBeDefined();
    expect(json.data.message.content).toBe("Hola, ¿está disponible?");
  });

  it("returns 403 when account is locked", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({ status: "locked" } as never);

    const req = makeRequest(
      "http://localhost/api/v1/messages",
      { threadId: THREAD_ID, content: "Hola" },
      { "X-Community-ID": COMMUNITY_ID, "X-User-ID": USER_ID }
    );

    const res = await messagesPOST(req);
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = makeRequest(
      "http://localhost/api/v1/messages",
      { threadId: THREAD_ID, content: "Hola" },
      { "X-Community-ID": COMMUNITY_ID }
    );

    const res = await messagesPOST(req);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 4. Tool reservation flow (Requirements 8.1–8.7)
// ---------------------------------------------------------------------------

describe("Integration: Tool reservation flow", () => {
  const MOCK_TOOL = { id: TOOL_ID, authorId: TARGET_USER };
  const MOCK_RESERVATION = {
    id: "reservation-id-1",
    communityId: COMMUNITY_ID,
    toolListingId: TOOL_ID,
    requesterId: USER_ID,
    startDate: new Date("2025-02-01"),
    endDate: new Date("2025-02-05"),
    status: "pending",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listing.findFirst).mockResolvedValue(MOCK_TOOL as never);
    vi.mocked(prisma.reservation.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.reservation.create).mockResolvedValue(MOCK_RESERVATION as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);
  });

  it("POST /api/v1/tools/:id/reservations → 201", async () => {
    const req = makeRequest(
      `http://localhost/api/v1/tools/${TOOL_ID}/reservations`,
      { startDate: "2025-02-01", endDate: "2025-02-05" },
      { "X-Community-ID": COMMUNITY_ID, "X-User-ID": USER_ID }
    );

    const res = await reservationsPOST(req, { params: { id: TOOL_ID } });
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.reservation).toBeDefined();
    expect(json.data.reservation.status).toBe("pending");
  });

  it("returns 403 when owner tries to reserve own tool", async () => {
    vi.mocked(prisma.listing.findFirst).mockResolvedValueOnce({ id: TOOL_ID, authorId: USER_ID } as never);

    const req = makeRequest(
      `http://localhost/api/v1/tools/${TOOL_ID}/reservations`,
      { startDate: "2025-02-01", endDate: "2025-02-05" },
      { "X-Community-ID": COMMUNITY_ID, "X-User-ID": USER_ID }
    );

    const res = await reservationsPOST(req, { params: { id: TOOL_ID } });
    expect(res.status).toBe(403);
  });

  it("returns 409 on date conflict", async () => {
    vi.mocked(prisma.reservation.findFirst).mockResolvedValueOnce({ id: "existing" } as never);

    const req = makeRequest(
      `http://localhost/api/v1/tools/${TOOL_ID}/reservations`,
      { startDate: "2025-02-01", endDate: "2025-02-05" },
      { "X-Community-ID": COMMUNITY_ID, "X-User-ID": USER_ID }
    );

    const res = await reservationsPOST(req, { params: { id: TOOL_ID } });
    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// 5. Report flow (Requirements 9.1–9.7)
// ---------------------------------------------------------------------------

describe("Integration: Report flow", () => {
  const MOCK_REPORT = {
    id: "report-id-1",
    communityId: COMMUNITY_ID,
    reporterId: USER_ID,
    targetListingId: null,
    targetUserId: TARGET_USER,
    reason: "Contenido inapropiado en el listing",
    status: "pending",
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.report.create).mockResolvedValue(MOCK_REPORT as never);
    vi.mocked(prisma.report.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);
  });

  it("POST /api/v1/reports → 201", async () => {
    const req = makeRequest(
      "http://localhost/api/v1/reports",
      {
        targetUserId: TARGET_USER,
        reason: "Contenido inapropiado en el listing",
      },
      { "X-Community-ID": COMMUNITY_ID, "X-User-ID": USER_ID }
    );

    const res = await reportsPOST(req);
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.report).toBeDefined();
    expect(json.data.report.status).toBe("pending");
  });

  it("returns 400 when no target is specified", async () => {
    const req = makeRequest(
      "http://localhost/api/v1/reports",
      { reason: "Contenido inapropiado en el listing" },
      { "X-Community-ID": COMMUNITY_ID, "X-User-ID": USER_ID }
    );

    const res = await reportsPOST(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    const req = makeRequest(
      "http://localhost/api/v1/reports",
      { targetUserId: TARGET_USER, reason: "Contenido inapropiado en el listing" },
      { "X-Community-ID": COMMUNITY_ID }
    );

    const res = await reportsPOST(req);
    expect(res.status).toBe(401);
  });

  it("triggers auto-suspension when user reaches 5 reports", async () => {
    vi.mocked(prisma.report.count).mockResolvedValueOnce(5 as never);

    const req = makeRequest(
      "http://localhost/api/v1/reports",
      { targetUserId: TARGET_USER, reason: "Comportamiento abusivo repetido en la plataforma" },
      { "X-Community-ID": COMMUNITY_ID, "X-User-ID": USER_ID }
    );

    const res = await reportsPOST(req);
    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TARGET_USER },
        data: { status: "suspended" },
      })
    );
  });
});
