#!/bin/sh
set -e

# Espera a que PostgreSQL esté disponible antes de migrar
wait_for_db() {
  echo "→ Esperando conexion a la base de datos..."
  MAX_RETRIES=30
  RETRY=0
  until node -e "
    const { Client } = require('pg');
    const c = new Client({ connectionString: process.env.DATABASE_URL });
    c.connect().then(() => { c.end(); process.exit(0); }).catch(() => process.exit(1));
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
}

wait_for_db

echo "→ Ejecutando migraciones de Prisma..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "→ Iniciando aplicacion Next.js..."
exec node server.js
