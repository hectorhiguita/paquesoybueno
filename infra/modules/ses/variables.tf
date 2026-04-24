variable "environment" {
  type = string
}

variable "domain_name" {
  type    = string
  default = "santaelenacomunidad.online"
}

variable "hosted_zone_id" {
  type    = string
  default = "Z03033341JKQ5TU71XOGC"
}

variable "ecs_task_role_name" {
  type        = string
  description = "Name of the ECS task IAM role to attach SES permissions"
}
