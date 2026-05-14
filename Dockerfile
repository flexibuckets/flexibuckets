# ============================================================
# Stage 1: Base — minimal runtime for the final container
# ============================================================
FROM oven/bun:1-slim AS base
WORKDIR /app

# Only install what the RUNNING app truly needs:
#   - curl: healthcheck script HTTP calls
#   - procps: healthcheck pgrep for bun process
#   - openssl: TLS/crypto runtime (needed by Prisma/Node)
# Everything else (build-essential, python3, docker.io, etc.)
# is only needed at build time and excluded from the final image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    procps \
    openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ============================================================
# Stage 2: Deps — install node_modules with native compilation
# ============================================================
FROM oven/bun:1 AS deps
WORKDIR /app

# Install build tools needed for native modules (bcrypt, sharp, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    make \
    g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lockb ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for building)
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install
RUN bunx prisma generate

# ============================================================
# Stage 3: Builder — compile the Next.js application
# ============================================================
FROM oven/bun:1 AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY . .

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun run build

# ============================================================
# Stage 4: Runner — production image (minimal)
# ============================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Create or modify docker group with fallback logic
ARG DOCKER_GROUP_ID=999
RUN if getent group docker > /dev/null; then \
        # If docker group exists but with different GID, try to modify it
        if [ "$(getent group docker | cut -d: -f3)" -ne $DOCKER_GROUP_ID ]; then \
            groupmod -g $DOCKER_GROUP_ID docker || true; \
        fi \
    else \
        # If docker group doesn't exist, create it
        groupadd -g $DOCKER_GROUP_ID docker; \
    fi

# Create app user with fallback logic for user creation
RUN useradd -r -u 1001 -g docker flexibuckets 2>/dev/null || \
    useradd -r -u 1001 -g $(getent group docker | cut -d: -f3) flexibuckets

# Copy only what's needed for production:
# - Next.js standalone output (includes server + minimal node_modules)
# - Static assets and public files
# - Prisma client (for database access)
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy server-side packages that standalone tracing may miss.
# These are used in server actions / API routes via dynamic patterns.
COPY --from=builder /app/node_modules/dockerode ./node_modules/dockerode
COPY --from=builder /app/node_modules/docker-modem ./node_modules/docker-modem
COPY --from=builder /app/node_modules/ssh2 ./node_modules/ssh2
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/semver ./node_modules/semver
COPY --from=builder /app/node_modules/js-yaml ./node_modules/js-yaml

# Prisma CLI — needed for `prisma migrate deploy` during install/upgrade
COPY --from=deps /app/node_modules/prisma ./node_modules/prisma
COPY --from=deps /app/node_modules/@prisma/engines ./node_modules/@prisma/engines

# Create prisma CLI symlink and ensure engine binaries are executable
RUN mkdir -p ./node_modules/.bin && \
    ln -sf ../prisma/build/index.js ./node_modules/.bin/prisma && \
    chmod +x ./node_modules/.bin/prisma && \
    find ./node_modules/prisma -name "*.node" -exec chmod +x {} \; 2>/dev/null || true && \
    find ./node_modules/@prisma/engines -type f -exec chmod +x {} \; 2>/dev/null || true

# Copy and set up healthcheck script
COPY ./scripts/healthcheck.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/healthcheck.sh

# Set up directories and permissions
RUN mkdir -p /app/data \
    /app/.next/cache \
    /app/.next/cache/images \
    /app/.next/cache/fetch-cache && \
    chown -R flexibuckets:docker /app && \
    chmod -R 755 /app && \
    chmod -R 775 /app/data /app/.next/cache

# Add specific paths that need write access
RUN mkdir -p /app/data \
    /app/.next/cache \
    /app/.next/cache/images \
    /app/.next/cache/fetch-cache \
    /tmp \
    /var/run && \
    chown -R flexibuckets:docker \
        /app/data \
        /app/.next/cache \
        /tmp \
        /var/run && \
    chmod -R 775 \
        /app/data \
        /app/.next/cache \
        /tmp \
        /var/run

USER flexibuckets:docker

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD [ "/usr/local/bin/healthcheck.sh" ]

CMD ["bun", "server.js"]