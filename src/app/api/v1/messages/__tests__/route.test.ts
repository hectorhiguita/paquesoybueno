import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma before importing routes
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    messageThread: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET as getThread } from "../[threadId]/route";
import { POST } from "../route";
import { GET as getStream } from "../stream/route";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";
const USER_A = "550e8400-e29b-41d4-a716-446655440002";
const USER_B = "550e8400-e29b-41d4-a716-446655440003";
const THREAD_ID = "550e8400-e29b-41d4-a716-446655440004";

const MOCK_THREAD = {
  id: THREAD_ID,
  communityId: COMMUNITY_ID,
  participantA: USER_A,
  participantB: USER_B,
  lastMessageAt: new Date(),
};

const MOCK_MESSAGE = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  content: "Hola, ¿está disponible?",
  sentAt: new Date("2024-01-01T10:00:00Z"),
  delivered: false,
  sender: { id: USER_A, name: "Ana García" },
};

const MOCK_USER_ACTIVE = { status: "active" };
const MOCK_USER_LOCKED = { status: "locked" };
const MOCK_USER_UNDER_REVIEW = { status: "under_review" };

// ---------------------------------------------------------------------------
// GET /api/v1/messages/:threadId
// ---------------------------------------------------------------------------

describe("GET /api/v1/messages/:threadId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.messageThread.findFirst).mockResolvedValue(MOCK_THREAD as never);
    vi.mocked(prisma.message.findMany).mockResolvedValue([MOCK_MESSAGE] as never);
  });

  function makeRequest(threadId: string, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest(`http://localhost/api/v1/messages/${threadId}`, {
      headers: {
        "X-Community-ID": COMMUNITY_ID,
        "X-User-ID": USER_A,
        ...headers,
      },
    });
  }

  it("returns 200 with messages ordered by sent_at asc", async () => {
    const req = makeRequest(THREAD_ID);
    const res = await getThread(req, { params: { threadId: THREAD_ID } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.messages).toHaveLength(1);
    expect(json.data.messages[0].content).toBe("Hola, ¿está disponible?");
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const req = new NextRequest(`http://localhost/api/v1/messages/${THREAD_ID}`, {
      headers: { "X-User-ID": USER_A },
    });
    const res = await getThread(req, { params: { threadId: THREAD_ID } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when X-User-ID header is missing", async () => {
    const req = new NextRequest(`http://localhost/api/v1/messages/${THREAD_ID}`, {
      headers: { "X-Community-ID": COMMUNITY_ID },
    });
    const res = await getThread(req, { params: { threadId: THREAD_ID } });
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a participant in the thread", async () => {
    vi.mocked(prisma.messageThread.findFirst).mockResolvedValueOnce(null as never);
    const req = makeRequest(THREAD_ID);
    const res = await getThread(req, { params: { threadId: THREAD_ID } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 for invalid threadId (not UUID)", async () => {
    const req = makeRequest("not-a-uuid");
    const res = await getThread(req, { params: { threadId: "not-a-uuid" } });
    expect(res.status).toBe(400);
  });

  it("queries messages ordered by sentAt asc", async () => {
    const req = makeRequest(THREAD_ID);
    await getThread(req, { params: { threadId: THREAD_ID } });
    expect(vi.mocked(prisma.message.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { sentAt: "asc" },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/messages
// ---------------------------------------------------------------------------

describe("POST /api/v1/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findFirst).mockResolvedValue(MOCK_USER_ACTIVE as never);
    vi.mocked(prisma.messageThread.findFirst).mockResolvedValue(MOCK_THREAD as never);
    vi.mocked(prisma.messageThread.update).mockResolvedValue(MOCK_THREAD as never);
    vi.mocked(prisma.message.create).mockResolvedValue(MOCK_MESSAGE as never);
  });

  function makeRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
    return new NextRequest("http://localhost/api/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Community-ID": COMMUNITY_ID,
        "X-User-ID": USER_A,
        ...headers,
      },
      body: JSON.stringify(body),
    });
  }

  const VALID_BODY = { threadId: THREAD_ID, content: "Hola, ¿está disponible?" };

  it("returns 201 with created message on valid input", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.message).toBeDefined();
  });

  it("creates message with delivered: false initially (Req 5.3)", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(vi.mocked(prisma.message.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          delivered: false,
          communityId: COMMUNITY_ID,
          senderId: USER_A,
          threadId: THREAD_ID,
        }),
      })
    );
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-ID": USER_A },
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when X-User-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Community-ID": COMMUNITY_ID },
      body: JSON.stringify(VALID_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when threadId is missing", async () => {
    const res = await POST(makeRequest({ content: "Hola" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when content is empty", async () => {
    const res = await POST(makeRequest({ threadId: THREAD_ID, content: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when content exceeds 2000 characters", async () => {
    const res = await POST(makeRequest({ threadId: THREAD_ID, content: "a".repeat(2001) }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts content of exactly 2000 characters", async () => {
    const res = await POST(makeRequest({ threadId: THREAD_ID, content: "a".repeat(2000) }));
    expect(res.status).toBe(201);
  });

  it("returns 403 when sender account is locked (Req 5.6)", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER_LOCKED as never);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
    expect(json.error.message).toContain("restringida");
  });

  it("returns 403 when sender account is under_review (Req 5.6)", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(MOCK_USER_UNDER_REVIEW as never);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("FORBIDDEN");
    expect(json.error.message).toContain("restringida");
  });

  it("returns 403 when user is not a participant in the thread", async () => {
    vi.mocked(prisma.messageThread.findFirst).mockResolvedValueOnce(null as never);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 400 for non-JSON body", async () => {
    const req = new NextRequest("http://localhost/api/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Community-ID": COMMUNITY_ID,
        "X-User-ID": USER_A,
      },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on database error", async () => {
    vi.mocked(prisma.user.findFirst).mockRejectedValueOnce(new Error("DB error"));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/messages/stream (SSE)
// ---------------------------------------------------------------------------

describe("GET /api/v1/messages/stream", () => {
  function makeRequest(headers: Record<string, string> = {}): NextRequest {
    return new NextRequest("http://localhost/api/v1/messages/stream", {
      headers: {
        "X-Community-ID": COMMUNITY_ID,
        "X-User-ID": USER_A,
        ...headers,
      },
    });
  }

  it("returns 200 with text/event-stream content-type", async () => {
    const req = makeRequest();
    const res = await getStream(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  });

  it("returns 400 when X-Community-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/messages/stream", {
      headers: { "X-User-ID": USER_A },
    });
    const res = await getStream(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when X-User-ID header is missing", async () => {
    const req = new NextRequest("http://localhost/api/v1/messages/stream", {
      headers: { "X-Community-ID": COMMUNITY_ID },
    });
    const res = await getStream(req);
    expect(res.status).toBe(401);
  });

  it("response body is a ReadableStream", async () => {
    const req = makeRequest();
    const res = await getStream(req);
    expect(res.body).toBeInstanceOf(ReadableStream);
  });
});
