import { z } from "zod";

export const createRatingSchema = z.object({
  providerId: z.string().uuid("ID de proveedor inválido"),
  listingId: z.string().uuid("ID de anuncio inválido").optional(),
  stars: z.number().int().min(1, "La calificación mínima es 1").max(5, "La calificación máxima es 5"),
  comment: z.string().max(500, "El comentario no puede superar los 500 caracteres").optional(),
  communityId: z.string().uuid("ID de comunidad inválido"),
});

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
