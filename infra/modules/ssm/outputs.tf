# ── Valores planos (para módulos que necesitan el valor, ej: RDS) ─────────────

output "postgres_password" {
  value     = data.aws_ssm_parameter.postgres_password.value
  sensitive = true
}

# ── ARNs de parámetros (para la task definition de ECS) ──────────────────────
# ECS agents leen el valor en runtime usando estos ARNs.

output "arns" {
  description = "Mapa nombre_env → ARN del parámetro SSM"
  value = {
    NEXTAUTH_SECRET      = data.aws_ssm_parameter.nextauth_secret.arn
    NEXTAUTH_URL         = data.aws_ssm_parameter.nextauth_url.arn
    DATABASE_URL         = data.aws_ssm_parameter.database_url.arn
    GOOGLE_CLIENT_ID     = data.aws_ssm_parameter.google_client_id.arn
    GOOGLE_CLIENT_SECRET = data.aws_ssm_parameter.google_client_secret.arn
    TWILIO_ACCOUNT_SID   = data.aws_ssm_parameter.twilio_account_sid.arn
    TWILIO_AUTH_TOKEN    = data.aws_ssm_parameter.twilio_auth_token.arn
    TWILIO_PHONE_NUMBER  = data.aws_ssm_parameter.twilio_phone_number.arn
    VAPID_PUBLIC_KEY     = data.aws_ssm_parameter.vapid_public_key.arn
    VAPID_PRIVATE_KEY    = data.aws_ssm_parameter.vapid_private_key.arn
    ADMIN_USERNAME       = data.aws_ssm_parameter.admin_username.arn
    ADMIN_PASSWORD_HASH  = data.aws_ssm_parameter.admin_password_hash.arn
    SES_FROM_EMAIL       = data.aws_ssm_parameter.ses_from_email.arn
    CRON_SECRET          = data.aws_ssm_parameter.cron_secret.arn
  }
}
