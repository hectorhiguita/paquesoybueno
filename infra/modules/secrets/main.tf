# Todas las variables de entorno sensibles en un único secret JSON
resource "aws_secretsmanager_secret" "app" {
  name                    = "santa-elena/${var.environment}/app"
  description = "App secrets for Santa Elena Platform"
  recovery_window_in_days = var.environment == "prod" ? 7 : 0

  tags = { Name = "santa-elena-app-secrets-${var.environment}" }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    NEXTAUTH_SECRET      = var.nextauth_secret
    NEXTAUTH_URL         = var.nextauth_url
    GOOGLE_CLIENT_ID     = var.google_client_id
    GOOGLE_CLIENT_SECRET = var.google_client_secret
    TWILIO_ACCOUNT_SID   = var.twilio_account_sid
    TWILIO_AUTH_TOKEN    = var.twilio_auth_token
    TWILIO_PHONE_NUMBER  = var.twilio_phone_number
    VAPID_PUBLIC_KEY     = var.vapid_public_key
    VAPID_PRIVATE_KEY    = var.vapid_private_key
    POSTGRES_PASSWORD    = var.postgres_password
    # DATABASE_URL se construye en la task definition usando el password del secret
    DATABASE_URL = "postgresql://postgres:${var.postgres_password}@postgres.santa-elena.local:5432/santa_elena?schema=public"
    # S3 — la app usa el IAM role, no credenciales explícitas
    AWS_S3_BUCKET        = var.assets_bucket_name
    AWS_REGION           = var.aws_region
    SES_FROM_EMAIL       = "noreply@santaelenacomunidad.online"
  })
}
