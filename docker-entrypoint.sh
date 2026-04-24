#!/bin/sh
set -e

# Extrae host y puerto del DATABASE_URL
DB_HOST=$(echo "$DATABASE_URL" | sed 's|.*@\([^:]*\):\([0-9]*\)/.*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed 's|.*@[^:]*:\([0-9]*\)/.*|\1|')

echo "→ Esperando conexion a $DB_HOST:$DB_PORT..."
MAX_RETRIES=30
RETRY=0

until node -e "
  const net = require('net');
  const s = net.createConnection($DB_PORT, '$DB_HOST');
  s.on('connect', () => { s.destroy(); process.exit(0); });
  s.on('error', () => { s.destroy(); process.exit(1); });
  setTimeout(() => { s.destroy(); process.exit(1); }, 2000);
" 2>/dev/null; do
  RETRY=$((RETRY + 1))
  if [ $RETRY -ge $MAX_RETRIES ]; then
    echo "✗ No se pudo conectar a la base de datos despues de $MAX_RETRIES intentos"
    exit 1
  fi
  echo "  Reintento $RETRY/$MAX_RETRIES en 3s..."
  sleep 3
done

echo "✓ Base de datos disponible"
echo "→ Ejecutando migraciones de Prisma..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "→ Iniciando aplicacion Next.js..."
exec node server.js
