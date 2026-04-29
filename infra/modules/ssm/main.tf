# ─── SSM Parameter Store — fuente única de secretos ──────────────────────────
#
# Todos los parámetros deben existir en SSM ANTES de ejecutar terraform apply.
# Créalos con: scripts/setup-ssm-params.sh
#
# Convención de nombres: /santa-elena/<environment>/<NOMBRE>

locals {
  prefix = "/santa-elena/${var.environment}"
}

# ── App ───────────────────────────────────────────────────────────────────────

data "aws_ssm_parameter" "nextauth_secret" {
  name            = "${local.prefix}/NEXTAUTH_SECRET"
  with_decryption = true
}

data "aws_ssm_parameter" "nextauth_url" {
  name = "${local.prefix}/NEXTAUTH_URL"
}

data "aws_ssm_parameter" "database_url" {
  name            = "${local.prefix}/DATABASE_URL"
  with_decryption = true
}

data "aws_ssm_parameter" "postgres_password" {
  name            = "${local.prefix}/POSTGRES_PASSWORD"
  with_decryption = true
}

# ── OAuth (opcionales) ────────────────────────────────────────────────────────

data "aws_ssm_parameter" "google_client_id" {
  name = "${local.prefix}/GOOGLE_CLIENT_ID"
}

data "aws_ssm_parameter" "google_client_secret" {
  name            = "${local.prefix}/GOOGLE_CLIENT_SECRET"
  with_decryption = true
}

# ── SMS ───────────────────────────────────────────────────────────────────────

data "aws_ssm_parameter" "twilio_account_sid" {
  name            = "${local.prefix}/TWILIO_ACCOUNT_SID"
  with_decryption = true
}

data "aws_ssm_parameter" "twilio_auth_token" {
  name            = "${local.prefix}/TWILIO_AUTH_TOKEN"
  with_decryption = true
}

data "aws_ssm_parameter" "twilio_phone_number" {
  name = "${local.prefix}/TWILIO_PHONE_NUMBER"
}

# ── Web Push ──────────────────────────────────────────────────────────────────

data "aws_ssm_parameter" "vapid_public_key" {
  name            = "${local.prefix}/VAPID_PUBLIC_KEY"
  with_decryption = true
}

data "aws_ssm_parameter" "vapid_private_key" {
  name            = "${local.prefix}/VAPID_PRIVATE_KEY"
  with_decryption = true
}

# ── Admin ─────────────────────────────────────────────────────────────────────

data "aws_ssm_parameter" "admin_username" {
  name = "${local.prefix}/ADMIN_USERNAME"
}

data "aws_ssm_parameter" "admin_password_hash" {
  name            = "${local.prefix}/ADMIN_PASSWORD_HASH"
  with_decryption = true
}

# ── Email / Infra ─────────────────────────────────────────────────────────────

data "aws_ssm_parameter" "ses_from_email" {
  name = "${local.prefix}/SES_FROM_EMAIL"
}

data "aws_ssm_parameter" "cron_secret" {
  name            = "${local.prefix}/CRON_SECRET"
  with_decryption = true
}
