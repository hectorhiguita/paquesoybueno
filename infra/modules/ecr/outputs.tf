output "app_repo_url" {
  description = "URL completa del repositorio ECR"
  value       = data.aws_ecr_repository.app.repository_url
}

output "app_repo_name" {
  value = data.aws_ecr_repository.app.name
}

# El mismo repo se usa para app y postgres con tags distintos
output "postgres_repo_url" {
  description = "Mismo repo ECR, imagen postgres con tag distinto"
  value       = data.aws_ecr_repository.app.repository_url
}
