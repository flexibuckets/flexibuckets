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
TRAEFIK_DIR="/etc/traefik"
ENV_FILE="${INSTALL_DIR}/.env"
REPO_URL="https://github.com/flexibuckets/flexibuckets.git"

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
    if [ "$(nproc)" -lt 2 ]; then
        log "WARN" "Recommended minimum: 2 CPU cores"
    fi
    
    local mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local mem_gb=$((mem_kb / 1024 / 1024))
    if [ "$mem_gb" -lt 4 ]; then
        log "WARN" "Recommended minimum: 4GB RAM (found: ${mem_gb}GB)"
    fi
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
}

# Function to create environment file
create_env_file() {
    log "INFO" "Creating .env file..."
    
    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    
    # Get public IP
    PUBLIC_IP=$(curl -s https://api.ipify.org)
    
    cat > "$ENV_FILE" << EOL
# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=flexibuckets
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/flexibuckets

# Application Configuration
NODE_ENV=production
NEXTAUTH_URL=http://${PUBLIC_IP}:3000
NEXT_PUBLIC_APP_URL=http://${PUBLIC_IP}:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Docker Configuration  
DOMAIN=${PUBLIC_IP}
APP_VERSION=latest
TRAEFIK_DIR=${TRAEFIK_DIR}

# Traefik Configuration
ACME_EMAIL=admin@flexibuckets.com  
EOL

    chmod 600 "$ENV_FILE"
    log "INFO" "Created .env file at ${ENV_FILE}"
}

# Function to setup Traefik
setup_traefik() {
    log "INFO" "Setting up Traefik..."
    
    mkdir -p "${TRAEFIK_DIR}/dynamic"
    mkdir -p "${TRAEFIK_DIR}/acme"
    
    touch "${TRAEFIK_DIR}/acme/acme.json"
    chmod 600 "${TRAEFIK_DIR}/acme/acme.json"
}

# Function to start services
start_services() {
    log "INFO" "Starting services..."
    cd "$INSTALL_DIR"
    
    # Pull latest images
    docker compose pull

    # Stop any running containers
    docker compose down --remove-orphans

    # Start services
    docker compose up -d

    # Check if services are running
    if docker compose ps | grep -q "Up"; then
        log "INFO" "Services started successfully"
    else
        log "ERROR" "Failed to start services"
        docker compose logs
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
# Main installation function
main() {
    echo -e "\n${BOLD}FlexiBuckets Installer${NC}\n"
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
    
    # Setup Traefik
    setup_traefik
    
    # Start services
    start_services
    
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
