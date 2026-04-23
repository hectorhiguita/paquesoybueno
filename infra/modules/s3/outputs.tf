output "assets_bucket_name" { value = aws_s3_bucket.assets.bucket }
output "assets_bucket_arn"  { value = aws_s3_bucket.assets.arn }
output "assets_bucket_url"  { value = "https://${aws_s3_bucket.assets.bucket}.s3.${var.aws_region}.amazonaws.com" }
output "backups_bucket_name" { value = aws_s3_bucket.backups.bucket }
output "backups_bucket_arn"  { value = aws_s3_bucket.backups.arn }
