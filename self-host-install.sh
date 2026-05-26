#!/bin/bash
set -e

# =============================================================================
# FlexiBuckets — Local Self-Host Install Script
# =============================================================================
# This script sets up FlexiBuckets for local / self-hosted use via Docker.
# It does NOT use Traefik or any reverse-proxy — just PostgreSQL + the app.
#
# Usage:  chmod +x self-host-install.sh && ./self-host-install.sh
# =============================================================================

# ------------------------------- Colors ------------------------------------
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

# ------------------------------- Globals -----------------------------------
COMPOSE_FILE="docker-compose.local.yml"
ENV_FILE=".env"
ENCRYPTION_KEY_FILE="encryption_key.txt"
MIN_PORT=3000
MAX_PORT=3010

# ------------------------------- Helpers -----------------------------------

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_bold()  { echo -e "${BOLD}$*${NC}"; }

# Cleanup handler — called on unexpected exit
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo ""
        log_error "Installation failed (exit code $exit_code)."
        log_error "Check the output above for details."
        echo -e "${YELLOW}If services were partially started you can clean up with:${NC}"
        echo "  docker compose -f ${COMPOSE_FILE} down"
    fi
}
trap cleanup EXIT

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ------------------------------- Banner ------------------------------------
print_banner() {
    cat <<'EOF'

   _____   _                 _   ____                   _             _
  |  ___| | |   ___  __  __ (_) | __ )   _   _    ___  | | __   ___  | |_   ___
  | |_    | |  / _ \ \ \/ / | | |  _ \  | | | |  / __| | |/ /  / _ \ | __| / __|
  |  _|   | | |  __/  >  <  | | | |_) | | |_| | | (__  |   <  |  __/ | |_  \__ \
  |_|     |_|  \___| /_/\_\ |_| |____/   \__,_|  \___| |_|\_\  \___|  \__| |___/

EOF
    echo -e "  ${BOLD}Local Self-Host Installer${NC}"
    echo ""
}

# ------------------------------- Prerequisites -----------------------------
check_prerequisites() {
    log_info "Checking prerequisites..."

    # --- Docker ---
    if ! command_exists docker; then
        log_error "Docker is not installed."
        echo ""
        echo "  Install Docker Desktop:"
        echo "    macOS : https://docs.docker.com/desktop/install/mac-install/"
        echo "    Linux : https://docs.docker.com/engine/install/"
        echo ""
        exit 1
    fi

    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is installed but not running."
        echo ""
        echo "  Please start Docker Desktop (or the Docker daemon) and try again."
        echo ""
        exit 1
    fi

    log_info "Docker is installed and running."

    # --- Docker Compose v2 ---
    if ! docker compose version >/dev/null 2>&1; then
        log_error "Docker Compose v2 is not available."
        echo ""
        echo "  Docker Compose v2 ships with Docker Desktop."
        echo "  If you installed Docker Engine manually, install the compose plugin:"
        echo "    https://docs.docker.com/compose/install/linux/"
        echo ""
        exit 1
    fi

    local compose_version
    compose_version=$(docker compose version --short 2>/dev/null || echo "unknown")
    log_info "Docker Compose v2 found (${compose_version})."
}

# ------------------------------- Port Detection ----------------------------
find_available_port() {
    log_info "Looking for an available port (${MIN_PORT}–${MAX_PORT})..."

    local port
    for port in $(seq "$MIN_PORT" "$MAX_PORT"); do
        if ! is_port_in_use "$port"; then
            APP_PORT=$port
            log_info "Port ${BOLD}${APP_PORT}${NC}${GREEN} is available and will be used.${NC}"
            return
        fi
    done

    log_error "No available port found in range ${MIN_PORT}–${MAX_PORT}."
    log_error "Free up one of those ports or adjust the script."
    exit 1
}

is_port_in_use() {
    local port=$1
    # Try ss first (Linux), then lsof (macOS / fallback)
    if command_exists ss; then
        ss -tuln 2>/dev/null | grep -q ":${port} " && return 0
    fi
    if command_exists lsof; then
        lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1 && return 0
    fi
    # If neither tool is available, assume port is free
    return 1
}

# ------------------------------- Database Choice ---------------------------
ask_database_choice() {
    echo ""
    log_bold "Choose your database setup:"
    echo ""
    echo -e "  ${BOLD}1)${NC} Use bundled PostgreSQL ${GREEN}(recommended for most users)${NC}"
    echo -e "  ${BOLD}2)${NC} Use external PostgreSQL (cloud DB like Supabase, Neon, RDS, etc.)"
    echo ""

    while true; do
        echo -ne "${YELLOW}Enter choice [1/2]: ${NC}"
        read -r db_choice
        case "$db_choice" in
            1) setup_bundled_db;  break ;;
            2) setup_external_db; break ;;
            *) log_warn "Please enter 1 or 2." ;;
        esac
    done
}

setup_bundled_db() {
    USE_BUNDLED_DB=true
    log_info "Using bundled PostgreSQL."

    # Generate a random 32-char alphanumeric password
    DB_PASSWORD=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 32)
    DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@db:5432/flexibuckets"
    POSTGRES_USER="postgres"
    POSTGRES_DB="flexibuckets"
}

setup_external_db() {
    USE_BUNDLED_DB=false
    log_info "Using external PostgreSQL."
    echo ""

    while true; do
        echo -ne "${YELLOW}Enter your PostgreSQL connection string: ${NC}"
        read -r DATABASE_URL

        # Validate format
        if [[ "$DATABASE_URL" != postgresql://* ]] && [[ "$DATABASE_URL" != postgres://* ]]; then
            log_warn "Connection string must start with postgresql:// or postgres://"
            continue
        fi
        break
    done

    # Test connectivity
    echo ""
    log_info "Testing database connectivity..."
    if docker run --rm --network host postgres:16-alpine pg_isready -d "$DATABASE_URL" >/dev/null 2>&1; then
        log_info "Database connection successful!"
    else
        log_warn "Could not connect to the database."
        log_warn "This may be normal if the DB only allows connections from specific IPs"
        log_warn "or the Docker network. Proceeding anyway..."
    fi
}

# ------------------------------- Secrets -----------------------------------
generate_secrets() {
    log_info "Generating secrets..."

    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -base64 32)

    # Persist encryption key to a file
    cat > "$ENCRYPTION_KEY_FILE" <<EKEOF
# FlexiBuckets Encryption Key - KEEP THIS FILE SAFE. DO NOT DELETE.
# This key is used to encrypt sensitive data (S3 credentials, etc.).
# If you lose this key you will NOT be able to decrypt your stored credentials.
#
# Generated: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
${ENCRYPTION_KEY}
EKEOF
    chmod 600 "$ENCRYPTION_KEY_FILE"

    echo ""
    echo -e "  ${RED}${BOLD}⚠  IMPORTANT — BACK UP YOUR ENCRYPTION KEY  ⚠${NC}"
    echo -e "  ${YELLOW}Saved to:${NC} $(pwd)/${ENCRYPTION_KEY_FILE}"
    echo -e "  ${YELLOW}If you lose this key your stored S3 credentials cannot be recovered.${NC}"
    echo ""
}

# ------------------------------- Version -----------------------------------
fetch_latest_version() {
    log_info "Fetching latest FlexiBuckets version..."

    APP_VERSION=$(curl -fsSL --max-time 10 \
        "https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/version.txt" 2>/dev/null \
        | tr -d '[:space:]') || true

    if [ -z "$APP_VERSION" ]; then
        log_warn "Could not fetch version — defaulting to 'latest'."
        APP_VERSION="latest"
    fi

    APP_SHA_SHORT=$(curl -fsSL --max-time 10 \
        "https://api.github.com/repos/flexibuckets/flexibuckets/commits/main" 2>/dev/null \
        | grep '"sha"' | head -1 | cut -d'"' -f4 | head -c 6) || true

    if [ -z "$APP_SHA_SHORT" ]; then
        log_warn "Could not fetch commit SHA — defaulting to 'latest'."
        APP_SHA_SHORT="latest"
    fi

    log_info "Version: ${BOLD}${APP_VERSION}${NC}${GREEN} (${APP_SHA_SHORT})${NC}"
}

# ------------------------------- .env File ---------------------------------
create_env_file() {
    log_info "Creating .env file..."

    local nextauth_url="http://localhost:${APP_PORT}"
    local app_url="http://localhost:${APP_PORT}"

    cat > "$ENV_FILE" <<ENVEOF
# =============================================================================
# FlexiBuckets — Local Self-Host Configuration
# Generated by self-host-install.sh on $(date -u '+%Y-%m-%d %H:%M:%S UTC')
# =============================================================================

# --- Database ----------------------------------------------------------------
DATABASE_URL=${DATABASE_URL}
ENVEOF

    # Bundled-DB-only variables
    if [ "$USE_BUNDLED_DB" = true ]; then
        cat >> "$ENV_FILE" <<ENVEOF
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
ENVEOF
    fi

    cat >> "$ENV_FILE" <<ENVEOF

# --- Deployment --------------------------------------------------------------
DEPLOYMENT_MODE=local
NODE_ENV=production

# --- Auth / Secrets ----------------------------------------------------------
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=${nextauth_url}
NEXT_PUBLIC_APP_URL=${app_url}
AUTH_TRUST_HOST=true
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# --- App ---------------------------------------------------------------------
APP_PORT=${APP_PORT}
APP_VERSION=${APP_VERSION}
APP_SHA_SHORT=${APP_SHA_SHORT}

# --- Docker Compose ---------------------------------------------------------
COMPOSE_FILE=${COMPOSE_FILE}
ENVEOF

    if [ "$USE_BUNDLED_DB" = true ]; then
        echo "COMPOSE_PROFILES=fullstack" >> "$ENV_FILE"
    fi

    chmod 600 "$ENV_FILE"
    log_info "Created ${BOLD}$(pwd)/${ENV_FILE}${NC}"
}

# ------------------------------- Docker Compose ----------------------------
start_services() {
    log_info "Starting FlexiBuckets services..."

    docker compose -f "$COMPOSE_FILE" up -d

    log_info "Services started. Waiting for containers to become healthy..."

    # Give containers a moment to initialise
    sleep 3
}

# ------------------------------- Migrations --------------------------------
wait_for_database() {
    if [ "$USE_BUNDLED_DB" != true ]; then
        # For external DB we skip the container-level readiness check
        return 0
    fi

    log_info "Waiting for bundled PostgreSQL to be ready..."

    local timeout=60
    local elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U postgres >/dev/null 2>&1; then
            log_info "PostgreSQL is ready!"
            return 0
        fi
        echo -ne "\r  ${YELLOW}Waiting... (${elapsed}s / ${timeout}s)${NC}"
        sleep 2
        elapsed=$((elapsed + 2))
    done

    echo ""
    log_error "PostgreSQL did not become ready within ${timeout}s."
    log_error "Check logs: docker compose -f ${COMPOSE_FILE} logs db"
    exit 1
}

run_migrations() {
    log_info "Running database migrations..."

    if docker compose -f "$COMPOSE_FILE" exec -T app sh -c \
        'cd /app && TMPDIR=/tmp ./node_modules/.bin/prisma migrate deploy' 2>&1; then
        log_info "Migrations applied successfully."
    else
        echo ""
        log_warn "Database migration returned a non-zero exit code."
        log_warn "The app may still work if the schema already exists."
        log_warn "Check logs: docker compose -f ${COMPOSE_FILE} logs app"
    fi
}

# ------------------------------- Success -----------------------------------
print_success() {
    local url="http://localhost:${APP_PORT}"

    echo ""
    echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}${BOLD}  ✅  FlexiBuckets is up and running!${NC}"
    echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  ${BOLD}🌐 Access URL:${NC}        ${url}"
    echo -e "  ${BOLD}📄 Config file:${NC}       $(pwd)/${ENV_FILE}"
    echo -e "  ${BOLD}🔑 Encryption key:${NC}    $(pwd)/${ENCRYPTION_KEY_FILE}"
    echo ""
    echo -e "  ${RED}${BOLD}⚠  Back up ${ENCRYPTION_KEY_FILE} — you cannot recover encrypted data without it.${NC}"
    echo ""
    echo -e "  ${BOLD}Useful commands:${NC}"
    echo "    Stop services  :  docker compose -f ${COMPOSE_FILE} down"
    echo "    Start services :  docker compose -f ${COMPOSE_FILE} up -d"
    echo "    View logs      :  docker compose -f ${COMPOSE_FILE} logs -f"
    echo "    View app logs  :  docker compose -f ${COMPOSE_FILE} logs -f app"
    echo ""
    echo -e "  ${YELLOW}For support visit: https://github.com/flexibuckets/flexibuckets${NC}"
    echo ""
}

# ===========================================================================
# Main
# ===========================================================================
main() {
    print_banner
    check_prerequisites
    find_available_port
    ask_database_choice
    generate_secrets
    fetch_latest_version
    create_env_file
    start_services
    wait_for_database
    run_migrations
    print_success
}

main "$@"
