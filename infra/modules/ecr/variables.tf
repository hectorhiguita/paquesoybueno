variable "environment" {
  type = string
}

variable "ecr_repo_name" {
  type        = string
  description = "Nombre del repositorio ECR existente"
  default     = "practicas-itm"
}
