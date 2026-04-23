import { z } from "zod";

export const listingTypeSchema = z.enum(["service", "sale", "rent", "trade", "tool"]);
export const listingStatusSchema = z.enum(["active", "inactive", "flagged", "pending_review"]);

export const createListingSchema = z.object({
  title: z
    .string()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(200, "El título no puede superar 200 caracteres"),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(2000, "La descripción no puede superar 2000 caracteres"),
  type: listingTypeSchema,
  veredaId: z.string().uuid("Vereda inválida"),
  categoryId: z.string().uuid("Categoría inválida"),
  communityId: z.string().uuid("ID de comunidad inválido"),
  // Optional: price in COP for sale/rent (Req 3.2)
  priceCop: z.number().positive("El precio debe ser positivo").optional(),
  // Optional: desired exchange description for trade (Req 3.3)
  tradeDescription: z.string().max(500, "La descripción de trueque no puede superar 500 caracteres").optional(),
});

export const updateListingSchema = createListingSchema
  .partial()
  .omit({ communityId: true })
  .extend({
    status: listingStatusSchema.optional(),
  });

export const listingFiltersSchema = z.object({
  categoryId: z.string().uuid().optional(),
  veredaId: z.string().uuid().optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  available: z.coerce.boolean().optional(),
  type: listingTypeSchema.optional(),
  status: listingStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type ListingFilters = z.infer<typeof listingFiltersSchema>;
