import { z } from "zod";

/**
 * Colombian phone number: starts with +57 or 57, followed by 10 digits
 * Mobile numbers start with 3xx
 */
export const colombianPhoneSchema = z
  .string()
  .regex(
    /^(\+57|57)?3\d{9}$/,
    "Número de teléfono colombiano inválido. Debe ser un número móvil de 10 dígitos (ej: 3001234567)"
  );

/**
 * Email RFC 5322 compliant (via Zod's built-in email validator)
 */
export const emailSchema = z
  .string()
  .email("Correo electrónico inválido");

export const registerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  email: emailSchema,
  phone: colombianPhoneSchema,
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100),
  communityId: z.string().uuid("ID de comunidad inválido"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es requerida"),
  communityId: z.string().uuid("ID de comunidad inválido"),
});

export const verifyCodeSchema = z.object({
  phone: colombianPhoneSchema,
  code: z.string().length(6, "El código debe tener 6 dígitos"),
  communityId: z.string().uuid("ID de comunidad inválido"),
});

export const resetPasswordRequestSchema = z.object({
  email: emailSchema,
  communityId: z.string().uuid("ID de comunidad inválido"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
