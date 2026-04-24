# PostgreSQL 16 con AWS CLI para backups automáticos a S3
FROM postgres:16-alpine

RUN apk add --no-cache aws-cli bash

# Script de backup diario a S3
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Script de inicio que maneja permisos del EFS
COPY docker-entrypoint-postgres.sh /usr/local/bin/docker-entrypoint-postgres.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-postgres.sh

EXPOSE 5432

# Usar el entrypoint oficial de postgres (maneja init correctamente)
# El PGDATA apunta al directorio montado en EFS
ENV PGDATA=/var/lib/postgresql/data
