# ─── Hosted Zone existente ────────────────────────────────────────────────────
# santaelenacomunidad.online  |  Z03033341JKQ5TU71XOGC

data "aws_route53_zone" "main" {
  zone_id = var.hosted_zone_id
}

# ─── Certificado ACM ──────────────────────────────────────────────────────────
# Cubre el dominio raíz y el wildcard (*.santaelenacomunidad.online)

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = { Name = "santa-elena-cert-${var.environment}" }
}

# ─── Registros DNS para validación del certificado ───────────────────────────

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id         = data.aws_route53_zone.main.zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

# Espera a que ACM valide el certificado antes de continuar
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# ─── Registro A → ALB (dominio raíz) ─────────────────────────────────────────

resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# ─── Registro A → ALB (www) ───────────────────────────────────────────────────

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
