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

# Function to generate random string
generate_random_string() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | fold -w ${1:-32} | head -n 1
}

# Function to install Docker
install_docker() {
    echo -e "${YELLOW}Checking Docker installation...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Installing Docker...${NC}"
        # Install Docker using the official convenience script
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        
        # Start and enable Docker service
        systemctl start docker
        systemctl enable docker
        
        echo -e "${GREEN}Docker installed successfully${NC}"
    else
        echo -e "${GREEN}Docker is already installed${NC}"
    fi
    
    # Install Docker Compose if not present
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}Installing Docker Compose...${NC}"
        mkdir -p ~/.docker/cli-plugins/
        curl -SL https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
        chmod +x ~/.docker/cli-plugins/docker-compose
        echo -e "${GREEN}Docker Compose installed successfully${NC}"
    fi
    
    # Ensure Docker is running
    if ! systemctl is-active --quiet docker; then
        echo -e "${YELLOW}Starting Docker service...${NC}"
        systemctl start docker
    fi
    
    # Add current user to docker group
    usermod -aG docker $SUDO_USER
    
    # Verify Docker is running
    if docker info &> /dev/null; then
        echo -e "${GREEN}Docker is running and ready${NC}"
    else
        echo -e "${RED}Failed to start Docker${NC}"
        exit 1
    fi
}

# Function to create default .env file
create_env_file() {
    echo -e "${YELLOW}Creating .env file...${NC}"
    
    # Generate random passwords and secrets
    DB_PASSWORD=$(generate_random_string 32)
    NEXTAUTH_SECRET=$(generate_random_string 32)
    
    # Get the server's public IP
    PUBLIC_IP=$(curl -s https://api.ipify.org)
    
    # Get Docker group ID (now safe since Docker is installed)
    DOCKER_GID=$(getent group docker | cut -d: -f3)
    
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
DOCKER_GROUP_ID=${DOCKER_GID}
EOL

    chmod 600 "$ENV_FILE"
    echo -e "${GREEN}Created .env file at ${ENV_FILE}${NC}"
}

# Function to clean up installation
cleanup_installation() {
    echo -e "${YELLOW}Cleaning up previous installation...${NC}"
    
    # Stop and remove containers if docker-compose exists
    if command -v docker-compose &> /dev/null && [ -f "$DOCKER_COMPOSE_FILE" ]; then
        cd "$INSTALL_DIR" && docker-compose down -v --remove-orphans || true
    fi
    
    # Remove Docker resources
    if command -v docker &> /dev/null; then
        docker network rm flexibuckets_network 2>/dev/null || true
        docker volume rm flexibuckets_postgres_data 2>/dev/null || true
    fi
    
    # Remove directories
    rm -rf "$INSTALL_DIR"
    rm -rf "$TRAEFIK_DIR"
    
    echo -e "${GREEN}Cleanup completed${NC}"
}

# Function to setup Traefik
setup_traefik() {
    echo -e "${YELLOW}Setting up Traefik...${NC}"
    
    mkdir -p "${TRAEFIK_DIR}/dynamic"
    mkdir -p "${TRAEFIK_DIR}/acme"
    
    touch "${TRAEFIK_DIR}/acme/acme.json"
    chmod 600 "${TRAEFIK_DIR}/acme/acme.json"
    
    # Set proper permissions
    chown -R 1001:$(getent group docker | cut -d: -f3) "$TRAEFIK_DIR"
    chmod -R 750 "$TRAEFIK_DIR"
}

# Function to setup Docker permissions
setup_docker_permissions() {
    echo -e "${YELLOW}Setting up Docker permissions...${NC}"
    
    if [ -S "/var/run/docker.sock" ]; then
        chmod 666 /var/run/docker.sock
        echo -e "${GREEN}Docker socket permissions updated${NC}"
    else
        echo -e "${RED}Docker socket not found. Is Docker running?${NC}"
        exit 1
    fi
}

# Function to validate installation
validate_installation() {
    local error_count=0
    
    echo -e "\n${BLUE}Validating installation...${NC}"
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        echo -e "${RED}✗ Docker is not running${NC}"
        error_count=$((error_count + 1))
    else
        echo -e "${GREEN}✓ Docker is running${NC}"
    fi
    
    # Check if containers are running
    if [ -f "$DOCKER_COMPOSE_FILE" ]; then
        cd "$INSTALL_DIR"
        if ! docker-compose ps | grep -q "Up"; then
            echo -e "${RED}✗ Containers are not running${NC}"
            error_count=$((error_count + 1))
        else
            echo -e "${GREEN}✓ Containers are running${NC}"
        fi
    else
        echo -e "${RED}✗ Docker Compose file not found${NC}"
        error_count=$((error_count + 1))
    fi
    
    if [ $error_count -gt 0 ]; then
        echo -e "\n${RED}Installation validation failed with $error_count errors${NC}"
        return 1
    else
        echo -e "\n${GREEN}Installation validation successful!${NC}"
        return 0
    fi
}

# Main installation function
main() {
    echo -e "${BOLD}FlexiBuckets Installer${NC}"
    
    # Check root
    check_root
    
    # Install and setup Docker first
    install_docker
    
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
    
    # Setup Docker permissions
    setup_docker_permissions
    
    # Start services
    echo -e "${YELLOW}Starting services...${NC}"
    cd "$INSTALL_DIR"
    docker-compose pull
    docker-compose up -d
    
    # Validate installation
    validate_installation
    
    # Show success message
    if [ $? -eq 0 ]; then
        echo -e "\n${GREEN}✨ Installation Complete!${NC}"
        echo -e "\nAccess your FlexiBuckets instance at:"
        echo -e "🔒 HTTPS: https://${DOMAIN:-localhost}"
        echo -e "🌐 HTTP:  http://localhost:3000"
        
        echo -e "\n${YELLOW}Important Notes:${NC}"
        echo "1. Configuration files are in: $INSTALL_DIR"
        echo "2. Environment file is at: $ENV_FILE"
        echo "3. Traefik configuration is in: $TRAEFIK_DIR"
        echo -e "\n${YELLOW}⚠️  Make sure to save your environment file securely${NC}"
    fi
}

# Handle script flags
case "$1" in
    --clean)
        cleanup_installation
        exit 0
        ;;
    --validate)
        validate_installation
        exit 0
        ;;
    *)
        main
        ;;
esac