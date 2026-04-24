#!/bin/sh
set -e

echo "→ Ejecutando migraciones de Prisma..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "→ Iniciando aplicacion Next.js..."
exec node server.js
