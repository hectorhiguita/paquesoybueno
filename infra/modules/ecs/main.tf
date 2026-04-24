# ─── Cluster existente ────────────────────────────────────────────────────────

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
        { name = "AWS_REGION",           valueFrom = "${var.secrets_arn}:AWS_REGION::" },
        { name = "SES_FROM_EMAIL",       valueFrom = "${var.secrets_arn}:SES_FROM_EMAIL::" }
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
        startPeriod = 90
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

  tags = { Name = "santa-elena-app-${var.environment}" }
}

# ─── Auto Scaling ─────────────────────────────────────────────────────────────

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
