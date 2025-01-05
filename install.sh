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

# Function to install Docker and Docker Compose
install_docker() {
    echo -e "${YELLOW}Installing Docker and Docker Compose...${NC}"
    
    # Remove any old versions
    apt-get remove -y docker docker.io containerd runc || true
    
    # Install prerequisites
    apt-get update
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release

    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

    # Set up the stable repository
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Start Docker service
    systemctl start docker
    systemctl enable docker

    # Verify installation
    docker --version
    docker compose version
}

# Function to create environment file
create_env_file() {
    echo -e "${YELLOW}Creating .env file...${NC}"
    
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
    echo -e "${GREEN}Created .env file at ${ENV_FILE}${NC}"
}

# Main installation function
main() {
    echo -e "${BOLD}FlexiBuckets Installer${NC}"
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then 
        echo -e "${RED}Please run as root (use sudo)${NC}"
        exit 1
    fi
    
    # Install Docker if not present
    if ! command -v docker &> /dev/null; then
        install_docker
    fi
    
    # Create installation directory
    mkdir -p "$INSTALL_DIR"
    
    # Create Traefik directories and files
    mkdir -p "${TRAEFIK_DIR}/dynamic"
    mkdir -p "${TRAEFIK_DIR}/acme"
    touch "${TRAEFIK_DIR}/acme/acme.json"
    chmod 600 "${TRAEFIK_DIR}/acme/acme.json"
    
    # Create environment file
    create_env_file
    
    # Copy docker-compose file
    echo -e "${YELLOW}Setting up Docker Compose configuration...${NC}"
    cp docker-compose.yml "$INSTALL_DIR/"
    
    # Start services
    echo -e "${YELLOW}Starting services...${NC}"
    cd "$INSTALL_DIR"
    docker compose pull
    docker compose up -d
    
    echo -e "${GREEN}Installation completed successfully!${NC}"
    echo -e "Access your FlexiBuckets instance at: http://${PUBLIC_IP}:3000"
}

# Run main installation
main