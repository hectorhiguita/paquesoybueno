# ─── Security Group del ALB — existente, solo referencia ─────────────────────
# sg-07b77e3f781d7be6a

data "aws_security_group" "alb" {
  id = var.alb_sg_id
}

# ─── Application Load Balancer ────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "santa-elena-alb-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [data.aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "prod"

  tags = { Name = "santa-elena-alb-${var.environment}" }
}

# ─── Target Group para la app Next.js ────────────────────────────────────────

resource "aws_lb_target_group" "app" {
  name        = "santa-elena-app-${var.environment}"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = "/api/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    matcher             = "200"
  }

  tags = { Name = "santa-elena-app-tg-${var.environment}" }
}

# ─── Listener HTTP → redirect a HTTPS ────────────────────────────────────────

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ─── Listener HTTPS ───────────────────────────────────────────────────────────

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
