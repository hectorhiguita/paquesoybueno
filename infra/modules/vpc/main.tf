# ─── VPC existente — solo referencias, no crea nada ──────────────────────────
# VPC: vpc-05b9e9c5f8cccd4bd (practicas-itm-vpc) 10.0.0.0/16

data "aws_vpc" "main" {
  id = var.vpc_id
}

data "aws_subnet" "public" {
  for_each = toset(var.public_subnet_ids)
  id       = each.value
}

data "aws_subnet" "private" {
  for_each = toset(var.private_subnet_ids)
  id       = each.value
}

# VPC Endpoint para S3 (tráfico S3 no sale a internet)
# Solo se crea si no existe ya uno en la VPC
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = data.aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.private_route_table_ids

  tags = {
    Name = "santa-elena-s3-endpoint-${var.environment}"
  }
}
