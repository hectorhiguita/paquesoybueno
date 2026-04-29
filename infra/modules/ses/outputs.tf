output "ses_from_email" {
  value = "noreply@${var.domain_name}"
}

output "domain_identity_arn" {
  value = aws_ses_domain_identity.main.arn
}

output "smtp_iam_username" {
  value       = var.create_smtp_iam_user ? aws_iam_user.smtp[0].name : null
  description = "Optional IAM username for SES SMTP integrations"
}

output "smtp_access_key_id" {
  value       = var.create_smtp_iam_user ? aws_iam_access_key.smtp[0].id : null
  sensitive   = true
  description = "Optional SES SMTP access key id"
}

output "smtp_secret_access_key" {
  value       = var.create_smtp_iam_user ? aws_iam_access_key.smtp[0].secret : null
  sensitive   = true
  description = "Optional SES SMTP secret access key"
}

output "smtp_password_v4" {
  value       = var.create_smtp_iam_user ? aws_iam_access_key.smtp[0].ses_smtp_password_v4 : null
  sensitive   = true
  description = "Optional SES SMTP password for SMTP clients"
}
