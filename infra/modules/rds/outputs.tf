output "endpoint" {
  description = "RDS endpoint (host:port)"
  value       = aws_db_instance.main.endpoint
}

output "host" {
  description = "RDS hostname"
  value       = aws_db_instance.main.address
}

output "port" {
  value = aws_db_instance.main.port
}

output "database_url" {
  description = "Full DATABASE_URL for Prisma"
  value       = "postgresql://postgres:${var.postgres_password}@${aws_db_instance.main.endpoint}/santa_elena?schema=public"
  sensitive   = true
}
