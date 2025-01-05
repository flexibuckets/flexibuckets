FROM oven/bun:1 AS base
WORKDIR /app

# Install system dependencies and utilities
RUN apt-get update && apt-get install -y \
    build-essential \
    python3 \
    python3-pip \
    make \
    g++ \
    curl \
    wget \
    netcat-traditional \
    docker.io \
    docker-compose \
    dnsutils \
    && rm -rf /var/lib/apt/lists/*

# Dependencies with layer caching
FROM base AS deps
COPY package.json bun.lockb ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile
RUN bunx prisma generate

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY . .
RUN bun run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Create docker group with dynamic GID
ARG DOCKER_GROUP_ID=999
RUN groupadd -g $DOCKER_GROUP_ID docker

# Create app user
RUN useradd -r -u 1001 -g docker flexibuckets

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lockb ./bun.lockb
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Copy and set up healthcheck script
COPY ./scripts/healthcheck.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/healthcheck.sh

# Set up directories and permissions
RUN mkdir -p /app/data /etc/traefik/dynamic \
    && chown -R flexibuckets:docker /app /etc/traefik \
    && chmod -R 755 /app \
    && chmod -R 770 /etc/traefik/dynamic

USER flexibuckets

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD [ "/usr/local/bin/healthcheck.sh" ]

CMD ["bun", "start"]