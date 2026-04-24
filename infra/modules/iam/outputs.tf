output "ecs_task_role_arn"          { value = aws_iam_role.ecs_task.arn }
output "ecs_exec_role_arn"          { value = aws_iam_role.ecs_exec.arn }
output "ecs_task_role_name"         { value = aws_iam_role.ecs_task.name }
output "github_actions_access_key"  { value = aws_iam_access_key.github_actions.id }
output "github_actions_secret_key"  {
  value     = aws_iam_access_key.github_actions.secret
  sensitive = true
}
