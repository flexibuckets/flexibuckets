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
TRAEFIK_CONFIG_DIR="/etc/traefik"
ENV_FILE="${INSTALL_DIR}/.env"
REPO_URL="https://github.com/flexibuckets/flexibuckets.git"
TRAEFIK_DIR="/etc/traefik"
TRAEFIK_DYNAMIC_DIR="/etc/traefik/dynamic"
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

# Check minimum system requirements
#     if [ "$(nproc)" -lt 2 ]; then
#         log "WARN" "Recommended minimum: 2 CPU cores"
#     fi
    
#     local mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
#     local mem_gb=$((mem_kb / 1024 / 1024))
#     if [ "$mem_gb" -lt 4 ]; then
#         log "WARN" "Recommended minimum: 4GB RAM (found: ${mem_gb}GB)"
#     fi
 }

# Function to install Docker and Docker Compose
install_docker() {
    log "INFO" "Installing Docker and Docker Compose..."
    
    # Remove any old versions
    apt-get remove -y docker docker.io containerd runc || true
    
    # Install prerequisites
    apt-get update
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        git

    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

    # Set up the stable repository
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io

    # Install Docker Compose v2
    log "INFO" "Installing Docker Compose..."
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    # Start Docker service
    systemctl start docker
    systemctl enable docker

    # Add current user to docker group if SUDO_USER is set
    if [ -n "$SUDO_USER" ]; then
        usermod -aG docker "$SUDO_USER"
    fi

    # Verify installation
    log "INFO" "Docker version: $(docker --version)"
    log "INFO" "Docker Compose version: $(docker compose version || echo 'not installed')"
}

# Function to verify Docker and Docker Compose installation
verify_docker() {
    log "INFO" "Verifying Docker installation..."
    
    if ! command_exists docker; then
        log "INFO" "Docker not found, installing..."
        install_docker
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
        log "INFO" "Docker Compose not found, installing..."
        install_docker
    fi

    log "INFO" "Docker Compose is installed and functional"
}

# Function to handle repository
setup_repository() {
    log "INFO" "Setting up FlexiBuckets repository..."
    
    if [ -d "${INSTALL_DIR}/.git" ]; then
        log "INFO" "Repository exists, updating..."
        cd "$INSTALL_DIR"
        git fetch origin
        git reset --hard origin/main
    else
        log "INFO" "Cloning repository..."
        mkdir -p "$INSTALL_DIR"
        git clone "$REPO_URL" "$INSTALL_DIR"
    fi

    # Set proper permissions for scripts directory
    log "INFO" "Setting script permissions..."
    chmod -R +x "${INSTALL_DIR}/scripts"
    
    # Ensure proper ownership
    chown -R root:root "${INSTALL_DIR}/scripts"
}

# Function to create environment file
create_env_file() {
    log "INFO" "Creating .env file..."
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    LATEST_VERSION=$(curl -s https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/version.txt)
    LATEST_SHA_SHORT=$(curl -s https://api.github.com/repos/flexibuckets/flexibuckets/commits/main | jq -r '.sha[0:6]')
    # Get public IP
    SERVER_IP=$(get_public_ip)
    
# Detect public IP for NEXTAUTH_URL
    PUBLIC_URL="http://${SERVER_IP}:3000"
    cat > "$ENV_FILE" << EOL
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=flexibuckets
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/flexibuckets
SERVER_IP=${SERVER_IP}

# Application Configuration
NODE_ENV=production
NEXTAUTH_URL=${PUBLIC_URL}
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
AUTH_TRUST_HOST=true

# Docker Configuration  
APP_VERSION=latest
TRAEFIK_CONFIG_DIR=${TRAEFIK_CONFIG_DIR}
TRAEFIK_DYNAMIC_DIR=${TRAEFIK_DYNAMIC_DIR}

# Traefik Configuration
ACME_EMAIL=

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
    cat >> "${INSTALL_DIR}/.env" << EOF
# System User Configuration
APP_UID=${APP_UID}
DOCKER_GID=${DOCKER_GID}
EOF

    echo -e "${GREEN}System user configuration complete${NC}"
    echo "APP_UID=${APP_UID}"
    echo "DOCKER_GID=${DOCKER_GID}"
}
setup_traefik_directories() {
    echo -e "${YELLOW}Setting up Traefik directories...${NC}"
    
    # Create directories
    mkdir -p "${TRAEFIK_DIR}"
    mkdir -p "${TRAEFIK_DYNAMIC_DIR}"
    
    # Set ownership and permissions
    chown -R flexibuckets:docker "${TRAEFIK_DIR}"
    chmod -R 775 "${TRAEFIK_DIR}"
    
    # Set sticky bit
    chmod g+s "${TRAEFIK_DIR}"
    chmod g+s "${TRAEFIK_DYNAMIC_DIR}"
    
    # Create ACME directory structure
    ACME_DIR="${TRAEFIK_DIR}/acme"
    mkdir -p "${ACME_DIR}"

    # Create acme.json file
    touch "${ACME_DIR}/acme.json"

    # Set proper permissions
    chmod 750 "${ACME_DIR}"
    chmod 600 "${ACME_DIR}/acme.json"
    chown -R "${APP_UID}:${DOCKER_GID}" "${ACME_DIR}"
    echo -e "${GREEN}Traefik directories configured${NC}"
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
    docker compose down --remove-orphans

    # Start services with explicit environment variable passing
    docker compose up -d

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Services started successfully${NC}"
    else
        echo -e "${RED}Failed to start services${NC}"
        exit 1
    fi
}

get_public_ip() {
   local ip=""
    
    # Try AWS metadata (using IMDSv2)
    if curl -s --connect-timeout 1 "http://169.254.169.254/latest/api/token" -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" >/dev/null 2>&1; then
        local token=$(curl -s "http://169.254.169.254/latest/api/token" -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
        ip=$(curl -s -H "X-aws-ec2-metadata-token: $token" http://169.254.169.254/latest/meta-data/public-ipv4)
    fi

    # Try Azure IMDS if AWS failed
    if [ -z "$ip" ]; then
        ip=$(curl -s -H Metadata:true --noproxy "*" "http://169.254.169.254/metadata/instance/network/interface/0/ipAddress/ipAddress?api-version=2021-02-01")
    fi

    # Try Google Cloud metadata if Azure failed
    if [ -z "$ip" ]; then
        ip=$(curl -s -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip")
    fi

    # If all cloud providers failed, try external IP services
    if [ -z "$ip" ] || [[ ! $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        for ip_service in "https://api.ipify.org" "https://ifconfig.me" "https://icanhazip.com"; do
            ip=$(curl -s --max-time 5 "$ip_service")
            if [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                break
            fi
        done
    fi

    # Final validation
    if [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo "$ip"
    else
        echo -e "${RED}Failed to detect public IP address${NC}"
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
    if docker compose exec -T db pg_isready -h localhost -U postgres > /dev/null 2>&1; then
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
  docker compose exec -T app sh -c 'cd /app && bunx prisma migrate deploy'
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}Database schema setup complete${NC}"
  else
    echo -e "${RED}Failed to setup database schema${NC}"
    exit 1
  fi
}

# Function to update .env file
update_env_file() {
    APP_UID=$(id -u "${APP_USER}")
    DOCKER_GID=$(getent group docker | cut -d: -f3)
    
    # Add or update UID/GID in .env file
    if [ -f ".env" ]; then
        sed -i "/^APP_UID=/c\APP_UID=${APP_UID}" .env
        sed -i "/^DOCKER_GID=/c\DOCKER_GID=${DOCKER_GID}" .env
    else
        echo "APP_UID=${APP_UID}" >> .env
        echo "DOCKER_GID=${DOCKER_GID}" >> .env
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
    
    # Traefik specific permissions
    mkdir -p "${TRAEFIK_DIR}/acme"
    touch "${TRAEFIK_DIR}/acme/acme.json"
    chmod 600 "${TRAEFIK_DIR}/acme/acme.json"
    chown -R ${APP_UID}:${DOCKER_GID} "${TRAEFIK_DIR}"
    chmod -R 750 "${TRAEFIK_DIR}"
    chmod -R 770 "${TRAEFIK_DYNAMIC_DIR}"  # Need write access for dynamic config
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
echo
    SERVER_IP=$(get_public_ip)
    # Check system requirements
    check_system_requirements
    
    # Verify/Install Docker and Docker Compose
    verify_docker
    
    # Setup repository
    setup_repository

    
    # Create environment file if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        create_env_file
    fi
    setup_system_user
    # Setup Traefik
    setup_traefik_directories
    
    update_env_file
        setup_permissions
    # Start services
  start_services
    
    # Setup database
    setup_database


   
    log "INFO" "Installation completed successfully!"
    echo -e "\nAccess your FlexiBuckets instance at:"
    echo -e "\U0001F310 HTTP:  http://${SERVER_IP:-localhost}:3000"
    echo -e "\U0001F512 HTTPS: https://${SERVER_IP:-localhost}"
    
    echo -e "\n${YELLOW}Important Notes:${NC}"
    echo "1. Configuration files are in: $INSTALL_DIR"
    echo "2. Environment file is at: $ENV_FILE"
    echo "3. Traefik configuration is in: $TRAEFIK_DIR"
    echo -e "\n${YELLOW}For support, visit: https://github.com/flexibuckets/flexibuckets${NC}\n"
}

# Run main installation
main
