import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    vereda: { findFirst: vi.fn() },
    category: { findFirst: vi.fn() },
    reservation: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    notification: { create: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { GET, POST } from "../route";
import { POST as POST_RESERVATION } from "../[id]/reservations/route";
import { POST as POST_CLEANUP } from "../cleanup/route";
import { PATCH as PATCH_APPROVE } from "../[id]/reservations/[reservationId]/approve/route";
import { PATCH as PATCH_CANCEL } from "../[id]/reservations/[reservationId]/cancel/route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const OWNER_ID = "550e8400-e29b-41d4-a716-446655440003";
const CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440004";
const VEREDA_ID = "550e8400-e29b-41d4-a716-446655440005";
const TOOL_ID = "550e8400-e29b-41d4-a716-446655440010";
const RESERVATION_ID = "550e8400-e29b-41d4-a716-446655440020";

const MOCK_TOOL = {
  id: TOOL_ID,
  communityId: COMMUNITY_ID,
  authorId: OWNER_ID,
  categoryId: CATEGORY_ID,
  veredaId: VEREDA_ID,
  title: "Taladro eléctrico",
  description: "Taladro de 500W en buen estado",
  type: "tool",
  status: "active",
  tradeDescription: "Bueno",
  isFeatured: false,
  completedJobs: 0,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
  author: { id: OWNER_ID, name: "Carlos López", isVerifiedProvider: false, phone: "3009876543" },
  category: { id: CATEGORY_ID, name: "Herramientas" },
  vereda: { id: VEREDA_ID, name: "El Placer" },
  reservations: [],
};

const MOCK_RESERVATION = {
  id: RESERVATION_ID,
  communityId: COMMUNITY_ID,
  toolListingId: TOOL_ID,
  requesterId: USER_ID,
  startDate: new Date("2025-06-10"),
  endDate: new Date("2025-06-12"),
  status: "pending",
  requestedAt: new Date(),
  respondedAt: null,
};

const MOCK_VEREDA = { id: VEREDA_ID, communityId: COMMUNITY_ID, name: "El Placer" };
const MOCK_CATEGORY = { id: CATEGORY_ID, communityId: COMMUNITY_ID, name: "Herramientas", active: true };

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost/api/v1/tools", {
    headers: { "X-Community-ID": COMMUNITY_ID },
  });
}

function makePostToolRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/tools", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-ID": COMMUNITY_ID,
      "X-User-ID": USER_ID,
    },
    body: JSON.stringify(body),
  });
}

function makePostReservationRequest(body: unknown, userId = USER_ID): NextRequest {
  return new NextRequest(`http://localhost/api/v1/tools/${TOOL_ID}/reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Community-ID": COMMUNITY_ID,
      "X-User-ID": userId,
    },
    body: JSON.stringify(body),
  });
}

const VALID_TOOL_BODY = {
  title: "Taladro eléctrico",
  description: "Taladro de 500W en buen estado para préstamo",
  condition: "Bueno",
  veredaId: VEREDA_ID,
  categoryId: CATEGORY_ID,
};

const VALID_RESERVATION_BODY = {
  startDate: "2025-06-10",
  endDate: "2025-06-12",
};

// ---------------------------------------------------------------------------
// GET /api/v1/tools
// ---------------------------------------------------------------------------

describe("GET /api/v1/tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listing.findMany).mockResolvedValue([MOCK_TOOL] as never);
  });

  it("returns 200 with tools list", async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.tools).toHaveLength(1);
    expect(json.data.tools[0].title).toBe("Taladro eléctrico");
  });

  it("exposes condition from tradeDescription", async () => {
    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.data.tools[0].condition).toBe("Bueno");
  });

  it("exposes blockedDates from reservations", async () => {
    const toolWithReservation = {
      ...MOCK_TOOL,
      reservations: [{ startDate: new Date("2025-06-10"), endDate: new Date("2025-06-12"), status: "pending" }],
    };
    vi.mocked(prisma.listing.findMany).mockResolvedValueOnce([toolWithReservation] as never);
    const res = await GET(makeGetRequest());
    const json = await res.json();
    expect(json.data.tools[0].blockedDates).toHaveLength(1);
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/tools");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.listing.findMany).mockRejectedValueOnce(new Error("DB error"));
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/tools
// ---------------------------------------------------------------------------

describe("POST /api/v1/tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.vereda.findFirst).mockResolvedValue(MOCK_VEREDA as never);
    vi.mocked(prisma.category.findFirst).mockResolvedValue(MOCK_CATEGORY as never);
    vi.mocked(prisma.listing.create).mockResolvedValue(MOCK_TOOL as never);
  });

  it("returns 201 with created tool on valid input", async () => {
    const res = await POST(makePostToolRequest(VALID_TOOL_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.tool).toBeDefined();
  });

  it("returns 400 when title is missing", async () => {
    const { title: _t, ...body } = VALID_TOOL_BODY;
    const res = await POST(makePostToolRequest(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when description is missing", async () => {
    const { description: _d, ...body } = VALID_TOOL_BODY;
    const res = await POST(makePostToolRequest(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when condition is missing", async () => {
    const { condition: _c, ...body } = VALID_TOOL_BODY;
    const res = await POST(makePostToolRequest(body));
    expect(res.status).toBe(400);
  });

  it("returns 400 when condition is invalid", async () => {
    const res = await POST(makePostToolRequest({ ...VALID_TOOL_BODY, condition: "Perfecto" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts all valid conditions", async () => {
    for (const condition of ["Bueno", "Regular", "Necesita reparación"]) {
      vi.mocked(prisma.listing.create).mockResolvedValueOnce({ ...MOCK_TOOL, tradeDescription: condition } as never);
      const res = await POST(makePostToolRequest({ ...VALID_TOOL_BODY, condition }));
      expect(res.status).toBe(201);
    }
  });

  it("returns 400 when veredaId is missing", async () => {
    const { veredaId: _v, ...body } = VALID_TOOL_BODY;
    const res = await POST(makePostToolRequest(body));
    expect(res.status).toBe(400);
  });

  it("returns 401 when X-User-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Community-ID": COMMUNITY_ID },
      body: JSON.stringify(VALID_TOOL_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when veredaId does not belong to community", async () => {
    vi.mocked(prisma.vereda.findFirst).mockResolvedValueOnce(null as never);
    const res = await POST(makePostToolRequest(VALID_TOOL_BODY));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.field).toBe("veredaId");
  });

  it("stores condition in tradeDescription field", async () => {
    await POST(makePostToolRequest(VALID_TOOL_BODY));
    expect(vi.mocked(prisma.listing.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tradeDescription: "Bueno", type: "tool" }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/tools/:id/reservations
// ---------------------------------------------------------------------------

describe("POST /api/v1/tools/:id/reservations", () => {
  const PARAMS = { params: { id: TOOL_ID } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listing.findFirst).mockResolvedValue({ id: TOOL_ID, authorId: OWNER_ID } as never);
    vi.mocked(prisma.reservation.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.reservation.create).mockResolvedValue(MOCK_RESERVATION as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);
  });

  it("returns 201 with created reservation on valid input", async () => {
    const res = await POST_RESERVATION(makePostReservationRequest(VALID_RESERVATION_BODY), PARAMS);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.reservation).toBeDefined();
  });

  it("returns 401 when X-User-ID header is missing", async () => {
    const req = new NextRequest(`http://localhost/api/v1/tools/${TOOL_ID}/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Community-ID": COMMUNITY_ID },
      body: JSON.stringify(VALID_RESERVATION_BODY),
    });
    const res = await POST_RESERVATION(req, PARAMS);
    expect(res.status).toBe(401);
  });

  it("returns 400 when startDate is missing", async () => {
    const res = await POST_RESERVATION(makePostReservationRequest({ endDate: "2025-06-12" }), PARAMS);
    expect(res.status).toBe(400);
  });

  it("returns 400 when endDate is before startDate", async () => {
    const res = await POST_RESERVATION(
      makePostReservationRequest({ startDate: "2025-06-12", endDate: "2025-06-10" }),
      PARAMS
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when tool not found", async () => {
    vi.mocked(prisma.listing.findFirst).mockResolvedValueOnce(null as never);
    const res = await POST_RESERVATION(makePostReservationRequest(VALID_RESERVATION_BODY), PARAMS);
    expect(res.status).toBe(404);
  });

  it("returns 403 when owner tries to reserve their own tool", async () => {
    const res = await POST_RESERVATION(
      makePostReservationRequest(VALID_RESERVATION_BODY, OWNER_ID),
      PARAMS
    );
    expect(res.status).toBe(403);
  });

  it("returns 409 when dates conflict with existing reservation", async () => {
    vi.mocked(prisma.reservation.findFirst).mockResolvedValueOnce(MOCK_RESERVATION as never);
    const res = await POST_RESERVATION(makePostReservationRequest(VALID_RESERVATION_BODY), PARAMS);
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe("CONFLICT");
  });

  it("creates reservation with status pending", async () => {
    await POST_RESERVATION(makePostReservationRequest(VALID_RESERVATION_BODY), PARAMS);
    expect(vi.mocked(prisma.reservation.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "pending" }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/tools/cleanup (task 9.2)
// ---------------------------------------------------------------------------

describe("POST /api/v1/tools/cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.reservation.findMany).mockResolvedValue([MOCK_RESERVATION] as never);
    vi.mocked(prisma.reservation.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);
  });

  function makeCleanupRequest(): NextRequest {
    return new NextRequest("http://localhost/api/v1/tools/cleanup", {
      method: "POST",
      headers: { "X-Cron-Secret": process.env.CRON_SECRET ?? "" },
    });
  }

  it("returns 200 with count of cancelled reservations", async () => {
    const res = await POST_CLEANUP(makeCleanupRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.cancelled).toBe(1);
  });

  it("returns 200 with 0 when no expired reservations", async () => {
    vi.mocked(prisma.reservation.findMany).mockResolvedValueOnce([] as never);
    const res = await POST_CLEANUP(makeCleanupRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.cancelled).toBe(0);
  });

  it("queries only pending reservations older than 48 hours", async () => {
    await POST_CLEANUP(makeCleanupRequest());
    expect(vi.mocked(prisma.reservation.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "pending" }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/tools/:id/reservations/:reservationId/approve (task 9.1)
// ---------------------------------------------------------------------------

describe("PATCH /api/v1/tools/:id/reservations/:reservationId/approve", () => {
  const PARAMS = { params: { id: TOOL_ID, reservationId: RESERVATION_ID } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listing.findFirst).mockResolvedValue({ id: TOOL_ID, authorId: OWNER_ID } as never);
    vi.mocked(prisma.reservation.findFirst).mockResolvedValue(MOCK_RESERVATION as never);
    vi.mocked(prisma.reservation.update).mockResolvedValue({ ...MOCK_RESERVATION, status: "confirmed" } as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);
  });

  function makeApproveRequest(userId = OWNER_ID): NextRequest {
    return new NextRequest(
      `http://localhost/api/v1/tools/${TOOL_ID}/reservations/${RESERVATION_ID}/approve`,
      {
        method: "PATCH",
        headers: { "X-Community-ID": COMMUNITY_ID, "X-User-ID": userId },
      }
    );
  }

  it("returns 200 with confirmed reservation", async () => {
    const res = await PATCH_APPROVE(makeApproveRequest(), PARAMS);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.reservation.status).toBe("confirmed");
  });

  it("returns 403 when non-owner tries to approve", async () => {
    const res = await PATCH_APPROVE(makeApproveRequest(USER_ID), PARAMS);
    expect(res.status).toBe(403);
  });

  it("returns 404 when tool not found", async () => {
    vi.mocked(prisma.listing.findFirst).mockResolvedValueOnce(null as never);
    const res = await PATCH_APPROVE(makeApproveRequest(), PARAMS);
    expect(res.status).toBe(404);
  });

  it("returns 404 when reservation not found", async () => {
    vi.mocked(prisma.reservation.findFirst).mockResolvedValueOnce(null as never);
    const res = await PATCH_APPROVE(makeApproveRequest(), PARAMS);
    expect(res.status).toBe(404);
  });

  it("returns 400 when reservation is not pending", async () => {
    vi.mocked(prisma.reservation.findFirst).mockResolvedValueOnce(
      { ...MOCK_RESERVATION, status: "confirmed" } as never
    );
    const res = await PATCH_APPROVE(makeApproveRequest(), PARAMS);
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/tools/:id/reservations/:reservationId/cancel (task 9.3)
// ---------------------------------------------------------------------------

describe("PATCH /api/v1/tools/:id/reservations/:reservationId/cancel", () => {
  const PARAMS = { params: { id: TOOL_ID, reservationId: RESERVATION_ID } };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.reservation.update).mockResolvedValue({ ...MOCK_RESERVATION, status: "cancelled" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ verificationReason: null } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
  });

  function makeCancelRequest(userId = USER_ID): NextRequest {
    return new NextRequest(
      `http://localhost/api/v1/tools/${TOOL_ID}/reservations/${RESERVATION_ID}/cancel`,
      {
        method: "PATCH",
        headers: { "X-Community-ID": COMMUNITY_ID, "X-User-ID": userId },
      }
    );
  }

  it("returns 200 with cancelled reservation", async () => {
    // startDate far in the future — not a late cancellation
    vi.mocked(prisma.reservation.findFirst).mockResolvedValueOnce({
      ...MOCK_RESERVATION,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    } as never);
    const res = await PATCH_CANCEL(makeCancelRequest(), PARAMS);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.reservation.status).toBe("cancelled");
    expect(json.data.lateCancellation).toBe(false);
  });

  it("marks lateCancellation=true when within 24 hours of startDate", async () => {
    vi.mocked(prisma.reservation.findFirst).mockResolvedValueOnce({
      ...MOCK_RESERVATION,
      startDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    } as never);
    const res = await PATCH_CANCEL(makeCancelRequest(), PARAMS);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.lateCancellation).toBe(true);
  });

  it("returns 403 when non-requester tries to cancel", async () => {
    vi.mocked(prisma.reservation.findFirst).mockResolvedValueOnce({
      ...MOCK_RESERVATION,
      requesterId: OWNER_ID,
    } as never);
    const res = await PATCH_CANCEL(makeCancelRequest(USER_ID), PARAMS);
    expect(res.status).toBe(403);
  });

  it("returns 404 when reservation not found", async () => {
    vi.mocked(prisma.reservation.findFirst).mockResolvedValueOnce(null as never);
    const res = await PATCH_CANCEL(makeCancelRequest(), PARAMS);
    expect(res.status).toBe(404);
  });

  it("returns 400 when reservation is already cancelled", async () => {
    vi.mocked(prisma.reservation.findFirst).mockResolvedValueOnce({
      ...MOCK_RESERVATION,
      status: "cancelled",
    } as never);
    const res = await PATCH_CANCEL(makeCancelRequest(), PARAMS);
    expect(res.status).toBe(400);
  });
});
