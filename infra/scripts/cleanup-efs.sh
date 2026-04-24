#!/bin/bash
# Script para limpiar el directorio /pgdata del EFS antes de iniciar PostgreSQL
# Ejecutar una sola vez cuando el EFS tiene permisos incorrectos

set -e

ECS_CLUSTER="practicas-itm"
TASK_DEF="santa-elena-efs-cleanup"
SUBNET="subnet-03c6fb43f2ade2d57"  # private-1
SG="sg-XXXXXXXXX"  # Reemplaza con el SG de ECS tasks
EFS_ID="fs-0c855663dbb3f6966"
REGION="us-east-1"

echo "Creando task definition temporal para limpieza de EFS..."

cat > /tmp/cleanup-task.json <<EOF
{
  "family": "$TASK_DEF",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [{
    "name": "cleanup",
    "image": "alpine:latest",
    "essential": true,
    "command": ["sh", "-c", "rm -rf /mnt/pgdata/* && echo 'Directorio limpiado'"],
    "mountPoints": [{
      "sourceVolume": "efs",
      "containerPath": "/mnt",
      "readOnly": false
    }]
  }],
  "volumes": [{
    "name": "efs",
    "efsVolumeConfiguration": {
      "fileSystemId": "$EFS_ID",
      "transitEncryption": "ENABLED",
      "rootDirectory": "/"
    }
  }]
}
EOF

aws ecs register-task-definition \
  --cli-input-json file:///tmp/cleanup-task.json \
  --region $REGION

echo "Ejecutando task de limpieza..."
TASK_ARN=$(aws ecs run-task \
  --cluster $ECS_CLUSTER \
  --task-definition $TASK_DEF \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET],securityGroups=[$SG],assignPublicIp=DISABLED}" \
  --region $REGION \
  --query 'tasks[0].taskArn' \
  --output text)

echo "Task iniciada: $TASK_ARN"
echo "Esperando a que complete..."

aws ecs wait tasks-stopped --cluster $ECS_CLUSTER --tasks $TASK_ARN --region $REGION

echo "✓ Limpieza completada. Ahora puedes iniciar el servicio de PostgreSQL."
