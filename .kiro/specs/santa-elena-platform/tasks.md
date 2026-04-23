# Implementation Plan: Santa Elena Platform

## Overview

Implementación incremental de la PWA comunitaria Santa Elena usando Next.js 14 (App Router), PostgreSQL con RLS, Prisma, NextAuth.js v5, Workbox y fast-check para property-based testing. Cada tarea construye sobre la anterior y termina con integración funcional.

## Tasks

- [x] 1. Configurar estructura del proyecto y base de datos
  - Inicializar proyecto Next.js 14 con App Router, Tailwind CSS, TypeScript strict
  - Configurar Prisma con PostgreSQL 16; crear schema inicial con modelos: `Community`, `User`, `Vereda`, `Category`, `Listing`, `ListingImage`, `Rating`, `MessageThread`, `Message`, `Notification`, `Report`, `Reservation`, `VeredaFollow`
  - Habilitar Row-Level Security en PostgreSQL y definir políticas RLS por `community_id`
  - Configurar `next-pwa` con Workbox y estructura de Service Worker
  - Configurar Zod para validaciones compartidas cliente/servidor
  - Configurar fast-check como dependencia de testing
  - _Requirements: 12.1, 12.2_

- [x] 2. Implementar autenticación y registro de usuarios
  - [x] 2.1 Implementar registro de Member con validación de teléfono colombiano y email RFC 5322
    - Crear Zod schemas para registro en `src/lib/validations/auth.ts`
    - Crear Route Handler `POST /api/v1/auth/register` con validación y manejo de duplicados genérico
    - Implementar envío de código de verificación por SMS (Twilio o similar)
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 2.2 Escribir property test: Validación de formato de registro (Property 1)
    - **Property 1: Validación de formato de registro**
    - **Validates: Requirements 1.1**

  - [x] 2.3 Escribir property test: Mensaje de error de duplicado no revela campo (Property 2)
    - **Property 2: Mensaje de error de duplicado no revela campo**
    - **Validates: Requirements 1.4**

  - [x] 2.4 Implementar verificación de código y activación de cuenta
    - Crear Route Handler `POST /api/v1/auth/verify`
    - _Requirements: 1.3_

  - [x] 2.5 Configurar NextAuth.js v5 con credenciales y Google OAuth
    - Configurar provider de credenciales con contador de intentos fallidos y bloqueo de cuenta
    - Configurar Google OAuth con verificación de teléfono en primer login
    - Crear Route Handler `POST /api/v1/auth/login`
    - _Requirements: 1.5, 1.6, 1.7, 1.8_

  - [x] 2.6 Escribir property test: Contador de intentos fallidos incrementa siempre (Property 3)
    - **Property 3: Contador de intentos fallidos incrementa siempre**
    - **Validates: Requirements 1.6**

  - [x] 2.7 Implementar reset de contraseña con link de expiración 30 minutos
    - Crear Route Handlers `POST /api/v1/auth/reset-password`
    - _Requirements: 1.9_

- [x] 3. Checkpoint — Asegurar que todos los tests de autenticación pasen
  - Verificar flujos de registro, verificación, login y reset. Consultar al usuario si surgen dudas.

- [x] 4. Implementar middleware de multi-tenancy y contexto de comunidad
  - Crear middleware Next.js que inyecta `X-Community-ID` desde subdominio o header
  - Configurar contexto de tenant en Prisma client para que RLS filtre automáticamente
  - Crear Route Handlers `GET /api/v1/communities` y `POST /api/v1/communities`
  - _Requirements: 12.1, 12.2_

  - [x] 4.1 Escribir property test: Aislamiento de datos entre zonas comunitarias (Property 26)
    - **Property 26: Aislamiento de datos entre zonas comunitarias**
    - **Validates: Requirements 12.2**

- [x] 5. Implementar directorio de servicios y marketplace (Listings)
  - [x] 5.1 Crear API de Listings con validación de campos requeridos
    - Crear Zod schemas para Listing en `src/lib/validations/listing.ts`
    - Implementar Route Handlers: `GET /api/v1/listings`, `POST /api/v1/listings`, `GET /api/v1/listings/:id`, `PATCH /api/v1/listings/:id`, `DELETE /api/v1/listings/:id`
    - Implementar lógica de bloqueo por reportes activos (≥3)
    - _Requirements: 3.1, 3.2, 3.3, 3.7_

  - [x] 5.2 Escribir property test: Validación de campos requeridos en creación de listing (Property 8)
    - **Property 8: Validación de campos requeridos en creación de listing**
    - **Validates: Requirements 3.1, 8.1**

  - [x] 5.3 Escribir property test: Bloqueo de creación de listing por reportes activos (Property 10)
    - **Property 10: Bloqueo de creación de listing por reportes activos**
    - **Validates: Requirements 3.7**

  - [x] 5.4 Implementar filtros del directorio: categoría, vereda, rating mínimo, disponibilidad
    - Añadir query params a `GET /api/v1/listings` y `GET /api/v1/services`
    - Implementar ordenamiento: Verified_Provider primero cuando no hay orden explícito
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 5.5 Escribir property test: Filtro de categoría es exhaustivo (Property 4)
    - **Property 4: Filtro de categoría es exhaustivo**
    - **Validates: Requirements 2.2**

  - [x] 5.6 Escribir property test: Filtros de directorio son correctos y componibles (Property 5)
    - **Property 5: Filtros de directorio son correctos y componibles**
    - **Validates: Requirements 2.3, 2.4, 2.5**

  - [x] 5.7 Escribir property test: Listings de proveedores verificados preceden a no verificados (Property 6)
    - **Property 6: Listings de proveedores verificados preceden a no verificados**
    - **Validates: Requirements 2.6**

  - [x] 5.8 Implementar detalle de listing con todos los campos requeridos
    - Asegurar que `GET /api/v1/listings/:id` retorna: nombre del proveedor, categoría, vereda, rating promedio, trabajos completados, descripción y opciones de contacto
    - _Requirements: 2.7_

  - [x] 5.9 Escribir property test: Detalle de listing contiene todos los campos requeridos (Property 7)
    - **Property 7: Detalle de listing contiene todos los campos requeridos**
    - **Validates: Requirements 2.7**

  - [x] 5.10 Implementar validación y upload de imágenes a Cloudflare R2
    - Validar: máximo 5 imágenes, ≤5 MB cada una, formato JPEG o PNG
    - Integrar cliente R2 en `src/lib/storage.ts`
    - _Requirements: 3.4_

  - [x] 5.11 Escribir property test: Validación de imágenes en listings (Property 9)
    - **Property 9: Validación de imágenes en listings**
    - **Validates: Requirements 3.4**

  - [x] 5.12 Implementar validación de vereda contra lista predefinida
    - Añadir validación Zod que rechaza veredas fuera de la lista de la comunidad
    - _Requirements: 6.2_

  - [x] 5.13 Escribir property test: Validación de vereda contra lista predefinida (Property 16)
    - **Property 16: Validación de vereda contra lista predefinida**
    - **Validates: Requirements 6.2**

  - [x] 5.14 Escribir property test: Privacidad de coordenadas en listings (Property 15)
    - **Property 15: Privacidad de coordenadas en listings**
    - **Validates: Requirements 6.1**

- [x] 6. Checkpoint — Asegurar que todos los tests de listings y directorio pasen
  - Verificar filtros, validaciones y privacidad de ubicación. Consultar al usuario si surgen dudas.

- [x] 7. Implementar sistema de confianza (Trust System)
  - [x] 7.1 Crear API de ratings con cálculo de promedio y deduplicación
    - Crear Route Handlers: `POST /api/v1/ratings`, `GET /api/v1/ratings?providerId=`
    - Implementar cálculo de media aritmética redondeada a un decimal
    - Implementar deduplicación: rechazar segundo rating del mismo par en 30 días
    - Limitar comentarios a 500 caracteres
    - _Requirements: 4.1, 4.2, 4.3, 4.6, 4.7_

  - [x] 7.2 Escribir property test: Cálculo correcto del rating promedio (Property 11)
    - **Property 11: Cálculo correcto del rating promedio**
    - **Validates: Requirements 4.2**

  - [x] 7.3 Escribir property test: Deduplicación de ratings en ventana de 30 días (Property 12)
    - **Property 12: Deduplicación de ratings en ventana de 30 días**
    - **Validates: Requirements 4.6**

  - [x] 7.4 Escribir property test: Límite de caracteres en comentarios de rating (Property 13)
    - **Property 13: Límite de caracteres en comentarios de rating**
    - **Validates: Requirements 4.7**

  - [x] 7.5 Implementar lógica de Verified_Provider: badge, registro de verificación
    - Crear endpoint `PATCH /api/v1/admin/members/:id/verify` que persiste fecha, admin ID y razón
    - Actualizar `is_verified_provider`, `verified_at`, `verified_by`, `verification_reason` en User
    - _Requirements: 4.5, 9.7_

  - [x] 7.6 Escribir property test: Registro de verificación de proveedor contiene todos los campos (Property 21)
    - **Property 21: Registro de verificación de proveedor contiene todos los campos**
    - **Validates: Requirements 9.7**

- [x] 8. Implementar mensajería interna y notificaciones
  - [x] 8.1 Crear API de mensajería con Server-Sent Events
    - Implementar Route Handlers: `GET /api/v1/messages/:threadId`, `POST /api/v1/messages`, `GET /api/v1/messages/stream` (SSE)
    - Implementar bloqueo de mensajería para cuentas `locked` o `under_review`
    - _Requirements: 5.2, 5.3, 5.6_

  - [x] 8.2 Escribir property test: Bloqueo de mensajería para cuentas restringidas (Property 14)
    - **Property 14: Bloqueo de mensajería para cuentas restringidas**
    - **Validates: Requirements 5.6**

  - [x] 8.3 Implementar sistema de notificaciones in-app y push (Web Push API + VAPID)
    - Crear Route Handlers: `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`
    - Implementar ordenamiento por `created_at` descendente
    - Configurar expiración de notificaciones a 90 días con job de limpieza
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 8.4 Escribir property test: Notificaciones no leídas ordenadas por fecha descendente (Property 17)
    - **Property 17: Notificaciones no leídas ordenadas por fecha descendente**
    - **Validates: Requirements 7.5**

- [x] 9. Implementar Tool Library (herramientas compartidas)
  - [x] 9.1 Crear API de herramientas y reservas
    - Implementar Route Handlers: `GET /api/v1/tools`, `POST /api/v1/tools`, `POST /api/v1/tools/:id/reservations`
    - Validar campos requeridos: nombre, descripción, condición, vereda
    - Implementar lógica de calendario de disponibilidad y bloqueo de fechas pendientes
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 9.2 Implementar timeout de reserva y cancelación automática a las 48 horas
    - Crear cron job que cancela reservas pendientes sin respuesta y notifica al solicitante
    - _Requirements: 8.5_

  - [x] 9.3 Implementar registro de cancelaciones tardías en perfil del miembro
    - Registrar cancelaciones con menos de 24 horas de anticipación en historial del Member
    - _Requirements: 8.7_

- [x] 10. Implementar moderación de contenido y seguridad
  - [x] 10.1 Crear API de reportes y detección automática de contenido
    - Implementar Route Handler `POST /api/v1/reports`
    - Implementar detección de URLs y teléfonos en título/descripción de listings (auto-flag)
    - Implementar trigger PostgreSQL para `User.active_report_count`
    - _Requirements: 9.1, 9.4_

  - [x] 10.2 Escribir property test: Detección de URLs y teléfonos en contenido de listings (Property 19)
    - **Property 19: Detección de URLs y teléfonos en contenido de listings**
    - **Validates: Requirements 9.4**

  - [x] 10.3 Implementar auto-suspensión por umbral de reportes (5 en 30 días)
    - Añadir lógica en el Route Handler de reportes que suspende automáticamente y notifica al admin
    - _Requirements: 9.5_

  - [x] 10.4 Escribir property test: Auto-suspensión por umbral de reportes (Property 20)
    - **Property 20: Auto-suspensión por umbral de reportes**
    - **Validates: Requirements 9.5**

  - [x] 10.5 Implementar panel de administración: moderación, suspensión y gestión de categorías
    - Crear Route Handlers: `GET /api/v1/admin/reports`, `POST /api/v1/admin/categories`, `PATCH /api/v1/admin/members/:id/suspend`
    - Implementar suspensión que bloquea login y oculta listings simultáneamente
    - _Requirements: 9.2, 9.3, 9.6, 11.1, 11.2_

  - [x] 10.6 Escribir property test: Suspensión bloquea login y oculta listings (Property 18)
    - **Property 18: Suspensión bloquea login y oculta listings**
    - **Validates: Requirements 9.3**

  - [x] 10.7 Implementar gestión de listings destacados en home (máximo 5)
    - Lógica de reemplazo automático al eliminar un destacado
    - _Requirements: 11.3, 11.4_

  - [x] 10.8 Escribir property test: Límite de 5 listings destacados en home (Property 25)
    - **Property 25: Límite de 5 listings destacados en home**
    - **Validates: Requirements 11.3**

  - [x] 10.9 Escribir property test: Categoría desactivada no aparece en formularios pero preserva listings (Property 24)
    - **Property 24: Categoría desactivada no aparece en formularios pero preserva listings**
    - **Validates: Requirements 11.2**

- [x] 11. Checkpoint — Asegurar que todos los tests de moderación y administración pasen
  - Verificar suspensión, auto-flag, reportes y gestión de categorías. Consultar al usuario si surgen dudas.

- [x] 12. Implementar soporte offline y sincronización
  - [x] 12.1 Configurar IndexedDB queue manager para acciones offline
    - Implementar `src/lib/offline/queue.ts` con encolado, backoff exponencial y reintentos
    - Configurar Background Sync en Service Worker con Workbox
    - _Requirements: 10.5, 10.6_

  - [x] 12.2 Escribir property test: Sincronización de acciones pendientes al recuperar red (Property 23)
    - **Property 23: Sincronización de acciones pendientes al recuperar red**
    - **Validates: Requirements 10.6**

  - [x] 12.3 Implementar indicador visual de estado offline en la UI
    - Detectar pérdida de red y mostrar banner offline; permitir navegación de contenido cacheado
    - _Requirements: 10.5_

- [x] 13. Implementar componentes UI con accesibilidad y UX para baja alfabetización digital
  - [x] 13.1 Crear componentes base con touch targets ≥44×44 px
    - Implementar `Button`, `Input`, `Card`, `Select` en `src/components/ui/` con Tailwind
    - Garantizar área táctil mínima de 44×44 CSS px en todos los elementos interactivos
    - _Requirements: 10.2_

  - [x] 13.2 Escribir property test: Tamaño mínimo de elementos táctiles (Property 22)
    - **Property 22: Tamaño mínimo de elementos táctiles**
    - **Validates: Requirements 10.2**

  - [x] 13.3 Implementar flujos primarios en máximo 3 pasos
    - Crear páginas: registro (`/register`), publicar listing (`/listings/new`), contactar proveedor
    - Usar lenguaje llano en labels, mensajes de error e instrucciones
    - _Requirements: 10.1, 10.3_

  - [x] 13.4 Implementar feedback de confirmación dentro de 2 segundos tras acciones de datos
    - Añadir toasts/snackbars en mutaciones de React Query
    - _Requirements: 10.4_

  - [x] 13.5 Implementar mapa de veredas y selector de vereda con sugerencia por GPS
    - Crear componentes `VeredaMap` y `VeredaSelector` en `src/components/map/`
    - Implementar sugerencia automática de vereda más cercana por GPS; fallback a selección manual
    - _Requirements: 6.3, 6.4, 6.5_

- [x] 14. Implementar API REST versionada y exportación de datos
  - [x] 14.1 Verificar que todos los endpoints siguen el prefijo `/api/v1/` y formato uniforme de errores
    - Revisar todos los Route Handlers y aplicar el formato `{ error: { code, message, field, requestId } }`
    - _Requirements: 12.3_

  - [x] 14.2 Implementar vistas de exportación JSON para contenido generado por usuarios
    - Crear vistas `v_export_{table}` en PostgreSQL y endpoint de exportación
    - _Requirements: 12.4_

  - [x] 14.3 Escribir property test: Exportación JSON preserva todos los datos (Property 27)
    - **Property 27: Exportación JSON preserva todos los datos**
    - **Validates: Requirements 12.4**

- [x] 15. Integración final y wiring de módulos
  - [x] 15.1 Conectar todos los módulos en el App Router de Next.js
    - Implementar layout con navegación, `NotificationBell`, indicador offline y contexto de comunidad
    - Integrar `useOfflineQueue`, `useNotifications`, `useGeolocation` hooks
    - _Requirements: 10.1, 10.5, 7.4_

  - [x] 15.2 Configurar Lighthouse CI en pipeline
    - Añadir script de Lighthouse CI con umbrales: Performance ≥70, Accessibility ≥85 en perfil Android 3G
    - _Requirements: 10.7, 10.8_

  - [x] 15.3 Escribir tests de integración para flujos críticos
    - Cubrir: registro completo, publicar listing, enviar mensaje, reservar herramienta, moderar reporte
    - _Requirements: 1.1–1.9, 3.1–3.7, 5.1–5.6, 8.1–8.7, 9.1–9.7_

- [x] 16. Checkpoint final — Asegurar que todos los tests pasen
  - Ejecutar suite completa de tests (unit, property, integración). Consultar al usuario si surgen dudas.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los property tests usan fast-check con mínimo 100 iteraciones y comentario de trazabilidad: `// Feature: santa-elena-platform, Property N: <texto>`
- Los checkpoints garantizan validación incremental antes de avanzar al siguiente módulo
- El lenguaje de implementación es TypeScript con Next.js 14 (App Router)
