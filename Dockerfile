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
    procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Dependencies with layer caching
FROM base AS deps
COPY package.json bun.lockb ./
COPY prisma ./prisma/


# Install dependencies
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install 
RUN bunx prisma generate

# Builder with caching
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun run build

# Runner
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

# Set up directories and permissions with error handling

RUN mkdir -p /app/data /app/.next/cache/images && \
    chown -R flexibuckets:docker /app && \
    chmod -R 755 /app && \
    chmod -R 777 /app/.next/cache/images

USER flexibuckets

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD [ "/usr/local/bin/healthcheck.sh" ]

CMD ["bun", "start"]