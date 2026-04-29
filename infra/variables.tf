# ─── Infraestructura AWS ──────────────────────────────────────────────────────
# Los secretos de aplicación viven en SSM Parameter Store, no aquí.
# Créalos una sola vez con: bash scripts/setup-ssm-params.sh

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
