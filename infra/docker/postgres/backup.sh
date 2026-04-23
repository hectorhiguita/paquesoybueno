#!/bin/bash
# Backup diario de PostgreSQL a S3
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/santa_elena_${TIMESTAMP}.sql.gz"
S3_BUCKET="${AWS_BACKUPS_BUCKET:-santa-elena-db-backups-prod}"
S3_KEY="backups/daily/santa_elena_${TIMESTAMP}.sql.gz"

echo "[$(date)] Iniciando backup de PostgreSQL..."

# Dump comprimido
PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h localhost \
  -U postgres \
  -d santa_elena \
  --no-owner \
  --no-acl \
  | gzip > "${BACKUP_FILE}"

echo "[$(date)] Dump completado: ${BACKUP_FILE}"

# Subir a S3
aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/${S3_KEY}" \
  --storage-class STANDARD_IA

echo "[$(date)] Backup subido a s3://${S3_BUCKET}/${S3_KEY}"

# Limpiar archivo temporal
rm -f "${BACKUP_FILE}"

echo "[$(date)] Backup completado exitosamente."
