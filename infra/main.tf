terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket  = "practicas-itm-tfstate-450328359598"
    key     = "santa-elena-platform/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "santa-elena-platform"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ─── Módulos ──────────────────────────────────────────────────────────────────

module "vpc" {
  source      = "./modules/vpc"
  environment = var.environment
  aws_region  = var.aws_region
}

module "s3" {
  source      = "./modules/s3"
  environment = var.environment
  aws_region  = var.aws_region
}

module "ecr" {
  source        = "./modules/ecr"
  environment   = var.environment
  ecr_repo_name = "practicas-itm"
}

module "iam" {
  source         = "./modules/iam"
  environment    = var.environment
  assets_bucket  = module.s3.assets_bucket_arn
  backups_bucket = module.s3.backups_bucket_arn
}

# ─── SSM Parameter Store — fuente única de secretos ──────────────────────────
# Los parámetros deben existir antes del primer apply.
# Créalos con: bash scripts/setup-ssm-params.sh
#
# Migración desde Secrets Manager:
#   Si tienes el recurso anterior en el state, elimínalo con:
#   terraform state rm module.secrets
#   (o terraform destroy -target module.secrets para borrar el secret en AWS)

module "ssm" {
  source      = "./modules/ssm"
  environment = var.environment
}

# RDS PostgreSQL — la contraseña viene de SSM para evitar que pase por variables de Terraform
module "rds" {
  source             = "./modules/rds"
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  vpc_cidr           = module.vpc.vpc_cidr
  private_subnet_ids = module.vpc.private_subnet_ids
  postgres_password  = module.ssm.postgres_password
}

module "cloudwatch" {
  source      = "./modules/cloudwatch"
  environment = var.environment
}

module "dns" {
  source         = "./modules/dns"
  environment    = var.environment
  domain_name    = "santaelenacomunidad.online"
  hosted_zone_id = "Z03033341JKQ5TU71XOGC"
  alb_dns_name   = module.alb.alb_dns_name
  alb_zone_id    = module.alb.alb_zone_id
}

module "alb" {
  source            = "./modules/alb"
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = module.dns.certificate_arn
}

module "ses" {
  source             = "./modules/ses"
  environment        = var.environment
  domain_name        = "santaelenacomunidad.online"
  hosted_zone_id     = "Z03033341JKQ5TU71XOGC"
  ecs_task_role_name = module.iam.ecs_task_role_name
}

module "ecs" {
  source               = "./modules/ecs"
  environment          = var.environment
  aws_region           = var.aws_region
  aws_account_id       = var.aws_account_id
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  alb_target_group_arn = module.alb.app_target_group_arn
  alb_sg_id            = module.alb.alb_sg_id
  ecr_repo_url         = module.ecr.app_repo_url
  ecs_task_role_arn    = module.iam.ecs_task_role_arn
  ecs_exec_role_arn    = module.iam.ecs_exec_role_arn
  log_group_app        = module.cloudwatch.log_group_app
  ecs_cluster_name     = "practicas-itm"
}
