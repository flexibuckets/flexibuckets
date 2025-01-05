#!/bin/bash
set -e

# Colors and formatting
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

# Configuration
INSTALL_DIR="/opt/flexibuckets"
TRAEFIK_DIR="/etc/traefik"
DOCKER_COMPOSE_FILE="${INSTALL_DIR}/docker-compose.yml"
ENV_FILE="${INSTALL_DIR}/.env"

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        echo -e "${RED}Please run as root (use sudo)${NC}"
        exit 1
    fi
}

# Function to install Docker
install_docker() {
    echo -e "${YELLOW}Installing Docker...${NC}"
    
    # Install Docker
    apt-get update
    apt-get install -y docker.io
    
    # Start and enable Docker service
    systemctl start docker
    systemctl enable docker
    
    # Wait for Docker to be fully started
    echo -e "${YELLOW}Waiting for Docker to start...${NC}"
    for i in {1..30}; do
        if systemctl is-active --quiet docker; then
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""
    
    # Verify Docker is running
    if ! systemctl is-active --quiet docker; then
        echo -e "${RED}Failed to start Docker${NC}"
        exit 1
    fi
    
    # Install Docker Compose
    echo -e "${YELLOW}Installing Docker Compose...${NC}"
    apt-get install -y docker-compose
    
    echo -e "${GREEN}Docker installation completed successfully${NC}"
}

# Function to verify Docker installation
verify_docker() {
    echo -e "${YELLOW}Verifying Docker installation...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}Docker is not installed${NC}"
        return 1
    fi
    
    if ! systemctl is-active --quiet docker; then
        echo -e "${RED}Docker service is not running${NC}"
        return 1
    fi
    
    if ! [ -S "/var/run/docker.sock" ]; then
        echo -e "${RED}Docker socket is not available${NC}"
        return 1
    fi
    
    echo -e "${GREEN}Docker verification successful${NC}"
    return 0
}

# Function to generate random string
generate_random_string() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w ${1:-32} | head -n 1
}

# Function to create default .env file
create_env_file() {
    echo -e "${YELLOW}Creating .env file...${NC}"
    
    # Generate random passwords and secrets
    DB_PASSWORD=$(generate_random_string 32)
    NEXTAUTH_SECRET=$(generate_random_string 32)
    
    # Get the server's public IP
    PUBLIC_IP=$(curl -s https://api.ipify.org)
    
    # Create .env file
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
COMPOSE_PROJECT_NAME=flexibuckets
DOMAIN=${PUBLIC_IP}
APP_VERSION=latest

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

# Main installation function
main() {
    echo -e "${BOLD}FlexiBuckets Installer${NC}"
    
    # Check root
    check_root
    
    # Check Docker installation
    if ! verify_docker; then
        echo -e "${YELLOW}Docker not found or not running. Installing Docker...${NC}"
        install_docker
        
        # Verify Docker installation again
        if ! verify_docker; then
            echo -e "${RED}Docker installation failed${NC}"
            exit 1
        fi
    fi
    
    # Create directories
    mkdir -p "$INSTALL_DIR"
    
    # Clone repository and setup
    echo -e "${YELLOW}Fetching latest version...${NC}"
    git clone https://github.com/flexibuckets/flexibuckets.git "${INSTALL_DIR}/temp"
    cp -r "${INSTALL_DIR}/temp/"* "$INSTALL_DIR/"
    rm -rf "${INSTALL_DIR}/temp"
    
    # Create .env file
    create_env_file
    
    # Setup Traefik
    setup_traefik
    
    # Start services
    echo -e "${YELLOW}Starting services...${NC}"
    cd "$INSTALL_DIR"
    docker-compose pull
    docker-compose up -d
    
    # Show success message
    echo -e "\n${GREEN}✨ Installation Complete!${NC}"
    echo -e "\nAccess your FlexiBuckets instance at:"
    echo -e "🔒 HTTPS: https://${DOMAIN:-localhost}"
    echo -e "🌐 HTTP:  http://localhost:3000"
    
    echo -e "\n${YELLOW}Important Notes:${NC}"
    echo "1. Configuration files are in: $INSTALL_DIR"
    echo "2. Environment file is at: $ENV_FILE"
    echo "3. Traefik configuration is in: $TRAEFIK_DIR"
    echo -e "\n${YELLOW}⚠️  Make sure to save your environment file securely${NC}"
}

# Run main installation
main