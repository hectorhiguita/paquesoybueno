resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/santa-elena-app-${var.environment}"
  retention_in_days = 30
  tags              = { Name = "santa-elena-app-logs-${var.environment}" }
}

resource "aws_cloudwatch_log_group" "postgres" {
  name              = "/ecs/santa-elena-postgres-${var.environment}"
  retention_in_days = 14
  tags              = { Name = "santa-elena-postgres-logs-${var.environment}" }
}

# Alarma: CPU alta en la app
resource "aws_cloudwatch_metric_alarm" "app_cpu_high" {
  alarm_name          = "santa-elena-app-cpu-high-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "CPU de la app supera el 85%"
  treat_missing_data  = "notBreaching"
}

# Alarma: errores 5xx en el ALB
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "santa-elena-alb-5xx-${var.environment}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Más de 10 errores 5xx en 1 minuto"
  treat_missing_data  = "notBreaching"
}
