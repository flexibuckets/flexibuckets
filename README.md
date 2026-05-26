[![FlexiBuckets](logo.png)](https://flexibuckets.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)](https://hub.docker.com/r/flexibuckets/flexibuckets)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)
[![Next.js](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Build](https://github.com/flexibuckets/flexibuckets/actions/workflows/build-and-push.yml/badge.svg)](https://github.com/flexibuckets/flexibuckets/actions/workflows/build-and-push.yml)


FlexiBuckets is an open-source, self-hosted solution for managing multiple S3-compatible storage buckets in one unified interface. Perfect for developers and teams who work with various S3-compatible storage providers.

## ✨ Features

- 🔄 **Multi-Bucket Support**: Connect and manage multiple S3-compatible storage buckets
- 📁 **Unified Interface**: Browse, upload, and manage files across all your buckets
- 🔐 **Secure**: Self-hosted and runs entirely in your infrastructure
- 📤 **Easy File Sharing**: Generate temporary links for file sharing
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🚀 **Fast Performance**: Built with Bun and Next.js for optimal speed

## 🎯 Supported Storage Providers

- AWS S3
- DigitalOcean Spaces
- MinIO
- Backblaze B2
- Wasabi
- Any S3-compatible storage

## 🚀 Quick Start

The easiest way to get started is using Docker:

To use the improved installation:

Basic installation:

```bash
curl -fsSL https://cdn.flexibuckets.com/install.sh | sudo bash

```


The installation script will:
1. Install necessary dependencies
2. Set up the database
3. Configure environment variables
4. Start FlexiBuckets


Visit `http://your-server-ip:3000` to access your FlexiBuckets instance.

## 🏠 Local or Homeserver

Run FlexiBuckets on your own machine — laptop, desktop, or homeserver. No Traefik, no SSL, just the app and a database.

### Quick Start — Linux / Mac

```bash
git clone https://github.com/flexibuckets/flexibuckets.git
cd flexibuckets
bash self-host-install.sh
```

### Quick Start — Windows (PowerShell)

> **Prerequisite:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) must be installed and running.

```powershell
git clone https://github.com/flexibuckets/flexibuckets.git
cd flexibuckets
powershell -ExecutionPolicy Bypass -File self-host-install.ps1
```

The install scripts will:
1. Check for Docker & Docker Compose
2. Find an available port (scans 3000–3010, picks the first free one)
3. Ask you to choose **bundled PostgreSQL** or **external/cloud PostgreSQL**
4. Generate all secrets automatically (encryption key saved to `encryption_key.txt`)
5. Start FlexiBuckets and run database migrations

> **⚠️ Encryption key backup:** The install scripts save your encryption key to `encryption_key.txt`. **Back this file up to a safe location** — if you lose it, your stored S3 credentials cannot be recovered.

Visit `http://localhost:<port>` (the port shown in the script output) to access your instance.

### What's Different in Local Mode

When `DEPLOYMENT_MODE=local`, FlexiBuckets operates differently from the VPS/server mode:

- **No Traefik reverse proxy** — The app binds directly to the host port. Domain/SSL configuration via the dashboard is skipped.
- **`TraefikManager.getInstance()` returns `null`** — All Traefik config writes and container restarts are guarded and skipped (`actions.ts`, `config.ts`, `route.ts`).
- **Auto-updates still work** — The Docker socket is mounted read-only into the app container. The `COMPOSE_FILE` env variable tells Docker Compose which file to use, so the dashboard auto-update feature works in both modes.
- **HTTP only** — No automatic HTTPS/Let's Encrypt. If you need SSL, put a reverse proxy (nginx, Caddy, etc.) in front.

### Using a Cloud / External PostgreSQL

If you already have a managed PostgreSQL database (Supabase, Neon, RDS, etc.):

1. Choose **"External PostgreSQL"** when the install script asks
2. Provide your connection string: `postgresql://user:password@host:5432/dbname`
3. The script will run migrations on your cloud database automatically

### Manual Setup

If you prefer manual configuration:

```bash
git clone https://github.com/flexibuckets/flexibuckets.git
cd flexibuckets
cp .env.local.example .env
# Edit .env with your settings
```

> **Tip:** Setting `COMPOSE_FILE=docker-compose.local.yml` in your `.env` lets you use plain `docker compose up -d` instead of passing `-f` every time.

**With bundled PostgreSQL:**
```bash
# Add COMPOSE_PROFILES=fullstack to .env, then:
docker compose up -d
# Or explicitly:
docker compose -f docker-compose.local.yml --profile fullstack up -d
# Run migrations:
docker compose exec -T app sh -c 'cd /app && TMPDIR=/tmp ./node_modules/.bin/prisma migrate deploy'
```

**With external PostgreSQL:**
```bash
# Set DATABASE_URL in .env to your cloud DB connection string, then:
docker compose up -d
# Or explicitly:
docker compose -f docker-compose.local.yml up -d
docker compose exec -T app sh -c 'cd /app && TMPDIR=/tmp ./node_modules/.bin/prisma migrate deploy'
```

### Useful Commands (Self-Host)

If you set `COMPOSE_FILE=docker-compose.local.yml` in your `.env`, you can omit the `-f` flag:

| Command | Description |
|---------|-------------|
| `docker compose logs -f` | View logs |
| `docker compose down` | Stop services |
| `docker compose up -d` | Start services |
| `docker compose pull` | Pull latest images |
| `docker compose exec -T app sh -c 'cd /app && TMPDIR=/tmp ./node_modules/.bin/prisma migrate deploy'` | Run migrations |

Without `COMPOSE_FILE` in `.env`, prefix all commands with `-f docker-compose.local.yml`.

> **Auto-updates:** In self-host mode, domain/SSL configuration via the dashboard is skipped (no Traefik), but auto-updates remain available. The Docker socket is mounted read-only (`/var/run/docker.sock:ro`) and the `COMPOSE_FILE` env variable ensures the dashboard's update command uses the correct compose file.

## 🛠 Manual Installation

If you prefer to set up manually:

1. Clone the repository:
```bash
git clone https://github.com/flexibuckets/flexibuckets.git
cd flexibuckets
```

2. Create and configure .env file:
```bash
cp .env.example .env
# Edit .env with your settings
```

3. Start using Docker Compose:
```bash
docker compose up -d
```

## 🔒 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://postgres:postgres@db:5432/flexibuckets` |
| `NEXTAUTH_URL` | Your site URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Random string for auth | Generated during install |
| `DEPLOYMENT_MODE` | `local` (self-host) or `server` (VPS with Traefik) | `server` |
| `ENCRYPTION_KEY` | Key for encrypting sensitive data (S3 credentials) | Generated during install |
| `COMPOSE_FILE` | Docker Compose file to use (self-host: `docker-compose.local.yml`) | — |
| `COMPOSE_PROFILES` | `fullstack` enables bundled PostgreSQL container | — |
| `APP_PORT` | Host port the app binds to (self-host) | `3000` |

## 📦 Building from Source

```bash
# Install dependencies
bun install

# Generate Prisma client
bunx prisma generate

# Build the application
bun run build

# Start the server
bun run start
```

## 🌟 Contributing

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

FlexiBuckets is MIT licensed, as found in the [LICENSE](LICENSE) file.

## 🤝 Support

- 📝 [Documentation](https://docs.flexibuckets.thebrainfry.com)
- 🐛 [Issue Tracker](https://github.com/flexibuckets/flexibuckets/issues)


## ⭐️ Show Your Support

Give a ⭐️ if this project helped you! 
You can also support us by Sponsoring us on [GitHub Sponsors](https://github.com/sponsors/scshiv29-dev)
20% of your contribution will go directly towards funding community bounties, empowering contributors to solve critical issues, add new features, and innovate.

Your support helps sustain and grow the open-source ecosystem while recognizing and rewarding the community's hard work. Thank you for driving collaboration and progress!


⚠️ **Security Note:** The auto-update feature requires mounting the Docker socket (`/var/run/docker.sock:ro`) into the app container. This is necessary for the application to manage its own updates (in both `local` and `server` modes), but it grants the container elevated permissions on your system. If this is a concern, you can disable auto-updates and manage updates manually. Currently, the auto-update feature is WIP.

