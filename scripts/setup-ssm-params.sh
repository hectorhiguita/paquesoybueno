#!/usr/bin/env bash
# =============================================================================
# setup-ssm-params.sh
#
# Crea (o actualiza) todos los parámetros de la aplicación en SSM Parameter
# Store. Ejecutar UNA SOLA VEZ antes del primer terraform apply, y cada vez
# que necesites rotar un secreto.
#
# Uso:
#   export AWS_REGION=us-east-1
#   export AWS_PROFILE=default     # o configura credenciales con aws configure
#   bash scripts/setup-ssm-params.sh [--env prod] [--update]
#
# Opciones:
#   --env <nombre>   Entorno (default: prod)
#   --update         Sobreescribir parámetros existentes (default: omitir si ya existen)
# =============================================================================

set -euo pipefail

# ── Args ──────────────────────────────────────────────────────────────────────
ENV="prod"
OVERWRITE="false"

while [[ $# -gt 0 ]]; do
  case $1 in
    --env)    ENV="$2";       shift 2 ;;
    --update) OVERWRITE="true"; shift  ;;
    *)        echo "Arg desconocido: $1"; exit 1 ;;
  esac
done

REGION="${AWS_REGION:-us-east-1}"
PREFIX="/santa-elena/${ENV}"

echo "================================================="
echo "  SSM Parameter Store — Santa Elena Platform"
echo "  Entorno : ${ENV}"
echo "  Región  : ${REGION}"
echo "  Prefijo : ${PREFIX}"
echo "  Sobreescribir: ${OVERWRITE}"
echo "================================================="
echo ""

# ── Helper ────────────────────────────────────────────────────────────────────
put_param() {
  local name="$1"
  local value="$2"
  local type="${3:-SecureString}"   # String | SecureString
  local full_name="${PREFIX}/${name}"

  # Verificar si ya existe
  if aws ssm get-parameter --name "${full_name}" --region "${REGION}" \
       --query "Parameter.Name" --output text &>/dev/null; then
    if [[ "${OVERWRITE}" == "true" ]]; then
      echo "  [UPDATE] ${full_name}"
      aws ssm put-parameter \
        --name "${full_name}" \
        --value "${value}" \
        --type "${type}" \
        --overwrite \
        --region "${REGION}" \
        --output none
    else
      echo "  [SKIP]   ${full_name}  (ya existe, usa --update para sobreescribir)"
    fi
  else
    echo "  [CREATE] ${full_name}"
    aws ssm put-parameter \
      --name "${full_name}" \
      --value "${value}" \
      --type "${type}" \
      --region "${REGION}" \
      --output none
  fi
}

# ── Leer valores interactivamente ─────────────────────────────────────────────
read_secret() {
  local prompt="$1"
  local default="${2:-}"
  local value

  if [[ -n "${default}" ]]; then
    read -r -s -p "  ${prompt} [${default}]: " value
    echo ""
    echo "${value:-${default}}"
  else
    read -r -s -p "  ${prompt}: " value
    echo ""
    echo "${value}"
  fi
}

read_plain() {
  local prompt="$1"
  local default="${2:-}"
  local value

  if [[ -n "${default}" ]]; then
    read -r -p "  ${prompt} [${default}]: " value
    echo "${value:-${default}}"
  else
    read -r -p "  ${prompt}: " value
    echo "${value}"
  fi
}

echo "Ingresa los valores. Presiona Enter para usar el default (si hay uno)."
echo "Los valores secretos no se mostrarán al escribirlos."
echo ""

# ── App ───────────────────────────────────────────────────────────────────────
echo "── Aplicación ────────────────────────────────────────────────"
NEXTAUTH_URL=$(read_plain "NEXTAUTH_URL" "https://santaelenacomunidad.online")
NEXTAUTH_SECRET=$(read_secret "NEXTAUTH_SECRET (mínimo 32 chars)")
CRON_SECRET=$(read_secret "CRON_SECRET")

# ── Base de datos ─────────────────────────────────────────────────────────────
echo ""
echo "── Base de datos ─────────────────────────────────────────────"
echo "  El endpoint RDS está en: AWS Console → RDS → Databases → santa-elena-prod"
RDS_HOST=$(read_plain "RDS endpoint (solo el host, sin puerto)")
RDS_PASSWORD=$(read_secret "POSTGRES_PASSWORD")
DATABASE_URL="postgresql://postgres:${RDS_PASSWORD}@${RDS_HOST}:5432/santa_elena?schema=public"
echo "  DATABASE_URL construida: postgresql://postgres:****@${RDS_HOST}:5432/santa_elena?schema=public"

# ── Admin ─────────────────────────────────────────────────────────────────────
echo ""
echo "── Admin ──────────────────────────────────────────────────────"
ADMIN_USERNAME=$(read_plain "ADMIN_USERNAME" "admin")
echo "  Para generar el hash: node scripts/gen-admin-hash.mjs <contraseña>"
ADMIN_PASSWORD_HASH=$(read_secret "ADMIN_PASSWORD_HASH (pbkdf2:...)")

# ── Email ─────────────────────────────────────────────────────────────────────
echo ""
echo "── Email ──────────────────────────────────────────────────────"
SES_FROM_EMAIL=$(read_plain "SES_FROM_EMAIL" "noreply@santaelenacomunidad.online")

# ── OAuth Google (opcionales) ─────────────────────────────────────────────────
echo ""
echo "── Google OAuth (dejar vacío para deshabilitar) ───────────────"
GOOGLE_CLIENT_ID=$(read_plain "GOOGLE_CLIENT_ID" "")
GOOGLE_CLIENT_SECRET=$(read_secret "GOOGLE_CLIENT_SECRET")

# ── Twilio SMS (opcionales) ───────────────────────────────────────────────────
echo ""
echo "── Twilio SMS (dejar vacío para deshabilitar) ─────────────────"
TWILIO_ACCOUNT_SID=$(read_plain "TWILIO_ACCOUNT_SID" "")
TWILIO_AUTH_TOKEN=$(read_secret "TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER=$(read_plain "TWILIO_PHONE_NUMBER" "")

# ── Web Push VAPID (opcionales) ───────────────────────────────────────────────
echo ""
echo "── Web Push VAPID (dejar vacío para deshabilitar) ─────────────"
VAPID_PUBLIC_KEY=$(read_plain "VAPID_PUBLIC_KEY" "")
VAPID_PRIVATE_KEY=$(read_secret "VAPID_PRIVATE_KEY")

# ── Escribir en SSM ───────────────────────────────────────────────────────────
echo ""
echo "Escribiendo parámetros en SSM Parameter Store..."
echo ""

put_param "NEXTAUTH_URL"         "${NEXTAUTH_URL}"         "String"
put_param "NEXTAUTH_SECRET"      "${NEXTAUTH_SECRET}"      "SecureString"
put_param "DATABASE_URL"         "${DATABASE_URL}"         "SecureString"
put_param "POSTGRES_PASSWORD"    "${RDS_PASSWORD}"         "SecureString"
put_param "ADMIN_USERNAME"       "${ADMIN_USERNAME}"       "String"
put_param "ADMIN_PASSWORD_HASH"  "${ADMIN_PASSWORD_HASH}"  "SecureString"
put_param "SES_FROM_EMAIL"       "${SES_FROM_EMAIL}"       "String"
put_param "CRON_SECRET"          "${CRON_SECRET}"          "SecureString"
put_param "GOOGLE_CLIENT_ID"     "${GOOGLE_CLIENT_ID:-placeholder}"     "String"
put_param "GOOGLE_CLIENT_SECRET" "${GOOGLE_CLIENT_SECRET:-placeholder}" "SecureString"
put_param "TWILIO_ACCOUNT_SID"   "${TWILIO_ACCOUNT_SID:-placeholder}"   "SecureString"
put_param "TWILIO_AUTH_TOKEN"    "${TWILIO_AUTH_TOKEN:-placeholder}"     "SecureString"
put_param "TWILIO_PHONE_NUMBER"  "${TWILIO_PHONE_NUMBER:-placeholder}"   "String"
put_param "VAPID_PUBLIC_KEY"     "${VAPID_PUBLIC_KEY:-placeholder}"      "String"
put_param "VAPID_PRIVATE_KEY"    "${VAPID_PRIVATE_KEY:-placeholder}"     "SecureString"

echo ""
echo "================================================="
echo "  ✓ Parámetros configurados correctamente"
echo ""
echo "  Próximos pasos:"
echo "  1. git push → el workflow de infra.yml aplicará Terraform"
echo "  2. Terraform leerá los valores desde SSM automáticamente"
echo "  3. GitHub Secrets ya no necesita los valores de la app,"
echo "     solo: AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY"
echo "================================================="
