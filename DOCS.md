# Santa Elena Platform — Documentación Técnica

## 1. Visión general

**Framework:** Next.js 14 (App Router, modo `standalone`)  
**Base de datos:** PostgreSQL 16 con Prisma ORM  
**Auth:** NextAuth.js v5 (JWT 15 min) + JWT separado para panel admin  
**Storage:** Cloudflare R2 (S3-compatible) para imágenes  
**Email:** AWS SES  
**SMS:** AWS SNS  
**Deploy:** AWS ECS (EC2) + ECR + ALB + Route53 · IaC con Terraform  

URL producción: `https://santaelenacomunidad.online`

---

## 2. Estructura de directorios

```
src/
├── app/
│   ├── (public)/           # Rutas sin autenticación
│   │   ├── page.tsx                   # Landing pública
│   │   ├── login/page.tsx             # Login con email/password + Google (env-gated)
│   │   ├── register/                  # Registro multi-paso (nombre→vereda→confirmar)
│   │   ├── activate/                  # Activación OTP por SMS
│   │   ├── marketplace/               # Listado y detalle de ventas/trueques
│   │   ├── services/                  # Listado y detalle de servicios
│   │   └── complete-profile/          # Completar perfil para usuarios de Google
│   ├── (auth)/             # Rutas que requieren sesión activa
│   │   ├── dashboard/page.tsx         # Panel del usuario
│   │   ├── listings/new/              # Crear publicación
│   │   ├── messages/                  # Mensajería
│   │   ├── notifications/             # Notificaciones
│   │   └── tools/                     # Herramientas compartidas
│   ├── admin/              # Panel de administración (cookie admin_session)
│   │   ├── page.tsx                   # Dashboard admin (publicaciones + reportes + categorías)
│   │   ├── stats/page.tsx             # Analytics: usuarios, publicaciones, SEO
│   │   ├── layout.tsx                 # Header + auto-logout por inactividad
│   │   ├── login/page.tsx             # Login admin (credenciales env)
│   │   ├── AdminListingsPanel.tsx     # Tabla de publicaciones con toggle activo/inactivo
│   │   └── AdminCategoriesPanel.tsx   # CRUD de categorías
│   └── api/
│       ├── auth/[...nextauth]/        # NextAuth handler
│       ├── health/                    # GET /api/health → { status: "ok" }
│       └── v1/                        # API REST (ver §4)
├── components/
│   ├── layout/Navbar.tsx              # Navegación principal
│   ├── ui/                            # Primitivos UI (Button, Input, Select, Toast, …)
│   ├── dashboard/
│   │   ├── DashboardListings.tsx      # Tabla de mis publicaciones con toggle
│   │   └── EditProfilePanel.tsx       # Formulario edición de perfil (vereda, foto, teléfono)
│   ├── map/                           # Mapa Leaflet + selector de veredas
│   └── notifications/NotificationBell.tsx
├── lib/
│   ├── auth/
│   │   ├── config.ts          # NextAuth config (Credentials + Google)
│   │   ├── session.ts         # getSessionContext / requireSessionContext (headers)
│   │   └── password.ts        # PBKDF2 hash/verify
│   ├── admin/session.ts       # JWT admin: sign / verify / cookie helpers
│   ├── api/errors.ts          # Errors.validation / .unauthorized / .notFound / …
│   ├── prisma.ts              # Global PrismaClient + getPrismaWithCommunity()
│   ├── storage.ts             # uploadImage() → Cloudflare R2
│   ├── email.ts               # sendEmail / sendActivationEmail (AWS SES)
│   ├── sms.ts                 # sendVerificationSms() → AWS SNS
│   ├── verification.ts        # storeVerificationCode / verifyCode / hasPendingCode
│   ├── activation-tokens.ts   # generateActivationToken / validateActivationToken
│   ├── reset-tokens.ts        # Tokens de restablecimiento de contraseña (30 min)
│   ├── pending-activation.ts  # Estado temporal durante activación
│   ├── constants.ts           # SANTA_ELENA_COMMUNITY_ID, API_HEADERS()
│   ├── vereda-metadata.ts     # Coordenadas y metadatos de veredas
│   ├── tool-meta.ts           # Serialización de metadatos de herramientas
│   └── validations/           # Schemas Zod (auth, listing, rating)
├── hooks/
│   ├── useOfflineQueue.ts     # Cola de peticiones offline
│   ├── useNotifications.ts    # Notificaciones push
│   └── useGeolocation.ts      # Geolocalización
├── middleware.ts              # Protección admin + multi-tenancy headers
└── types/                     # TypeScript types (auth, api, prisma, next-auth.d.ts)
```

---

## 3. Base de datos (Prisma)

**Schema:** `prisma/schema.prisma`  
**Migraciones:** `prisma/migrations/` (numeradas 0001–0009)

### Modelos principales

| Modelo | Tabla | Propósito |
|--------|-------|-----------|
| `Community` | `communities` | Raíz multi-tenant (Santa Elena + futuras comunidades) |
| `User` | `users` | Miembros. Campos clave: `role` (member/admin), `status`, `phoneVerified`, `veredaId`, `avatarUrl` |
| `Vereda` | `veredas` | Barrios/sectores dentro de la comunidad |
| `Category` | `categories` | Categorías de publicaciones (activas/inactivas) |
| `Listing` | `listings` | Publicaciones: service, sale, rent, trade, tool |
| `ListingImage` | `listing_images` | Hasta 5 imágenes por publicación |
| `Rating` | `ratings` | Calificaciones 1–5 estrellas |
| `MessageThread` | `message_threads` | Hilos de mensajería entre 2 usuarios |
| `Message` | `messages` | Mensajes individuales |
| `Notification` | `notifications` | Notificaciones con expiración |
| `Report` | `reports` | Reportes de abuso |
| `Reservation` | `reservations` | Reservas de herramientas (con fechas) |
| `ActivationToken` | `activation_tokens` | Links de activación de cuenta (24 h) |
| `VerificationCode` | `verification_codes` | OTP SMS para verificación de teléfono (10 min) |
| `VeredaFollow` | `vereda_follows` | Seguimiento de veredas por usuario |

### Enums

```prisma
UserRole:        member | admin
UserStatus:      active | locked | suspended | under_review
ListingType:     service | sale | rent | trade | tool
ListingStatus:   active | inactive | flagged | pending_review
ReportStatus:    pending | resolved | dismissed
ReservationStatus: pending | confirmed | cancelled | completed
```

### Agregar migraciones

```bash
npx prisma migrate dev --name descripcion_del_cambio
# Genera SQL en prisma/migrations/NNNN_descripcion/migration.sql
npx prisma generate  # Regenera el cliente Prisma
```

---

## 4. API REST — Mapa completo

Base: `/api/v1/`

### Autenticación de usuarios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Crea usuario, envía email de activación |
| POST | `/auth/login` | No | Login email+password (bloqueo tras 5 intentos) |
| GET/POST | `/auth/activate` | No | Valida token de activación, envía OTP SMS |
| POST | `/auth/activate/verify-otp` | No | Verifica OTP, completa registro |
| POST | `/auth/verify` | No | Verifica teléfono con código SMS |
| POST | `/auth/reset-password` | No | Solicita restablecimiento de contraseña |

### Perfil de usuario

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/users/me` | Sí | Obtiene datos del perfil propio |
| PATCH | `/users/me` | Sí | Actualiza vereda y/o nombre |
| POST | `/users/me/avatar` | Sí | Sube foto de perfil (multipart) |
| POST | `/users/me/phone` | Sí | Inicia cambio de teléfono (envía OTP) |
| POST | `/users/me/phone/verify` | Sí | Confirma OTP y actualiza teléfono |

### Auth del panel admin

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/admin/auth/login` | No | Login admin con credenciales ENV, emite admin_session cookie |
| POST | `/admin/auth/logout` | Admin | Elimina cookie admin_session |
| POST | `/admin/auth/promote` | Usuario admin | Emite admin_session para usuarios con role=admin en DB |

### Publicaciones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/listings` | No | Lista con filtros (category, vereda, type, status, minRating, page, limit) |
| POST | `/listings` | Sí | Crea publicación (auto-flagea si contiene URLs/teléfonos) |
| GET | `/listings/:id` | No | Detalle de publicación |
| PATCH | `/listings/:id` | Sí (autor) | Actualiza publicación |
| DELETE | `/listings/:id` | Sí (autor) | Elimina publicación |
| POST | `/listings/:id/images` | Sí (autor) | Sube 1–5 imágenes (JPEG/PNG, ≤5 MB) |

### Servicios y Herramientas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/services` | No | Lista de servicios (type=service) |
| GET | `/tools` | No | Lista de herramientas con calendario |
| POST | `/tools` | Sí | Crea herramienta |
| GET | `/tools/:id/reservations` | No | Reservas de una herramienta |
| POST | `/tools/:id/reservations` | Sí | Solicita reserva |
| PATCH | `/tools/:id/reservations/:resId/approve` | Sí (propietario) | Aprueba reserva |
| PATCH | `/tools/:id/reservations/:resId/cancel` | Sí | Cancela reserva |
| POST | `/tools/cleanup` | Admin | Cron: completa reservas expiradas |

### Calificaciones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/ratings` | No | Calificaciones de un proveedor (providerId) |
| POST | `/ratings` | Sí | Crea calificación 1–5 (dedup 30 días, no auto-calificación) |

### Mensajería

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/messages` | Sí | Lista de hilos del usuario |
| POST | `/messages` | Sí | Envía mensaje (crea hilo si no existe) |
| GET | `/messages/:threadId` | Sí | Mensajes de un hilo |
| GET | `/messages/stream` | Sí | SSE stream de mensajes en tiempo real |

### Notificaciones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/notifications` | Sí | Notificaciones del usuario |
| PATCH | `/notifications/:id/read` | Sí | Marca notificación como leída |

### Reportes

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/reports` | Sí | Reporta publicación o usuario |
| GET | `/admin/reports` | Admin | Lista de reportes pendientes |

### Admin — Publicaciones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/admin/listings` | Admin | Lista publicaciones con filtro de estado |
| PATCH | `/admin/listings/:id` | Admin | Cambia estado (active/inactive/flagged/pending_review) |
| DELETE | `/admin/listings/:id` | Admin | Elimina publicación |
| POST | `/admin/featured` | Admin | Marca publicación como destacada |

### Admin — Categorías y Miembros

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET/POST | `/admin/categories` | Admin | Lista / crea categorías |
| PATCH | `/admin/categories/:id` | Admin | Actualiza categoría |
| PATCH | `/admin/members/:id/verify` | Admin | Otorga insignia de proveedor verificado |
| PATCH | `/admin/members/:id/suspend` | Admin | Suspende usuario |
| GET | `/admin/stats` | Admin | Estadísticas y analytics de la plataforma |

### Comunidades y Export

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET/POST | `/communities` | No | Lista / crea comunidades |
| GET | `/export` | Admin | Exporta datos (CSV/JSON) |

---

## 5. Sistema de autenticación

### Sesión de usuario (NextAuth v5)

**Archivo clave:** `src/lib/auth/config.ts`

- Estrategia: JWT, maxAge 15 minutos
- Proveedores: Credentials (email+password) y Google (env-gated)
- Cookie: `next-auth.session-token` (dev) / `__Secure-next-auth.session-token` (prod)

**Estructura del token JWT:**
```typescript
{
  userId: string
  communityId: string
  role: "member" | "admin"
  isVerifiedProvider: boolean
  phoneVerified: boolean
  requiresPhoneVerification?: boolean  // Google users sin teléfono verificado
}
```

**Extracción en API routes:**
```typescript
import { requireSessionContext } from "@/lib/auth/session";

const { context, error } = await requireSessionContext(request);
// context = { userId, communityId, role }
```

### Sesión del panel admin

**Archivo clave:** `src/lib/admin/session.ts`

- Cookie: `admin_session` (httpOnly, secure, SameSite=Lax)
- Algoritmo: HS256 con NEXTAUTH_SECRET
- Duración: 15 minutos (ventana deslizante)
- Audience: "admin-panel"

**Acceso admin:**
- Opción A: Login en `/admin/login` con `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` (env)
- Opción B: Usuarios con `role=admin` en DB pueden usar `POST /api/v1/admin/auth/promote` desde su dashboard

**Generación del hash admin:**
```bash
node scripts/gen-admin-hash.mjs <password>
```

**Extracción en admin API routes:**
```typescript
import { requireAdminSessionFromRequest } from "@/lib/admin/session";

const adminSession = await requireAdminSessionFromRequest(request);
if (!adminSession) return Errors.unauthorized();
```

### Seguridad de contraseñas

**Archivo:** `src/lib/auth/password.ts`  
Algoritmo: PBKDF2-SHA256, 100,000 iteraciones, 256 bits, timing-safe.  
Formato: `pbkdf2:<saltHex>:<hashHex>`

### Bloqueo de cuenta

- Máximo 5 intentos fallidos
- Bloqueo: 15 minutos
- Notificación por email al bloquearse

---

## 6. Subida de imágenes

**Servicio:** Cloudflare R2 (compatible S3)  
**Archivo:** `src/lib/storage.ts`

### Variables de entorno requeridas

| Variable | Descripción |
|----------|-------------|
| `R2_ACCOUNT_ID` | ID de cuenta de Cloudflare |
| `R2_ACCESS_KEY_ID` | Access key del token R2 |
| `R2_SECRET_ACCESS_KEY` | Secret del token R2 |
| `R2_BUCKET_NAME` | Nombre del bucket (`santa-elena-images`) |
| `R2_PUBLIC_URL` | URL pública del bucket (ej: `https://pub-xxx.r2.dev` o dominio personalizado) |

> **IMPORTANTE:** `R2_PUBLIC_URL` debe ser la URL pública del bucket (no el endpoint de la API). Para habilitarla, activa "Public Access" en el dashboard de Cloudflare para el bucket. Formato: `https://pub-xxx.r2.dev` o un dominio personalizado.

### Ruta de upload

`POST /api/v1/listings/:id/images`
- Multipart/form-data, campo `images` (múltiples archivos)
- Máx 5 imágenes, solo JPEG/PNG, ≤5 MB cada una
- Los archivos se guardan en R2 como `listings/{listingId}/{uuid}.{ext}`
- La URL pública se guarda en `listing_images.url`

### Avatares de usuario

`POST /api/v1/users/me/avatar`
- Campo: `avatar` (un solo archivo)
- Se guarda como `avatars/{userId}/{uuid}.{ext}`
- La URL se guarda en `users.avatar_url`

---

## 7. SMS (AWS SNS)

**Archivo:** `src/lib/sms.ts`

En dev/test: imprime en consola en lugar de enviar.  
En producción: envía via AWS SNS con `SMSType: Transactional` y `SenderID: SantaElena`.

**Sandbox:** Para salir del sandbox de SNS y enviar a Colombia (+57), se requiere un caso de soporte a AWS especificando el país de destino.

---

## 8. Email (AWS SES)

**Archivo:** `src/lib/email.ts`  
**Variable:** `SES_FROM_EMAIL` (ej: `noreply@santaelenacomunidad.online`)

---

## 9. Multi-tenancy

La plataforma soporta múltiples comunidades. La comunidad se detecta por:
1. Header `X-Community-ID` (UUID explícito)
2. Subdominio (ej: `santa-elena.domain.com` → slug `santa-elena`)
3. Query param `?communityId=...`

**ID de Santa Elena:** Definido en `src/lib/constants.ts` como `SANTA_ELENA_COMMUNITY_ID`.

---

## 10. Middleware

**Archivo:** `src/middleware.ts`

Corre en Edge Runtime. Dos responsabilidades:

1. **Protección de rutas admin** (`/admin/*`, `/api/v1/admin/*`):
   - Verifica cookie `admin_session` (JWT HS256)
   - Si inválida: redirige a `/admin/login` (páginas) o devuelve 401 (APIs)
   - Renueva la cookie en cada request (ventana deslizante)

2. **Inyección de contexto de comunidad** (`/api/v1/*`):
   - Inyecta `X-Community-ID` o `X-Community-Slug` en los headers de la request

---

## 11. Variables de entorno

### Base de datos
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### NextAuth
```env
NEXTAUTH_URL=https://santaelenacomunidad.online
NEXTAUTH_SECRET=<secreto-largo-y-aleatorio>
```

### Google OAuth (opcional)
```env
GOOGLE_CLIENT_ID=<id-de-app-google>
GOOGLE_CLIENT_SECRET=<secret-de-app-google>
NEXT_PUBLIC_GOOGLE_ENABLED=true
```
Para obtenerlos: [Google Cloud Console](https://console.cloud.google.com/) → APIs → Credentials → OAuth 2.0 Client ID. URI de callback: `https://santaelenacomunidad.online/api/auth/callback/google`

### Cloudflare R2
```env
R2_ACCOUNT_ID=<account-id>
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET_NAME=santa-elena-images
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

### AWS SNS (SMS)
```env
AWS_REGION=us-east-1
# Credenciales via IAM task role en ECS (no se definen como env vars)
```

### AWS SES (Email)
```env
SES_FROM_EMAIL=noreply@santaelenacomunidad.online
```

### Admin
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=pbkdf2:<salt>:<hash>
# Generar: node scripts/gen-admin-hash.mjs <password>
```

### Build (inyectados por CI/CD)
```env
NEXT_PUBLIC_APP_VERSION=<git-tag>
NEXT_PUBLIC_GIT_COMMIT=<sha-completo>
```

---

## 12. CI/CD — Deploy

**Archivo:** `.github/workflows/deploy.yml`

Trigger: push a `main` con cambios en `src/**`, `prisma/**`, etc.

**3 jobs en secuencia:**
1. **Tests** — `npm run test -- --run`
2. **Build & Push ECR** — Docker build con `APP_VERSION` y `GIT_COMMIT` como build args → push a ECR
3. **Deploy ECS** — Actualiza la task definition con la nueva imagen y despliega

**ECR:** `450328359598.dkr.ecr.us-east-1.amazonaws.com/practicas-itm`  
**Cluster ECS:** `practicas-itm`  
**Servicio ECS:** `santa-elena-app-prod`

---

## 13. Infraestructura (Terraform)

**Directorio:** `infra/`

```
infra/
├── main.tf              # Orquestación de módulos
├── variables.tf         # Variables de entrada
├── environments/
│   └── prod.tfvars      # Valores de producción
└── modules/
    ├── vpc/             # VPC, subnets, NAT, IGW
    ├── ecr/             # Registros Docker
    ├── ecs/             # Cluster, task definitions, servicios
    ├── alb/             # Load balancer, HTTPS
    ├── iam/             # Roles y políticas (ECS task role con SNS + S3)
    ├── secrets/         # AWS Secrets Manager
    ├── efs/             # Almacenamiento persistente para PostgreSQL
    ├── cloudwatch/      # Logs y alarmas
    └── dns/             # Route 53 + ACM
```

**Aplicar cambios:**
```bash
cd infra
terraform init -backend-config="bucket=practicas-itm-tfstate-450328359598" \
  -backend-config="key=santa-elena-platform/terraform.tfstate"
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
```

---

## 14. Flujos de negocio

### Registro de usuario
1. `POST /auth/register` → crea usuario con `status=active` pero `phoneVerified=false`
2. AWS SES envía email con link de activación (token 24h)
3. Usuario hace click → `GET /auth/activate?token=...` → valida token, envía OTP por SMS
4. `POST /auth/activate/verify-otp` → verifica OTP → `phoneVerified=true`
5. Usuario crea contraseña (incluida en el flow de activación)
6. Login normal con `POST /auth/login`

### Login con Google (OAuth)
1. Usuario hace click en "Ingresar con Google"
2. Si ya tiene cuenta en DB → login normal, redirige a `/dashboard`
3. Si no tiene cuenta → redirige a `/complete-profile` con datos de Google pre-rellenados
4. En `/complete-profile`: confirma nombre, ingresa vereda y teléfono → OTP por SMS
5. Al verificar OTP → crea cuenta en DB → actualiza sesión → redirige a `/dashboard`

### Publicar anuncio
1. Usuario autenticado → `POST /listings` con datos
2. Si contiene URL/teléfono → se guarda como `status=flagged` (pendiente revisión admin)
3. Subir imágenes → `POST /listings/:id/images` (hasta 5)
4. Publicación visible en marketplace/servicios

### Panel Admin
- Acceso via `/admin/login` con credenciales de env (`ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH`)
- Usuarios con `role=admin` en DB pueden acceder directamente desde su dashboard
- Gestión de: publicaciones, categorías, miembros, reportes, estadísticas

---

## 15. Componentes UI clave

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| `Navbar` | `src/components/layout/Navbar.tsx` | Navegación principal, detecta sesión |
| `DashboardListings` | `src/components/dashboard/DashboardListings.tsx` | Tabla de mis publicaciones con toggle activo/inactivo |
| `EditProfilePanel` | `src/components/dashboard/EditProfilePanel.tsx` | Formulario para editar vereda, foto y teléfono |
| `AdminListingsPanel` | `src/app/admin/AdminListingsPanel.tsx` | Admin: tabla de todas las publicaciones con filtros |
| `AdminCategoriesPanel` | `src/app/admin/AdminCategoriesPanel.tsx` | Admin: CRUD de categorías |
| `SessionExpiryWarning` | `src/components/ui/SessionExpiryWarning.tsx` | Popup de aviso 5 min antes de expirar sesión |
| `VersionBadge` | `src/components/ui/VersionBadge.tsx` | Badge `v{version} · {commit}` en esquina inferior derecha |
| `VeredaMap` | `src/components/map/VeredaMap.tsx` | Mapa Leaflet de veredas de Santa Elena |
| `NotificationBell` | `src/components/notifications/NotificationBell.tsx` | Campana de notificaciones en navbar |

---

## 16. Tests

**Framework:** Vitest  
**Ubicación:** Archivos `__tests__/route.test.ts` junto a cada ruta API

**Ejecutar:**
```bash
npm run test          # Modo watch
npm run test -- --run # Una sola ejecución (CI)
```

Los tests usan `vi.mock("@/lib/prisma")` para aislar la base de datos y `vi.mock("@/lib/verification")` para el sistema de OTP.

---

## 17. Guía de desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores

# 3. Sincronizar base de datos
npx prisma migrate dev
npx prisma generate

# 4. Iniciar servidor de desarrollo
npm run dev   # http://localhost:3000

# 5. Panel admin local
# Generar hash: node scripts/gen-admin-hash.mjs mypassword
# Agregar en .env.local: ADMIN_USERNAME=admin  ADMIN_PASSWORD_HASH=pbkdf2:...
```

---

## 18. Convenciones de código

- API routes: `src/app/api/v1/{recurso}/route.ts`
- Error responses: siempre via `Errors.*` de `@/lib/api/errors.ts`
- Auth en API: `requireSessionContext(request)` para usuarios, `requireAdminSessionFromRequest(request)` para admin
- Componentes cliente: `"use client"` al inicio del archivo
- Paginación: parámetros `page` (default 1) y `limit` (default 20)
- UUIDs: validar con regex en middleware antes de usar en queries
