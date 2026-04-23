# PostgreSQL 16 con AWS CLI para backups automáticos a S3
FROM postgres:16-alpine

RUN apk add --no-cache aws-cli bash

# Script de backup diario a S3
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Cron para backup diario a las 2am UTC
RUN echo "0 2 * * * /usr/local/bin/backup.sh >> /var/log/pg_backup.log 2>&1" \
    | crontab -

EXPOSE 5432
