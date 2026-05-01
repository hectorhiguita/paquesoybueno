# ─── Cluster existente ────────────────────────────────────────────────────────

data "aws_ecs_cluster" "main" {
  cluster_name = var.ecs_cluster_name
}

# ─── Security Group para las instancias EC2 ───────────────────────────────────

resource "aws_security_group" "ecs_tasks" {
  name        = "santa-elena-ecs-tasks-${var.environment}"
  description = "Allow traffic from ALB to ECS EC2 instances"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [var.alb_sg_id]
    description     = "Next.js from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "santa-elena-ecs-tasks-${var.environment}" }

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [description]
  }
}

# ─── IAM — rol de instancia EC2 para el agente ECS ───────────────────────────

resource "aws_iam_role" "ec2_instance" {
  name = "santa-elena-ecs-instance-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_instance_ecs" {
  role       = aws_iam_role.ec2_instance.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}

resource "aws_iam_instance_profile" "ec2_instance" {
  name = "santa-elena-ecs-instance-${var.environment}"
  role = aws_iam_role.ec2_instance.name
}

# ─── AMI ECS-optimized (Amazon Linux 2, siempre la última) ────────────────────

data "aws_ssm_parameter" "ecs_ami" {
  name = "/aws/service/ecs/optimized-ami/amazon-linux-2/recommended/image_id"
}

# ─── Launch Template ──────────────────────────────────────────────────────────

resource "aws_launch_template" "ecs" {
  name_prefix   = "santa-elena-ecs-${var.environment}-"
  image_id      = data.aws_ssm_parameter.ecs_ami.value
  instance_type = var.ec2_instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_instance.name
  }

  vpc_security_group_ids = [aws_security_group.ecs_tasks.id]

  # Registra la instancia en el cluster al arrancar
  user_data = base64encode(<<-EOT
    #!/bin/bash
    echo ECS_CLUSTER=${var.ecs_cluster_name} >> /etc/ecs/ecs.config
    echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config
  EOT
  )

  tag_specifications {
    resource_type = "instance"
    tags = { Name = "santa-elena-ecs-${var.environment}" }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ─── Auto Scaling Group — 1 nodo base, hasta 3 ────────────────────────────────

resource "aws_autoscaling_group" "ecs" {
  name                = "santa-elena-ecs-${var.environment}"
  min_size            = 1
  desired_capacity    = 1
  max_size            = 3
  vpc_zone_identifier = var.public_subnet_ids

  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }

  # Evita que el Capacity Provider termine instancias con tareas activas
  protect_from_scale_in = true

  tag {
    key                 = "AmazonECSManaged"
    value               = "true"
    propagate_at_launch = true
  }

  tag {
    key                 = "Name"
    value               = "santa-elena-ecs-${var.environment}"
    propagate_at_launch = true
  }

  lifecycle {
    ignore_changes = [desired_capacity]
  }
}

# ─── ECS Capacity Provider ────────────────────────────────────────────────────

resource "aws_ecs_capacity_provider" "ec2" {
  name = "santa-elena-ec2-${var.environment}"

  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.ecs.arn
    managed_termination_protection = "ENABLED"

    managed_scaling {
      status                    = "ENABLED"
      target_capacity           = 80
      minimum_scaling_step_size = 1
      maximum_scaling_step_size = 3
    }
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = var.ecs_cluster_name
  capacity_providers = [aws_ecs_capacity_provider.ec2.name]

  default_capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
  }
}

# ─── Task Definition — Migraciones Prisma (CI/CD) ────────────────────────────
# Se ejecuta una sola vez por despliegue desde el pipeline, antes de actualizar
# el servicio principal. No corre en el arranque del contenedor de la app.
#
# Uso en CI/CD:
#   aws ecs run-task \
#     --cluster <cluster> \
#     --task-definition santa-elena-migrate-<env> \
#     --launch-type EC2 \
#     --count 1

resource "aws_ecs_task_definition" "migrate" {
  family                   = "santa-elena-migrate-${var.environment}"
  requires_compatibilities = ["EC2"]
  network_mode             = "bridge"
  execution_role_arn       = var.ecs_exec_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "migrate"
      image     = "${var.ecr_repo_url}:latest"
      essential = true
      cpu       = 512
      memory    = 512

      command = [
        "node",
        "./node_modules/prisma/build/index.js",
        "migrate",
        "deploy"
      ]

      environment = [
        { name = "NODE_ENV", value = "production" }
      ]

      secrets = [
        { name = "DATABASE_URL", valueFrom = "${local.ssm_prefix}/DATABASE_URL" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_app
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "migrate"
        }
      }
    }
  ])

  tags = { Name = "santa-elena-migrate-${var.environment}" }
}

# ─── Task Definition — App Next.js ────────────────────────────────────────────

locals {
  ssm_prefix = "arn:aws:ssm:${var.aws_region}:${var.aws_account_id}:parameter/santa-elena/${var.environment}"
}

resource "aws_ecs_task_definition" "app" {
  family                   = "santa-elena-app-${var.environment}"
  requires_compatibilities = ["EC2"]
  network_mode             = "bridge"
  execution_role_arn       = var.ecs_exec_role_arn
  task_role_arn            = var.ecs_task_role_arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repo_url}:latest"
      essential = true
      cpu       = 2048
      # t3.small tiene 2 GB — reservamos ~256 MB para el agente ECS + OS
      memory    = 1792

      portMappings = [{
        containerPort = 3000
        hostPort      = 3000
        protocol      = "tcp"
      }]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" }
      ]

      secrets = [
        { name = "NEXTAUTH_SECRET",      valueFrom = "${local.ssm_prefix}/NEXTAUTH_SECRET" },
        { name = "NEXTAUTH_URL",         valueFrom = "${local.ssm_prefix}/NEXTAUTH_URL" },
        { name = "DATABASE_URL",         valueFrom = "${local.ssm_prefix}/DATABASE_URL" },
        { name = "GOOGLE_CLIENT_ID",     valueFrom = "${local.ssm_prefix}/GOOGLE_CLIENT_ID" },
        { name = "GOOGLE_CLIENT_SECRET", valueFrom = "${local.ssm_prefix}/GOOGLE_CLIENT_SECRET" },
        { name = "TWILIO_ACCOUNT_SID",   valueFrom = "${local.ssm_prefix}/TWILIO_ACCOUNT_SID" },
        { name = "TWILIO_AUTH_TOKEN",    valueFrom = "${local.ssm_prefix}/TWILIO_AUTH_TOKEN" },
        { name = "TWILIO_PHONE_NUMBER",  valueFrom = "${local.ssm_prefix}/TWILIO_PHONE_NUMBER" },
        { name = "VAPID_PUBLIC_KEY",     valueFrom = "${local.ssm_prefix}/VAPID_PUBLIC_KEY" },
        { name = "VAPID_PRIVATE_KEY",    valueFrom = "${local.ssm_prefix}/VAPID_PRIVATE_KEY" },
        { name = "SES_FROM_EMAIL",       valueFrom = "${local.ssm_prefix}/SES_FROM_EMAIL" },
        { name = "ADMIN_USERNAME",       valueFrom = "${local.ssm_prefix}/ADMIN_USERNAME" },
        { name = "ADMIN_PASSWORD_HASH",  valueFrom = "${local.ssm_prefix}/ADMIN_PASSWORD_HASH" },
        { name = "CRON_SECRET",          valueFrom = "${local.ssm_prefix}/CRON_SECRET" }
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
        interval    = 20
        timeout     = 5
        retries     = 3
        # Las migraciones corren en CI/CD, no en el entrypoint.
        # Next.js standalone arranca en ~20-30s en t3.small.
        startPeriod = 60
      }
    }
  ])

  tags = { Name = "santa-elena-app-${var.environment}" }
}

# ─── Service — App Next.js ────────────────────────────────────────────────────

resource "aws_ecs_service" "app" {
  name            = "santa-elena-app-${var.environment}"
  cluster         = data.aws_ecs_cluster.main.arn
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_desired_count

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "app"
    container_port   = 3000
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }

  tags = { Name = "santa-elena-app-${var.environment}" }

  depends_on = [aws_ecs_cluster_capacity_providers.main]
}

# ─── Auto Scaling del servicio ECS (número de tareas) ────────────────────────

resource "aws_appautoscaling_target" "app" {
  max_capacity       = 3
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
