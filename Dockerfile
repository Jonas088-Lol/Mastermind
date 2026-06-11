# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps: install production + dev dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Install OS libs needed by Prisma query engine
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
# Install all deps (including devDeps — needed for Next.js build).
# --ignore-scripts skips the postinstall `prisma generate` which fails here
# because prisma/schema.prisma doesn't exist yet; the builder stage runs it
# explicitly after copying the schema.
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

# Bundle seed.ts → seed.cjs (no TypeScript tooling needed at runtime).
# esbuild ships with tsx (devDep). Fall back gracefully if unavailable.
RUN if [ -f node_modules/.bin/esbuild ]; then \
      node_modules/.bin/esbuild prisma/seed.ts \
        --bundle --platform=node --target=node22 --format=cjs \
        --outfile=prisma/seed.cjs --external:@prisma/client \
      && echo "✓ seed.cjs compiled"; \
    else \
      echo "⚠ esbuild not found — seed will be skipped at runtime"; \
    fi

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

# Copy Prisma files needed at runtime (schema + generated client + compiled seed)
COPY --from=builder /app/prisma                ./prisma
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma
# Prisma CLI — needed by entrypoint for db push
COPY --from=builder /app/node_modules/prisma          ./node_modules/prisma
# @prisma/config (Prisma 6) depends on effect → fast-check → pure-rand (not traced by NFT)
COPY --from=builder /app/node_modules/effect          ./node_modules/effect
COPY --from=builder /app/node_modules/fast-check      ./node_modules/fast-check
COPY --from=builder /app/node_modules/pure-rand       ./node_modules/pure-rand

# Entrypoint script handles migrations before starting the server
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
