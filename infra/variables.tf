# ─── AWS ──────────────────────────────────────────────────────────────────────

variable "aws_region" {
  description = "Región AWS donde se despliega la infraestructura"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "ID de la cuenta AWS (12 dígitos)"
  type        = string
}

variable "environment" {
  description = "Nombre del entorno (prod, staging)"
  type        = string
  default     = "prod"
}

# ─── Dominio y certificado ────────────────────────────────────────────────────
# Dominio: santaelenacomunidad.online  |  Hosted Zone: Z03033341JKQ5TU71XOGC
# El certificado ACM lo genera el módulo dns automáticamente.
# No se necesitan variables aquí — están hardcodeadas en main.tf.

# ─── Aplicación ───────────────────────────────────────────────────────────────

variable "nextauth_secret" {
  description = "Secret para NextAuth.js (mínimo 32 caracteres)"
  type        = string
  sensitive   = true
}

variable "nextauth_url" {
  description = "URL pública de la aplicación (ej: https://santaelena.com)"
  type        = string
}

variable "google_client_id" {
  description = "Client ID de Google OAuth"
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_client_secret" {
  description = "Client Secret de Google OAuth"
  type        = string
  sensitive   = true
  default     = ""
}

variable "twilio_account_sid" {
  description = "Twilio Account SID para SMS"
  type        = string
  sensitive   = true
  default     = ""
}

variable "twilio_auth_token" {
  description = "Twilio Auth Token"
  type        = string
  sensitive   = true
  default     = ""
}

variable "twilio_phone_number" {
  description = "Número de teléfono Twilio"
  type        = string
  default     = ""
}

variable "vapid_public_key" {
  description = "Clave pública VAPID para Web Push"
  type        = string
  sensitive   = true
  default     = ""
}

variable "vapid_private_key" {
  description = "Clave privada VAPID para Web Push"
  type        = string
  sensitive   = true
  default     = ""
}

# ─── Base de datos ────────────────────────────────────────────────────────────

variable "postgres_password" {
  description = "Contraseña del usuario postgres"
  type        = string
  sensitive   = true
}
