# ─── AWS SES — dominio y email verificados ────────────────────────────────────

# Verificar el dominio en SES
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

# Registro TXT en Route 53 para verificar el dominio en SES
resource "aws_route53_record" "ses_verification" {
  zone_id = var.hosted_zone_id
  name    = "_amazonses.${var.domain_name}"
  type    = "TXT"
  ttl     = 600
  records = [aws_ses_domain_identity.main.verification_token]
}

resource "aws_ses_domain_identity_verification" "main" {
  domain = aws_ses_domain_identity.main.id
  depends_on = [aws_route53_record.ses_verification]
}

# DKIM para mejorar entregabilidad
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

resource "aws_route53_record" "ses_dkim" {
  count   = 3
  zone_id = var.hosted_zone_id
  name    = "${aws_ses_domain_dkim.main.dkim_tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_ses_domain_dkim.main.dkim_tokens[count.index]}.dkim.amazonses.com"]
}

# Email de origen verificado
resource "aws_ses_email_identity" "noreply" {
  email = "noreply@${var.domain_name}"
}

# Politica IAM para que ECS pueda enviar emails via SES
resource "aws_iam_role_policy" "ecs_ses" {
  name = "ses-send-email-${var.environment}"
  role = var.ecs_task_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ses:SendEmail", "ses:SendRawEmail"]
      Resource = "*"
      Condition = {
        StringEquals = {
          "ses:FromAddress" = "noreply@${var.domain_name}"
        }
      }
    }]
  })
}
