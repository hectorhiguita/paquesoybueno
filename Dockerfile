# ─── Stage 1: dependencias ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# ─── Stage 2: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Genera el cliente Prisma
RUN npx prisma generate

# Build de Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser  --system --uid 1001 nextjs

# Archivos necesarios para producción
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Script de inicio: corre migraciones y luego la app
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
