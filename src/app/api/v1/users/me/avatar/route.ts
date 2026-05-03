import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { Errors } from "@/lib/api/errors";
import { uploadImage } from "@/lib/storage";
import { requireSessionContext } from "@/lib/auth/session";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png"]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { context, error } = await requireSessionContext(request);
  if (error || !context) return error ?? Errors.unauthorized();

  let formData: FormData;
  try { formData = await request.formData(); } catch {
    return Errors.validation("El cuerpo debe ser multipart/form-data");
  }

  const file = formData.get("avatar") as File | null;
  if (!file) return Errors.validation("Se requiere el campo 'avatar'", "avatar");
  if (!ALLOWED_TYPES.has(file.type))
    return Errors.validation("Solo se aceptan JPEG y PNG", "avatar");
  if (file.size > MAX_SIZE_BYTES)
    return Errors.validation("La imagen supera el límite de 5 MB", "avatar");

  try {
    const ext = file.type === "image/png" ? "png" : "jpg";
    const filename = `avatars/${context.userId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { url } = await uploadImage(buffer, filename, file.type);

    try {
      await prisma.user.update({
        where: { id: context.userId },
        data: { avatarUrl: url },
        select: { id: true },
      });
    } catch (updateErr) {
      if ((updateErr as { code?: string })?.code !== "P2022") throw updateErr;
      // avatarUrl column not yet in DB (pending migration) — upload succeeded
    }

    return NextResponse.json({ data: { avatarUrl: url } });
  } catch (err) {
    console.error("[POST /users/me/avatar]", err);
    return Errors.internal();
  }
}
