variable "environment"       { type = string }
variable "vpc_id"            { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "certificate_arn"   { type = string }

variable "alb_sg_id" {
  type        = string
  description = "ID of the existing ALB security group"
  default     = "sg-07b77e3f781d7be6a"
}
