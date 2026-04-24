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
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = data.aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = var.private_route_table_ids

  tags = {
    Name = "santa-elena-s3-endpoint-${var.environment}"
  }
}

# ─── Interface Endpoints para servicios AWS (sin NAT Gateway) ─────────────────

resource "aws_security_group" "vpc_endpoints" {
  name        = "santa-elena-vpc-endpoints-${var.environment}"
  description = "Allow HTTPS from VPC to AWS service endpoints"
  vpc_id      = data.aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "santa-elena-vpc-endpoints-sg-${var.environment}" }
}

# Secrets Manager — necesario para que ECS pueda leer secrets
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = data.aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = { Name = "santa-elena-secretsmanager-endpoint-${var.environment}" }
}

# ECR API — necesario para pull de imágenes Docker
resource "aws_vpc_endpoint" "ecr_api" {
  vpc_id              = data.aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = { Name = "santa-elena-ecr-api-endpoint-${var.environment}" }
}

# ECR DKR — necesario para pull de capas de imágenes Docker
resource "aws_vpc_endpoint" "ecr_dkr" {
  vpc_id              = data.aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = { Name = "santa-elena-ecr-dkr-endpoint-${var.environment}" }
}

# CloudWatch Logs — para que ECS pueda enviar logs
resource "aws_vpc_endpoint" "logs" {
  vpc_id              = data.aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = var.private_subnet_ids
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = { Name = "santa-elena-logs-endpoint-${var.environment}" }
}
