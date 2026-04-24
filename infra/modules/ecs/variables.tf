variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "aws_account_id" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "alb_target_group_arn" {
  type = string
}

variable "alb_sg_id" {
  type = string
}

variable "ecr_repo_url" {
  type = string
}

variable "ecs_task_role_arn" {
  type = string
}

variable "ecs_exec_role_arn" {
  type = string
}

variable "secrets_arn" {
  type = string
}

variable "log_group_app" {
  type = string
}

variable "postgres_password" {
  type      = string
  sensitive = true
}

variable "ecs_cluster_name" {
  type    = string
  default = "practicas-itm"
}

variable "app_desired_count" {
  type    = number
  default = 1
}
