#!/bin/bash
set -e

# Colors and formatting
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

# Configuration
INSTALL_DIR="/opt/flexibuckets"
ENV_FILE="${INSTALL_DIR}/.env"
APP_USER="flexibuckets"
DOCKER_GROUP="docker"

# Function to log messages
log() {
    local level=$1
    shift
    local color
    case "$level" in
        "INFO") color="$GREEN" ;;
        "WARN") color="$YELLOW" ;;
        "ERROR") color="$RED" ;;
        *) color="$NC" ;;
    esac
    echo -e "${color}[$level] $*${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to verify system requirements
check_system_requirements() {
    log "INFO" "Checking system requirements..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        log "ERROR" "Please run as root (use sudo)"
        exit 1
    fi
}

# Function to install Docker and Docker Compose if needed
verify_docker() {
    log "INFO" "Verifying Docker installation..."
    
    if ! command_exists docker; then
        log "ERROR" "Docker not found. Please install Docker before proceeding."
        exit 1
    fi

    if ! systemctl is-active --quiet docker; then
        log "INFO" "Starting Docker service..."
        systemctl start docker
    fi

    # Verify Docker is running
    if ! docker info >/dev/null 2>&1; then
        log "ERROR" "Docker is not running properly"
        exit 1
    fi

    log "INFO" "Verifying Docker Compose installation..."
    if ! docker compose version >/dev/null 2>&1; then
        log "ERROR" "Docker Compose not found. Please install Docker Compose before proceeding."
        exit 1
    fi

    log "INFO" "Docker and Docker Compose are installed and functional"
}

setup_system_user() {
    echo -e "${YELLOW}Setting up system user and permissions...${NC}"

    # Create flexibuckets user if it doesn't exist
    if ! id "flexibuckets" &>/dev/null; then
        useradd -r -s /bin/false flexibuckets
    fi

    # Get system IDs
    APP_UID=$(id -u flexibuckets)
    DOCKER_GID=$(getent group docker | cut -d: -f3)

    # Export these for Docker Compose
    export APP_UID
    export DOCKER_GID

    # Create or update .env file with these values
    cat >> "${ENV_FILE}" << EOF
# System User Configuration
APP_UID=${APP_UID}
DOCKER_GID=${DOCKER_GID}
EOF

    echo -e "${GREEN}System user configuration complete${NC}"
    echo "APP_UID=${APP_UID}"
    echo "DOCKER_GID=${DOCKER_GID}"
}

# Function to create environment file
create_env_file() {
    log "INFO" "Creating .env file..."
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    LATEST_VERSION=$(curl -s https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/version.txt)
    LATEST_SHA_SHORT=$(curl -s https://api.github.com/repos/flexibuckets/flexibuckets/commits/main | jq -r '.sha[0:6]')
    # Get IP or use localhost
    SERVER_IP=${HOST_IP:-"localhost"}
    
    mkdir -p "$INSTALL_DIR"
    
    cat > "$ENV_FILE" << EOL
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=flexibuckets
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/flexibuckets
SERVER_IP=${SERVER_IP}

# Application Configuration
NODE_ENV=production
NEXTAUTH_URL=http://${SERVER_IP}:3000
NEXT_PUBLIC_APP_URL=http://${SERVER_IP}:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
AUTH_TRUST_HOST=true

# Docker Configuration  
DOMAIN=${SERVER_IP}
APP_VERSION=latest

# System User Configuration
APP_UID=${APP_UID}
DOCKER_GID=${DOCKER_GID}

# Version Information
APP_VERSION=${LATEST_VERSION}
APP_SHA_SHORT=${LATEST_SHA_SHORT}
EOL

    chmod 600 "$ENV_FILE"
    log "INFO" "Created .env file at ${ENV_FILE}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    cd "${INSTALL_DIR}"

    # Ensure environment variables are available
    source .env

    # Export critical variables
    export APP_UID
    export DOCKER_GID

    # Verify variables are set
    echo "Verifying environment variables:"
    echo "APP_UID=${APP_UID}"
    echo "DOCKER_GID=${DOCKER_GID}"

    # Stop any running containers
    docker compose -f docker-compose.no-traefik.yml down --remove-orphans

    # Start services with explicit environment variable passing
    docker compose -f docker-compose.no-traefik.yml up -d

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Services started successfully${NC}"
    else
        echo -e "${RED}Failed to start services${NC}"
        exit 1
    fi
}

setup_database() {
  echo -e "${YELLOW}Setting up database schema...${NC}"
  cd "$INSTALL_DIR"

  # Wait for database to be ready
  echo -e "${YELLOW}Waiting for database to be ready...${NC}"
  timeout=30
  while [ $timeout -gt 0 ]; do
    if docker compose -f docker-compose.no-traefik.yml exec -T db pg_isready -h localhost -U postgres > /dev/null 2>&1; then
      echo -e "${GREEN}Database is ready!${NC}"
      break
    fi
    echo -e "${YELLOW}Waiting for database... ($timeout seconds remaining)${NC}"
    sleep 1
    ((timeout--))
  done

  if [ $timeout -eq 0 ]; then
    echo -e "${RED}Database failed to become ready within timeout${NC}"
    exit 1
  fi

  # Run Prisma migrations with -T flag
  echo -e "${YELLOW}Running database migrations...${NC}"
  docker compose -f docker-compose.no-traefik.yml exec -T app sh -c 'cd /app && bunx prisma migrate deploy'
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database schema setup complete${NC}"
  else
    echo -e "${RED}Failed to setup database schema${NC}"
    exit 1
  fi
}

setup_permissions() {
    log "INFO" "Setting up permissions..."
    
    # Data directory permissions
    mkdir -p /app/data
    chown -R ${APP_UID}:${DOCKER_GID} /app/data
    chmod -R 770 /app/data
    
    # Next.js cache permissions
    mkdir -p /app/.next/cache
    chown -R ${APP_UID}:${DOCKER_GID} /app/.next/cache
    chmod -R 770 /app/.next/cache
    
    # Docker socket permissions
    if [ -e /var/run/docker.sock ]; then
        chmod 660 /var/run/docker.sock
        chown root:docker /var/run/docker.sock
    fi
}

# Main installation function
main() {
    cat << "EOF"
  _____   _                 _   ____                   _             _         
 |  ___| | |   ___  __  __ (_) | __ )   _   _    ___  | | __   ___  | |_   ___ 
 | |_    | |  / _ \ \ \/ / | | |  _ \  | | | |  / __| | |/ /  / _ \ | __| / __|
 |  _|   | | |  __/  >  <  | | | |_) | | |_| | | (__  |   <  |  __/ | |_  \__ \
 |_|     |_|  \___| /_/\_\ |_| |____/   \__,_|  \___| |_|\_\  \___|  \__| |___/                                                     
EOF
    echo -e "\n${YELLOW}Installing FlexiBuckets without Traefik for Kubernetes/Coolify/Dokploy environments${NC}\n"
    
    # Check system requirements
    check_system_requirements
    
    # Verify Docker and Docker Compose
    verify_docker
    
    # Copy Docker Compose file
    cp scripts/docker/docker-compose.no-traefik.yml "${INSTALL_DIR}/docker-compose.yml"
    
    # Create environment file if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        create_env_file
    fi
    
    setup_system_user
    setup_permissions
    
    # Start services
    start_services
    
    # Setup database
    setup_database

    log "INFO" "Installation completed successfully!"
    echo -e "\nAccess your FlexiBuckets instance at:"
    echo -e "\U0001F310 HTTP: http://${SERVER_IP:-localhost}:3000"
    
    echo -e "\n${YELLOW}Important Notes:${NC}"
    echo "1. Configuration files are in: $INSTALL_DIR"
    echo "2. Environment file is at: $ENV_FILE"
    echo -e "\n${YELLOW}For support, visit: https://github.com/flexibuckets/flexibuckets${NC}\n"
}

# Run main installation
main 