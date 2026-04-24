# ─── Subnet Group ─────────────────────────────────────────────────────────────

resource "aws_db_subnet_group" "main" {
  name       = "santa-elena-${var.environment}"
  subnet_ids = var.private_subnet_ids

  tags = { Name = "santa-elena-rds-subnet-group-${var.environment}" }
}

# ─── Security Group ───────────────────────────────────────────────────────────

resource "aws_security_group" "rds" {
  name        = "santa-elena-rds-${var.environment}"
  description = "Allow PostgreSQL from ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "PostgreSQL from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "santa-elena-rds-sg-${var.environment}" }
}

# ─── RDS PostgreSQL db.t3.micro ───────────────────────────────────────────────

resource "aws_db_instance" "main" {
  identifier        = "santa-elena-${var.environment}"
  engine            = "postgres"
  engine_version    = "16"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_type      = "gp2"
  storage_encrypted = true

  db_name  = "santa_elena"
  username = "postgres"
  password = var.postgres_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Sin Multi-AZ para reducir costos en dev/staging
  multi_az            = false
  publicly_accessible = false

  # Free tier: backup_retention_period debe ser 0
  backup_retention_period = 0
  skip_final_snapshot     = true
  deletion_protection     = false

  tags = { Name = "santa-elena-rds-${var.environment}" }
}
