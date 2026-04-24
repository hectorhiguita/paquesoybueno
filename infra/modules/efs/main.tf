# EFS para datos persistentes de PostgreSQL

resource "aws_efs_file_system" "postgres" {
  creation_token   = "santa-elena-postgres-${var.environment}"
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"
  encrypted        = true

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = { Name = "santa-elena-postgres-efs-${var.environment}" }
}

# Security group para EFS
resource "aws_security_group" "efs" {
  name        = "santa-elena-efs-sg-${var.environment}"
  description = "Allow NFS access from ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [var.ecs_sg_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "santa-elena-efs-sg-${var.environment}" }
}

# Mount targets en cada subnet privada
resource "aws_efs_mount_target" "postgres" {
  count           = length(var.private_subnet_ids)
  file_system_id  = aws_efs_file_system.postgres.id
  subnet_id       = var.private_subnet_ids[count.index]
  security_groups = [aws_security_group.efs.id]
}

# Access point para el directorio de datos de PostgreSQL
resource "aws_efs_access_point" "postgres_data" {
  file_system_id = aws_efs_file_system.postgres.id

  posix_user {
    uid = 999  # UID del usuario postgres en el contenedor oficial
    gid = 999
  }

  root_directory {
    path = "/pgdata"
    creation_info {
      owner_uid   = 999
      owner_gid   = 999
      permissions = "0700"
    }
  }

  tags = { Name = "santa-elena-postgres-ap-${var.environment}" }
}
