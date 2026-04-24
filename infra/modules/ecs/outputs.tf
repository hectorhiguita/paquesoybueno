output "cluster_name"     { value = data.aws_ecs_cluster.main.cluster_name }
output "cluster_arn"      { value = data.aws_ecs_cluster.main.arn }
output "app_service_name" { value = aws_ecs_service.app.name }
output "ecs_sg_id"        { value = aws_security_group.ecs_tasks.id }
