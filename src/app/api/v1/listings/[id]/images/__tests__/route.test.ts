import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Prisma and storage before importing the route
vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: vi.fn(),
    },
    listingImage: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/storage", () => ({
  uploadImage: vi.fn().mockResolvedValue({ url: "http://localhost:3000/uploads/test.jpg" }),
}));

import { POST } from "../route";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const LISTING_ID = "550e8400-e29b-41d4-a716-446655440010";
const USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const COMMUNITY_ID = "550e8400-e29b-41d4-a716-446655440001";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

function makeFile(name: string, type: string, size: number): File {
  const content = new Uint8Array(size).fill(0);
  return new File([content], name, { type });
}

function makeFormData(files: File[]): FormData {
  const fd = new FormData();
  for (const f of files) fd.append("images", f);
  return fd;
}

async function makeRequest(
  files: File[],
  headers: Record<string, string> = {}
): Promise<NextRequest> {
  const fd = makeFormData(files);
  return new NextRequest(`http://localhost/api/v1/listings/${LISTING_ID}/images`, {
    method: "POST",
    headers: {
      "X-User-ID": USER_ID,
      "X-Community-ID": COMMUNITY_ID,
      ...headers,
    },
    body: fd,
  });
}

const ROUTE_CONTEXT = { params: Promise.resolve({ id: LISTING_ID }) };

const MOCK_LISTING_NO_IMAGES = {
  id: LISTING_ID,
  images: [],
};

const MOCK_IMAGE_RECORD = {
  id: "img-uuid-1",
  url: "http://localhost:3000/uploads/test.jpg",
  order: 0,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/v1/listings/:id/images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.listing.findUnique).mockResolvedValue(MOCK_LISTING_NO_IMAGES as never);
    vi.mocked(prisma.listingImage.create).mockResolvedValue(MOCK_IMAGE_RECORD as never);
    vi.mocked(uploadImage).mockResolvedValue({ url: "http://localhost:3000/uploads/test.jpg" });
  });

  it("returns 401 when X-User-ID is missing", async () => {
    const req = await makeRequest([makeFile("a.jpg", "image/jpeg", 1024)], { "X-User-ID": "" });
    const res = await POST(req, ROUTE_CONTEXT);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when more than 5 images are uploaded", async () => {
    const files = Array.from({ length: 6 }, (_, i) =>
      makeFile(`img${i}.jpg`, "image/jpeg", 1024)
    );
    const req = await makeRequest(files);
    const res = await POST(req, ROUTE_CONTEXT);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when any image exceeds 5 MB", async () => {
    const files = [makeFile("big.jpg", "image/jpeg", MAX_SIZE + 1)];
    const req = await makeRequest(files);
    const res = await POST(req, ROUTE_CONTEXT);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when any image has invalid MIME type", async () => {
    const files = [makeFile("doc.pdf", "application/pdf", 1024)];
    const req = await makeRequest(files);
    const res = await POST(req, ROUTE_CONTEXT);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when total images would exceed 5 (including existing)", async () => {
    // Listing already has 4 images
    vi.mocked(prisma.listing.findUnique).mockResolvedValueOnce({
      id: LISTING_ID,
      images: [
        { id: "i1" },
        { id: "i2" },
        { id: "i3" },
        { id: "i4" },
      ],
    } as never);
    // Trying to add 2 more → total 6
    const files = [
      makeFile("a.jpg", "image/jpeg", 1024),
      makeFile("b.jpg", "image/jpeg", 1024),
    ];
    const req = await makeRequest(files);
    const res = await POST(req, ROUTE_CONTEXT);
    expect(res.status).toBe(400);
  });

  it("returns 404 when listing does not exist", async () => {
    vi.mocked(prisma.listing.findUnique).mockResolvedValueOnce(null as never);
    const req = await makeRequest([makeFile("a.jpg", "image/jpeg", 1024)]);
    const res = await POST(req, ROUTE_CONTEXT);
    expect(res.status).toBe(404);
  });

  it("returns 201 with image URLs on valid upload (JPEG)", async () => {
    const req = await makeRequest([makeFile("photo.jpg", "image/jpeg", 1024)]);
    const res = await POST(req, ROUTE_CONTEXT);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.images).toHaveLength(1);
    expect(json.data.images[0]).toMatchObject({
      id: expect.any(String),
      url: expect.any(String),
      order: expect.any(Number),
    });
  });

  it("returns 201 with image URLs on valid upload (PNG)", async () => {
    const req = await makeRequest([makeFile("photo.png", "image/png", 2048)]);
    const res = await POST(req, ROUTE_CONTEXT);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.images).toHaveLength(1);
  });

  it("returns 201 when uploading exactly 5 valid images", async () => {
    const files = Array.from({ length: 5 }, (_, i) =>
      makeFile(`img${i}.jpg`, "image/jpeg", 1024)
    );
    vi.mocked(prisma.listingImage.create)
      .mockResolvedValueOnce({ id: "i1", url: "http://localhost:3000/uploads/1.jpg", order: 0 } as never)
      .mockResolvedValueOnce({ id: "i2", url: "http://localhost:3000/uploads/2.jpg", order: 1 } as never)
      .mockResolvedValueOnce({ id: "i3", url: "http://localhost:3000/uploads/3.jpg", order: 2 } as never)
      .mockResolvedValueOnce({ id: "i4", url: "http://localhost:3000/uploads/4.jpg", order: 3 } as never)
      .mockResolvedValueOnce({ id: "i5", url: "http://localhost:3000/uploads/5.jpg", order: 4 } as never);
    const req = await makeRequest(files);
    const res = await POST(req, ROUTE_CONTEXT);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.images).toHaveLength(5);
  });
});
