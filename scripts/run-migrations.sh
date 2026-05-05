#!/bin/sh
set -e

PRISMA="node ./node_modules/prisma/build/index.js"

# ── Baseline ───────────────────────────────────────────────────────────────────
# La BD de producción fue creada con prisma db push, no con migrate deploy.
# Esto marca las migraciones de esquema ya aplicadas sin intentar re-ejecutarlas.
# Si ya están registradas en _prisma_migrations, el comando falla silenciosamente.
echo "→ Aplicando baseline de migraciones históricas..."
for name in \
  "0001_init" \
  "0002_seed_base" \
  "0003_rls_policies" \
  "0004_seed_admin_user" \
  "0005_tool_rental_pricing" \
  "0005_update_vereda_catalog" \
  "0006_activation_tokens_db" \
  "0007_verification_codes_db" \
  "0008_user_profile_fields" \
  "0009_ensure_admin_hahiguit" \
  "0010_nullable_phone"; do
  $PRISMA migrate resolve --applied "$name" 2>/dev/null \
    && echo "  ✓ baseline: $name" \
    || echo "  · ya registrada: $name"
done

# ── Deploy ─────────────────────────────────────────────────────────────────────
# Solo aplicará las migraciones nuevas (0011+) que no estén en _prisma_migrations.
echo "→ Desplegando migraciones pendientes..."
$PRISMA migrate deploy
