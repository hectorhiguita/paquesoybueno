CREATE TABLE "verification_codes" (
    "phone"        TEXT        NOT NULL,
    "community_id" TEXT        NOT NULL,
    "code"         TEXT        NOT NULL,
    "expires_at"   TIMESTAMPTZ NOT NULL,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("phone", "community_id")
);

CREATE INDEX "verification_codes_expires_at_idx" ON "verification_codes"("expires_at");
