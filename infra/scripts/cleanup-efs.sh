#!/bin/bash
# Limpia el directorio /pgdata del EFS para permitir que PostgreSQL inicialice
set -e

REGION="us-east-1"
CLUSTER="practicas-itm"
EFS_ID="fs-0c855663dbb3f6966"
ACCESS_POINT_ID="fsap-0b7cbc806771c3d85"
SUBNET="subnet-03c6fb43f2ade2d57"

echo "Obteniendo roles IAM..."
EXEC_ROLE=$(aws iam get-role \
  --role-name santa-elena-ecs-exec-prod \
  --query "Role.Arn" --output text --region $REGION)

TASK_ROLE=$(aws iam get-role \
  --role-name santa-elena-ecs-task-prod \
  --query "Role.Arn" --output text --region $REGION)

echo "Execution role: $EXEC_ROLE"
echo "Task role:      $TASK_ROLE"

echo "Obteniendo SG de ECS tasks..."
SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=santa-elena-ecs-tasks-prod" \
  --query "SecurityGroups[0].GroupId" \
  --output text --region $REGION)

echo "Security group: $SG_ID"

echo "Registrando task definition de limpieza..."
aws ecs register-task-definition \
  --family efs-cleanup \
  --network-mode awsvpc \
  --requires-compatibilities FARGATE \
  --cpu 256 --memory 512 \
  --execution-role-arn "$EXEC_ROLE" \
  --task-role-arn "$TASK_ROLE" \
  --container-definitions '[{
    "name": "cleanup",
    "image": "alpine:latest",
    "essential": true,
    "user": "root",
    "command": ["sh", "-c", "rm -rf /pgdata/* /pgdata/.[!.]* 2>/dev/null; ls -la /pgdata; echo DONE"],
    "mountPoints": [{"sourceVolume": "efs", "containerPath": "/pgdata", "readOnly": false}],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/santa-elena-postgres-prod",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "cleanup"
      }
    }
  }]' \
  --volumes "[{
    \"name\": \"efs\",
    \"efsVolumeConfiguration\": {
      \"fileSystemId\": \"$EFS_ID\",
      \"transitEncryption\": \"ENABLED\",
      \"authorizationConfig\": {
        \"accessPointId\": \"$ACCESS_POINT_ID\",
        \"iam\": \"ENABLED\"
      }
    }
  }]" \
  --region $REGION

echo "Ejecutando task de limpieza..."
TASK_ARN=$(aws ecs run-task \
  --cluster $CLUSTER \
  --launch-type FARGATE \
  --task-definition efs-cleanup \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET],securityGroups=[$SG_ID],assignPublicIp=DISABLED}" \
  --region $REGION \
  --query "tasks[0].taskArn" \
  --output text)

echo "Task iniciada: $TASK_ARN"
echo "Esperando a que complete (max 2 min)..."

aws ecs wait tasks-stopped \
  --cluster $CLUSTER \
  --tasks "$TASK_ARN" \
  --region $REGION

echo "Verificando resultado..."
EXIT_CODE=$(aws ecs describe-tasks \
  --cluster $CLUSTER \
  --tasks "$TASK_ARN" \
  --query "tasks[0].containers[0].exitCode" \
  --output text --region $REGION)

if [ "$EXIT_CODE" = "0" ]; then
  echo "✓ Directorio limpiado exitosamente"
  echo ""
  echo "Reiniciando servicio de PostgreSQL..."
  aws ecs update-service \
    --cluster $CLUSTER \
    --service santa-elena-postgres-prod \
    --force-new-deployment \
    --region $REGION > /dev/null
  echo "✓ Servicio reiniciado"
else
  echo "✗ La task falló con exit code: $EXIT_CODE"
  echo "Revisa los logs en CloudWatch: /ecs/santa-elena-postgres-prod/cleanup"
fi
