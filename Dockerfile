# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps: install production + dev dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Install OS libs needed by Prisma query engine
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
# Install all deps (including devDeps — needed for Next.js build)
RUN npm ci --ignore-scripts

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — builder: compile the Next.js app
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Use the PostgreSQL schema for production
RUN cp prisma/schema.postgres.prisma prisma/schema.prisma

# Generate Prisma client for Linux/amd64 inside container
RUN npx prisma generate

# Build Next.js (standalone mode = self-contained output)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Dummy values so the build doesn't crash — real values come from docker-compose
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV SESSION_SECRET="build-time-placeholder-32chars!!"
ENV NEXT_PUBLIC_APP_URL="https://example.com"

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — runner: minimal production image
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy only what Next.js standalone needs
COPY --from=builder /app/public           ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static     ./.next/static

# Copy Prisma files needed at runtime (migrations + generated client)
COPY --from=builder /app/prisma           ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma  ./node_modules/prisma
RUN ln -s ../prisma/build/index.js ./node_modules/.bin/prisma

# Entrypoint script handles migrations before starting the server
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
