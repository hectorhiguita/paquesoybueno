variable "environment" {
  type = string
}

variable "domain_name" {
  type        = string
  description = "Dominio principal"
  default     = "santaelenacomunidad.online"
}

variable "hosted_zone_id" {
  type        = string
  description = "ID del Hosted Zone en Route 53"
  default     = "Z03033341JKQ5TU71XOGC"
}

variable "alb_dns_name" {
  type        = string
  description = "DNS name del Application Load Balancer"
}

variable "alb_zone_id" {
  type        = string
  description = "Zone ID del ALB para el alias record"
}
