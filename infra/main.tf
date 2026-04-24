terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Estado remoto en S3
  # Bucket existente: practicas-itm-tfstate-450328359598
  # Prefix dedicado para este proyecto: santa-elena-platform/
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

module "secrets" {
  source               = "./modules/secrets"
  environment          = var.environment
  nextauth_secret      = var.nextauth_secret
  nextauth_url         = var.nextauth_url
  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
  twilio_account_sid   = var.twilio_account_sid
  twilio_auth_token    = var.twilio_auth_token
  twilio_phone_number  = var.twilio_phone_number
  vapid_public_key     = var.vapid_public_key
  vapid_private_key    = var.vapid_private_key
  postgres_password    = var.postgres_password
  assets_bucket_name   = module.s3.assets_bucket_name
  aws_region           = var.aws_region
}

module "cloudwatch" {
  source      = "./modules/cloudwatch"
  environment = var.environment
}

# DNS + ACM — santaelenacomunidad.online
# Hosted Zone: Z03033341JKQ5TU71XOGC
# Se crea antes del ALB para que el certificado esté validado
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
  # El certificado lo genera el módulo dns
  certificate_arn   = module.dns.certificate_arn
}

module "efs" {
  source             = "./modules/efs"
  environment        = var.environment
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  ecs_sg_id          = module.ecs.ecs_sg_id
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
  secrets_arn          = module.secrets.secret_arn
  efs_id               = module.efs.efs_id
  efs_access_point_id  = module.efs.access_point_id
  log_group_app        = module.cloudwatch.log_group_app
  log_group_postgres   = module.cloudwatch.log_group_postgres
  postgres_password    = var.postgres_password
  ecs_cluster_name     = "practicas-itm"
}
