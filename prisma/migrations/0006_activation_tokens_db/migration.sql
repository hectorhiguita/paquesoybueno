-- Migra los tokens de activación de Map en memoria a la base de datos.
-- Esto corrige la pérdida de tokens al reiniciar el contenedor y la
-- incompatibilidad con múltiples instancias en autoscaling.

CREATE TABLE "activation_tokens" (
    "token"       TEXT        NOT NULL,
    "user_id"     UUID        NOT NULL,
    "email"       TEXT        NOT NULL,
    "community_id" UUID       NOT NULL,
    "expires_at"  TIMESTAMPTZ NOT NULL,
    "used"        BOOLEAN     NOT NULL DEFAULT false,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "activation_tokens_pkey" PRIMARY KEY ("token")
);

CREATE INDEX "activation_tokens_expires_at_idx" ON "activation_tokens"("expires_at");

ALTER TABLE "activation_tokens"
    ADD CONSTRAINT "activation_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
