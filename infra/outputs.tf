output "alb_dns_name" {
  description = "DNS del Application Load Balancer — apunta tu dominio aquí"
  value       = module.alb.alb_dns_name
}

output "alb_zone_id" {
  description = "Zone ID del ALB para Route 53 alias record"
  value       = module.alb.alb_zone_id
}

output "app_ecr_repo_url" {
  description = "URL del repositorio ECR de la aplicación Next.js"
  value       = module.ecr.app_repo_url
}

output "postgres_ecr_repo_url" {
  description = "URL del repositorio ECR de PostgreSQL"
  value       = module.ecr.postgres_repo_url
}

output "assets_bucket_name" {
  description = "Nombre del bucket S3 para imágenes y assets"
  value       = module.s3.assets_bucket_name
}

output "backups_bucket_name" {
  description = "Nombre del bucket S3 para backups de base de datos"
  value       = module.s3.backups_bucket_name
}

output "ecs_cluster_name" {
  description = "Nombre del cluster ECS"
  value       = module.ecs.cluster_name
}

output "ecs_app_service_name" {
  description = "Nombre del servicio ECS de la aplicación"
  value       = module.ecs.app_service_name
}

output "secrets_arn" {
  description = "ARN del secret en AWS Secrets Manager"
  value       = module.secrets.secret_arn
  sensitive   = true
}
