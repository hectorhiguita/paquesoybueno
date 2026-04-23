import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export interface ApiError {
  error: {
    code: string;
    message: string;
    field?: string;
    requestId: string;
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  field?: string
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(field ? { field } : {}),
        requestId: randomUUID(),
      },
    },
    { status }
  );
}

export const Errors = {
  validation: (message: string, field?: string) =>
    createErrorResponse("VALIDATION_ERROR", message, 400, field),

  unauthorized: (message = "No autorizado") =>
    createErrorResponse("UNAUTHORIZED", message, 401),

  forbidden: (message = "Acción no permitida") =>
    createErrorResponse("FORBIDDEN", message, 403),

  notFound: (message = "Recurso no encontrado") =>
    createErrorResponse("NOT_FOUND", message, 404),

  conflict: (message = "Ya existe un recurso con estos datos") =>
    createErrorResponse("CONFLICT", message, 409),

  tooManyRequests: (message = "Demasiados intentos. Intenta más tarde") =>
    createErrorResponse("TOO_MANY_REQUESTS", message, 429),

  internal: (message = "Error interno del servidor") =>
    createErrorResponse("INTERNAL_ERROR", message, 500),
};
