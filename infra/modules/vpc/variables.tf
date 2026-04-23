variable "environment" {
  type        = string
  description = "Nombre del entorno (prod, staging)"
}

variable "aws_region" {
  type        = string
  description = "Región AWS"
}

variable "vpc_id" {
  type        = string
  description = "ID de la VPC existente"
  default     = "vpc-05b9e9c5f8cccd4bd"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "IDs de las subnets públicas existentes"
  default     = [
    "subnet-00e42cb3d170a0a01",  # practicas-itm-public-1  10.0.1.0/24  us-east-1a
    "subnet-0e10919be6e6ceb5b",  # practicas-itm-public-2  10.0.4.0/24  us-east-1b
  ]
}

variable "private_subnet_ids" {
  type        = list(string)
  description = "IDs de las subnets privadas existentes"
  default     = [
    "subnet-03c6fb43f2ade2d57",  # practicas-itm-private-1  10.0.2.0/24  us-east-1a
    "subnet-01faa754860e64f4c",  # practicas-itm-private-2  10.0.3.0/24  us-east-1b
  ]
}

variable "private_route_table_ids" {
  type        = list(string)
  description = "IDs de las route tables privadas (para el VPC endpoint de S3)"
  default     = [
    "rtb-0753da134dd0dcc8f",  # practicas-itm-private-rt
  ]
}
