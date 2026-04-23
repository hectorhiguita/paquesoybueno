# ─── Entorno de producción ────────────────────────────────────────────────────
# Los valores sensibles se inyectan como TF_VAR_* desde GitHub Actions Secrets.
# Dominio y hosted zone están hardcodeados en main.tf (no son secretos).

environment  = "prod"
aws_region   = "us-east-1"
nextauth_url = "https://santaelenacomunidad.online"
