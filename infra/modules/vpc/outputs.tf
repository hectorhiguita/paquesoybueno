output "vpc_id" {
  value = data.aws_vpc.main.id
}

output "vpc_cidr" {
  value = data.aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  value = var.public_subnet_ids
}

output "private_subnet_ids" {
  value = var.private_subnet_ids
}
