# PostgreSQL 16 con AWS CLI para backups a S3
# Nota: este contenedor ya no se usa en produccion — se usa RDS.
# Se mantiene solo como referencia.
FROM postgres:16-alpine

RUN apk add --no-cache aws-cli bash

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

EXPOSE 5432
