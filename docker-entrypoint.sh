#!/bin/sh
set -e

# Si se pasaron argumentos (ej: task de migración en ECS), los ejecuta directamente.
if [ $# -gt 0 ]; then
  exec "$@"
fi

echo "→ Iniciando aplicacion Next.js..."
exec node server.js
