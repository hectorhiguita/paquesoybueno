# ─── ECR existente — solo referencia, no crea nada ───────────────────────────
# Repositorio: 450328359598.dkr.ecr.us-east-1.amazonaws.com/practicas-itm

data "aws_ecr_repository" "app" {
  name = var.ecr_repo_name
}
