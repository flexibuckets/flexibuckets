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
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # Start Docker service
    systemctl start docker
    systemctl enable docker

    # Verify installation
    docker --version
    docker compose version
}

# Function to handle repository
setup_repository() {
    echo -e "${YELLOW}Setting up FlexiBuckets repository...${NC}"
    
    if [ -d "${INSTALL_DIR}/.git" ]; then
        echo -e "${YELLOW}Repository exists, updating...${NC}"
        cd "$INSTALL_DIR"
        git fetch origin
        git reset --hard origin/main
    else
        echo -e "${YELLOW}Cloning repository...${NC}"
        # Ensure the directory is empty or doesn't exist
        rm -rf "$INSTALL_DIR"
        git clone "$REPO_URL" "$INSTALL_DIR"
    fi
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

# Function to setup Traefik
setup_traefik() {
    echo -e "${YELLOW}Setting up Traefik...${NC}"
    
    mkdir -p "${TRAEFIK_DIR}/dynamic"
    mkdir -p "${TRAEFIK_DIR}/acme"
    
    touch "${TRAEFIK_DIR}/acme/acme.json"
    chmod 600 "${TRAEFIK_DIR}/acme/acme.json"
}

# Function to verify Docker is running 
verify_docker() {
    echo -e "${YELLOW}Verifying Docker installation...${NC}"
    
    if ! systemctl is-active --quiet docker; then
        echo -e "${YELLOW}Starting Docker service...${NC}" 
        systemctl start docker
    fi
    
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}Docker is not running properly${NC}"
        return 1  
    fi
    
    echo -e "${GREEN}Docker is running${NC}"
    return 0
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
    
    # Verify Docker is running
    verify_docker
    
    # Setup or update repository  
    setup_repository
    
    # Create environment file if it doesn't exist
    if [ ! -f "$ENV_FILE" ]; then
        create_env_file  
    fi
    
    # Setup Traefik
    setup_traefik
    
    # Start services
    echo -e "${YELLOW}Starting services...${NC}"
    cd "$INSTALL_DIR"
    docker compose down  
    docker compose pull
    docker compose up -d
    
    echo -e "${GREEN}Installation completed successfully!${NC}"
    echo -e "\nAccess your FlexiBuckets instance at:"  
    echo -e "🌐 HTTP:  http://${DOMAIN:-localhost}:3000"
    echo -e "🔒 HTTPS: https://${DOMAIN:-localhost}"
    
    echo -e "\n${YELLOW}Important Notes:${NC}"
    echo "1. Configuration files are in: $INSTALL_DIR" 
    echo "2. Environment file is at: $ENV_FILE"
    echo "3. Traefik configuration is in: $TRAEFIK_DIR"
}

# Run main installation
main