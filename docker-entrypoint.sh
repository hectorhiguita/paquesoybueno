#!/bin/sh
set -e

echo "→ Ejecutando migraciones de Prisma..."
# En standalone, prisma CLI viene del node_modules copiado
./node_modules/.bin/prisma migrate deploy

echo "→ Iniciando aplicacion Next.js..."
exec node server.js
