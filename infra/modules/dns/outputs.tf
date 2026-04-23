output "certificate_arn" {
  description = "ARN del certificado ACM validado — úsalo en el ALB listener HTTPS"
  value       = aws_acm_certificate_validation.main.certificate_arn
}

output "certificate_status" {
  value = aws_acm_certificate.main.status
}

output "domain_name" {
  value = var.domain_name
}
