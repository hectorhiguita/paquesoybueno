import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing routes
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { GET } from "../route";
import { PATCH } from "../[id]/read/route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const NOTIF_ID = "550e8400-e29b-41d4-a716-446655440010";

const MOCK_NOTIFICATION = {
  id: NOTIF_ID,
  type: "new_message",
  payload: { threadId: "550e8400-e29b-41d4-a716-446655440004" },
  read: false,
  createdAt: new Date("2024-06-01T10:00:00Z"),
  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
};

const MOCK_NOTIFICATION_READ = { ...MOCK_NOTIFICATION, read: true };

// ---------------------------------------------------------------------------
// GET /api/v1/notifications
// ---------------------------------------------------------------------------

describe("GET /api/v1/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.notification.findMany).mockResolvedValue([MOCK_NOTIFICATION] as never);
  });

  function makeRequest(params: Record<string, string> = {}, headers: Record<string, string> = {}): NextRequest {
    const url = new URL("http://localhost/api/v1/notifications");
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return new NextRequest(url.toString(), {
      headers: {
        "X-Community-ID": COMMUNITY_ID,
        "X-User-ID": USER_ID,
        ...headers,
      },
    });
  }

  it("returns 200 with notifications ordered by createdAt desc", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.notifications).toHaveLength(1);
    expect(json.data.total).toBe(1);
  });

  it("queries with orderBy createdAt desc", async () => {
    await GET(makeRequest());
    expect(vi.mocked(prisma.notification.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("filters by read=false when query param provided", async () => {
    await GET(makeRequest({ read: "false" }));
    expect(vi.mocked(prisma.notification.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ read: false }),
      })
    );
  });

  it("filters by read=true when query param provided", async () => {
    await GET(makeRequest({ read: "true" }));
    expect(vi.mocked(prisma.notification.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ read: true }),
      })
    );
  });

  it("returns all notifications when read param is not provided", async () => {
    await GET(makeRequest());
    const call = vi.mocked(prisma.notification.findMany).mock.calls[0][0] as { where: Record<string, unknown> };
    expect(call.where).not.toHaveProperty("read");
  });

  it("returns 400 for invalid read param value", async () => {
    const res = await GET(makeRequest({ read: "maybe" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when X-User-ID header is missing", async () => {
    const res = await GET(makeRequest({}, { "X-User-ID": "" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const res = await GET(makeRequest({}, { "X-Community-ID": "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("filters out expired notifications (expiresAt > now)", async () => {
    await GET(makeRequest());
    const call = vi.mocked(prisma.notification.findMany).mock.calls[0][0] as { where: Record<string, unknown> };
    expect(call.where).toHaveProperty("expiresAt");
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.notification.findMany).mockRejectedValueOnce(new Error("DB error"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/notifications/:id/read
// ---------------------------------------------------------------------------

describe("PATCH /api/v1/notifications/:id/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(MOCK_NOTIFICATION as never);
    vi.mocked(prisma.notification.update).mockResolvedValue(MOCK_NOTIFICATION_READ as never);
  });

  function makeRequest(id: string, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest(`http://localhost/api/v1/notifications/${id}/read`, {
      method: "PATCH",
      headers: {
        "X-Community-ID": COMMUNITY_ID,
        "X-User-ID": USER_ID,
        ...headers,
      },
    });
  }

  it("returns 200 with updated notification marked as read", async () => {
    const res = await PATCH(makeRequest(NOTIF_ID), { params: { id: NOTIF_ID } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.notification.read).toBe(true);
  });

  it("returns 404 when notification not found", async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce(null as never);
    const res = await PATCH(makeRequest(NOTIF_ID), { params: { id: NOTIF_ID } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when notification belongs to different user", async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValueOnce(null as never);
    const res = await PATCH(makeRequest(NOTIF_ID), { params: { id: NOTIF_ID } });
    expect(res.status).toBe(404);
  });

  it("returns 401 when X-User-ID header is missing", async () => {
    const res = await PATCH(makeRequest(NOTIF_ID, { "X-User-ID": "" }), { params: { id: NOTIF_ID } });
    expect(res.status).toBe(401);
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const res = await PATCH(makeRequest(NOTIF_ID, { "X-Community-ID": "" }), { params: { id: NOTIF_ID } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for invalid notification ID (not UUID)", async () => {
    const res = await PATCH(makeRequest("not-a-uuid"), { params: { id: "not-a-uuid" } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("queries notification scoped to userId and communityId", async () => {
    await PATCH(makeRequest(NOTIF_ID), { params: { id: NOTIF_ID } });
    expect(vi.mocked(prisma.notification.findFirst)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: NOTIF_ID, userId: USER_ID, communityId: COMMUNITY_ID },
      })
    );
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.notification.findFirst).mockRejectedValueOnce(new Error("DB error"));
    const res = await PATCH(makeRequest(NOTIF_ID), { params: { id: NOTIF_ID } });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});
