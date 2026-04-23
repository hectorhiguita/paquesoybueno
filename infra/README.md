# Infraestructura — Santa Elena Platform

## Arquitectura AWS

```
Internet
    │
    ▼
[Route 53] ──► [ACM Certificate]
    │
    ▼
[Application Load Balancer] (HTTPS :443 / HTTP :80 → redirect)
    │
    ▼
[ECS Fargate Cluster]
    ├── [Task: app]        Next.js 14  (puerto 3000)
    └── [Task: postgres]   PostgreSQL 16 (puerto 5432)
            │
            ▼
    [EFS Mount] ← datos WAL y pg_data
    [S3: backups] ← pg_dump diario

[S3: assets]   ← imágenes de listings (acceso público CDN)
[S3: backups]  ← dumps de base de datos (privado)
[ECR]          ← imágenes Docker (app + postgres)
[Secrets Manager] ← credenciales y variables sensibles
[CloudWatch]   ← logs y métricas
```

## Módulos Terraform

| Módulo | Descripción |
|--------|-------------|
| `modules/vpc` | VPC, subnets públicas/privadas, NAT Gateway, IGW |
| `modules/s3` | Bucket de assets (imágenes) + bucket de backups |
| `modules/ecr` | Repositorios de imágenes Docker |
| `modules/ecs` | Cluster, task definitions, services (app + postgres) |
| `modules/alb` | Load balancer, target groups, listeners HTTPS |
| `modules/iam` | Roles y políticas para ECS, S3, Secrets Manager |
| `modules/secrets` | AWS Secrets Manager para variables de entorno |
| `modules/efs` | Elastic File System para datos persistentes de PostgreSQL |
| `modules/cloudwatch` | Log groups, métricas y alarmas |

## Variables requeridas en GitHub Secrets

```
AWS_ACCESS_KEY_ID          → Credencial IAM para Terraform y ECR push
AWS_SECRET_ACCESS_KEY      → Credencial IAM
AWS_REGION                 → us-east-1
AWS_ACCOUNT_ID             → 450328359598

# TF State — bucket existente, prefix dedicado a este proyecto
TF_STATE_BUCKET            → practicas-itm-tfstate-450328359598
TF_STATE_KEY               → santa-elena-platform/terraform.tfstate

NEXTAUTH_SECRET            → Secret para NextAuth.js
NEXTAUTH_URL               → https://santaelenacomunidad.online
GOOGLE_CLIENT_ID           → OAuth Google
GOOGLE_CLIENT_SECRET       → OAuth Google
TWILIO_ACCOUNT_SID         → Twilio SMS
TWILIO_AUTH_TOKEN          → Twilio SMS
TWILIO_PHONE_NUMBER        → Número Twilio
VAPID_PUBLIC_KEY           → Web Push
VAPID_PRIVATE_KEY          → Web Push
POSTGRES_PASSWORD          → Contraseña de PostgreSQL

# Dominio y certificado — NO son secrets, están hardcodeados en main.tf
# santaelenacomunidad.online  |  Z03033341JKQ5TU71XOGC
# El ACM se crea y valida automáticamente vía Terraform
```

## Despliegue inicial

```bash
# El bucket de estado ya existe: practicas-itm-tfstate-450328359598
# El prefix santa-elena-platform/ se crea automáticamente en el primer apply

cd infra
terraform init \
  -backend-config="bucket=practicas-itm-tfstate-450328359598" \
  -backend-config="key=santa-elena-platform/terraform.tfstate" \
  -backend-config="region=us-east-1"

terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

## Recursos existentes reutilizados

| Recurso | ID / ARN |
|---------|----------|
| VPC | `vpc-05b9e9c5f8cccd4bd` (practicas-itm-vpc) |
| Subnet pública 1 | `subnet-00e42cb3d170a0a01` (us-east-1a) |
| Subnet pública 2 | `subnet-0e10919be6e6ceb5b` (us-east-1b) |
| Subnet privada 1 | `subnet-03c6fb43f2ade2d57` (us-east-1a) |
| Subnet privada 2 | `subnet-01faa754860e64f4c` (us-east-1b) |
| ECS Cluster | `arn:aws:ecs:us-east-1:450328359598:cluster/practicas-itm` |
| ECR | `450328359598.dkr.ecr.us-east-1.amazonaws.com/practicas-itm` |
| TF State Bucket | `practicas-itm-tfstate-450328359598` |
| TF State Key | `santa-elena-platform/terraform.tfstate` |
| Dominio | `santaelenacomunidad.online` |
| Route 53 Hosted Zone | `Z03033341JKQ5TU71XOGC` |
| ACM | Generado automáticamente por Terraform (validación DNS) |

El pipeline de GitHub Actions (`.github/workflows/deploy.yml`) hace:
1. Build de la imagen Docker de Next.js
2. Push a ECR
3. `terraform apply` para actualizar la infraestructura
4. Fuerza nuevo deployment en ECS (rolling update)
