# ─── Cluster existente — solo referencia ─────────────────────────────────────
# ARN: arn:aws:ecs:us-east-1:450328359598:cluster/practicas-itm

data "aws_ecs_cluster" "main" {
  cluster_name = var.ecs_cluster_name
}

# ─── Security Group para las tasks ECS ───────────────────────────────────────

resource "aws_security_group" "ecs_tasks" {
  name        = "santa-elena-ecs-tasks-${var.environment}"
  description = "Allow traffic from ALB to ECS tasks"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_sg_id]
    description     = "Next.js from ALB"
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    self        = true
    description = "PostgreSQL internal"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "santa-elena-ecs-tasks-${var.environment}" }

  lifecycle {
    # Evita destruir el SG si tiene ENIs asociadas
    prevent_destroy = true
    # Ignora cambios en description (inmutable en AWS sin recrear)
    ignore_changes = [description]
  }
}

# ─── Task Definition — PostgreSQL ─────────────────────────────────────────────

resource "aws_ecs_task_definition" "postgres" {
  family                   = "santa-elena-postgres-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.ecs_exec_role_arn
  task_role_arn            = var.ecs_task_role_arn

  # Volumen EFS para datos persistentes de PostgreSQL
  volume {
    name = "pgdata"
    efs_volume_configuration {
      file_system_id          = var.efs_id
      transit_encryption      = "ENABLED"
      authorization_config {
        access_point_id = var.efs_access_point_id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "postgres"
      image     = "${var.ecr_repo_url}:postgres-16"
      essential = true

      portMappings = [{
        containerPort = 5432
        protocol      = "tcp"
      }]

      environment = [
        { name = "POSTGRES_DB",   value = "santa_elena" },
        { name = "POSTGRES_USER", value = "postgres" },
        { name = "PGDATA",        value = "/var/lib/postgresql/data/pgdata" }
      ]

      secrets = [
        {
          name      = "POSTGRES_PASSWORD"
          valueFrom = "${var.secrets_arn}:POSTGRES_PASSWORD::"
        }
      ]

      mountPoints = [{
        sourceVolume  = "pgdata"
        containerPath = "/var/lib/postgresql/data"
        readOnly      = false
      }]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_postgres
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "postgres"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "pg_isready -U postgres -d santa_elena"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = { Name = "santa-elena-postgres-${var.environment}" }
}

# ─── Service — PostgreSQL (1 task, sin load balancer) ────────────────────────

resource "aws_ecs_service" "postgres" {
  name            = "santa-elena-postgres-${var.environment}"
  cluster         = data.aws_ecs_cluster.main.arn
  task_definition = aws_ecs_task_definition.postgres.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  # Service discovery para que la app encuentre postgres por nombre DNS
  service_registries {
    registry_arn = aws_service_discovery_service.postgres.arn
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  # Evitar que Terraform destruya el servicio si el desired_count cambia manualmente
  lifecycle {
    ignore_changes = [desired_count]
  }

  depends_on = [aws_service_discovery_service.postgres]

  tags = { Name = "santa-elena-postgres-${var.environment}" }
}

# ─── Task Definition — App Next.js ────────────────────────────────────────────

resource "aws_ecs_task_definition" "app" {
  family                   = "santa-elena-app-${var.environment}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = var.ecs_exec_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repo_url}:latest"
      essential = true

      portMappings = [{
        containerPort = 3000
        protocol      = "tcp"
      }]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT",     value = "3000" }
      ]

      # Todas las variables sensibles vienen de Secrets Manager
      secrets = [
        { name = "NEXTAUTH_SECRET",      valueFrom = "${var.secrets_arn}:NEXTAUTH_SECRET::" },
        { name = "NEXTAUTH_URL",         valueFrom = "${var.secrets_arn}:NEXTAUTH_URL::" },
        { name = "DATABASE_URL",         valueFrom = "${var.secrets_arn}:DATABASE_URL::" },
        { name = "GOOGLE_CLIENT_ID",     valueFrom = "${var.secrets_arn}:GOOGLE_CLIENT_ID::" },
        { name = "GOOGLE_CLIENT_SECRET", valueFrom = "${var.secrets_arn}:GOOGLE_CLIENT_SECRET::" },
        { name = "TWILIO_ACCOUNT_SID",   valueFrom = "${var.secrets_arn}:TWILIO_ACCOUNT_SID::" },
        { name = "TWILIO_AUTH_TOKEN",    valueFrom = "${var.secrets_arn}:TWILIO_AUTH_TOKEN::" },
        { name = "TWILIO_PHONE_NUMBER",  valueFrom = "${var.secrets_arn}:TWILIO_PHONE_NUMBER::" },
        { name = "VAPID_PUBLIC_KEY",     valueFrom = "${var.secrets_arn}:VAPID_PUBLIC_KEY::" },
        { name = "VAPID_PRIVATE_KEY",    valueFrom = "${var.secrets_arn}:VAPID_PRIVATE_KEY::" },
        { name = "AWS_S3_BUCKET",        valueFrom = "${var.secrets_arn}:AWS_S3_BUCKET::" },
        { name = "AWS_REGION",           valueFrom = "${var.secrets_arn}:AWS_REGION::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_app
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "app"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = { Name = "santa-elena-app-${var.environment}" }
}

# ─── Service — App Next.js (detrás del ALB) ───────────────────────────────────

resource "aws_ecs_service" "app" {
  name            = "santa-elena-app-${var.environment}"
  cluster         = data.aws_ecs_cluster.main.arn
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_desired_count
  launch_type     = "FARGATE"

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "app"
    container_port   = 3000
  }

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  depends_on = [aws_ecs_service.postgres]

  tags = { Name = "santa-elena-app-${var.environment}" }
}

# ─── Auto Scaling para la app ─────────────────────────────────────────────────

resource "aws_appautoscaling_target" "app" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${data.aws_ecs_cluster.main.cluster_name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "app_cpu" {
  name               = "santa-elena-cpu-scaling-${var.environment}"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.app.resource_id
  scalable_dimension = aws_appautoscaling_target.app.scalable_dimension
  service_namespace  = aws_appautoscaling_target.app.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# ─── Service Discovery (DNS interno para postgres) ────────────────────────────

resource "aws_service_discovery_private_dns_namespace" "main" {
  name        = "santa-elena.local"
  description = "Namespace DNS privado para servicios ECS"
  vpc         = var.vpc_id
}

resource "aws_service_discovery_service" "postgres" {
  name = "postgres"

  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.main.id
    dns_records {
      ttl  = 10
      type = "A"
    }
    routing_policy = "MULTIVALUE"
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}
