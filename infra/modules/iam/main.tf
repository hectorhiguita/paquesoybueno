data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# ─── ECS Task Execution Role (para pull de ECR y logs) ────────────────────────

resource "aws_iam_role" "ecs_exec" {
  name               = "santa-elena-ecs-exec-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy_attachment" "ecs_exec_managed" {
  role       = aws_iam_role.ecs_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Permiso para leer secrets de Secrets Manager
resource "aws_iam_role_policy" "ecs_exec_secrets" {
  name = "read-secrets"
  role = aws_iam_role.ecs_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue", "kms:Decrypt"]
      Resource = "*"
    }]
  })
}

# ─── ECS Task Role (permisos de la app en runtime) ────────────────────────────

resource "aws_iam_role" "ecs_task" {
  name               = "santa-elena-ecs-task-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json
}

resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "s3-access"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AssetsReadWrite"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.assets_bucket,
          "${var.assets_bucket}/*"
        ]
      },
      {
        Sid    = "BackupsWrite"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.backups_bucket,
          "${var.backups_bucket}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "ecs_task_secrets" {
  name = "read-secrets"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = "*"
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task_logs" {
  name = "cloudwatch-logs"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
      Resource = "*"
    }]
  })
}

# ─── IAM User para GitHub Actions (CI/CD) ────────────────────────────────────

resource "aws_iam_user" "github_actions" {
  name = "santa-elena-github-actions-${var.environment}"
  tags = { Purpose = "CI/CD GitHub Actions" }
}

resource "aws_iam_access_key" "github_actions" {
  user = aws_iam_user.github_actions.name
}

resource "aws_iam_user_policy" "github_actions" {
  name = "deploy-policy"
  user = aws_iam_user.github_actions.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      },
      {
        Sid    = "ECRPush"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECSDeployment"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:ListTasks",
          "ecs:DescribeTasks"
        ]
        Resource = "*"
      },
      {
        Sid    = "TerraformState"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
        Resource = "*"
      },
      {
        Sid    = "TerraformManage"
        Effect = "Allow"
        Action = [
          "ec2:*", "ecs:*", "ecr:*", "elasticloadbalancing:*",
          "iam:*", "logs:*", "secretsmanager:*", "s3:*",
          "elasticfilesystem:*", "application-autoscaling:*"
        ]
        Resource = "*"
      },
      {
        Sid    = "PassRole"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = "*"
      }
    ]
  })
}
