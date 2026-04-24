output "ses_from_email" {
  value = "noreply@${var.domain_name}"
}

output "domain_identity_arn" {
  value = aws_ses_domain_identity.main.arn
}
