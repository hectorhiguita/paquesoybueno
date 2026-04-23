/**
 * POST /api/v1/listings/:id/images
 * Upload up to 5 images (JPEG/PNG, ≤5 MB each) for a listing.
 *
 * Requirements: 3.4
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { uploadImage } from "@/lib/storage";

const MAX_IMAGES = 5;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id: listingId } = await context.params;

  // Auth
  const userId = request.headers.get("X-User-ID");
  if (!userId) {
    return Errors.unauthorized("Se requiere autenticación");
  }

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Errors.validation("El cuerpo debe ser multipart/form-data");
  }

  const files = formData.getAll("images") as File[];

  // Validate file count
  if (files.length === 0) {
    return Errors.validation("Se requiere al menos una imagen");
  }

  if (files.length > MAX_IMAGES) {
    return Errors.validation(
      `Se permiten máximo ${MAX_IMAGES} imágenes por publicación`
    );
  }

  // Validate each file
  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return Errors.validation(
        `Formato no permitido: ${file.type}. Solo se aceptan JPEG y PNG`,
        "images"
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return Errors.validation(
        `La imagen "${file.name}" supera el tamaño máximo de 5 MB`,
        "images"
      );
    }
  }

  // Verify listing exists
  let listing: { id: string; images: { id: string }[] } | null;
  try {
    listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, images: { select: { id: true } } },
    });
  } catch (err) {
    console.error("[POST /listings/:id/images] DB error:", err);
    return Errors.internal();
  }

  if (!listing) {
    return Errors.notFound("Listing no encontrado");
  }

  // Validate total count including existing images
  const totalCount = listing.images.length + files.length;
  if (totalCount > MAX_IMAGES) {
    return Errors.validation(
      `El listing ya tiene ${listing.images.length} imagen(es). No se pueden agregar ${files.length} más (máximo ${MAX_IMAGES} en total)`
    );
  }

  // Upload each file and create DB records
  const startOrder = listing.images.length;
  const createdImages: { id: string; url: string; order: number }[] = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.type === "image/png" ? "png" : "jpg";
      const filename = `listings/${listingId}/${randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { url } = await uploadImage(buffer, filename, file.type);

      const image = await prisma.listingImage.create({
        data: {
          listingId,
          url,
          order: startOrder + i,
        },
        select: { id: true, url: true, order: true },
      });

      createdImages.push(image);
    }
  } catch (err) {
    console.error("[POST /listings/:id/images] Upload/DB error:", err);
    return Errors.internal();
  }

  return NextResponse.json(
    { data: { images: createdImages } },
    { status: 201 }
  );
}
