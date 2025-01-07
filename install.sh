#!/bin/bash
set -euo pipefail  # Enable strict error handling

# Version and configuration information
readonly VERSION="1.0.0"
readonly SCRIPT_NAME=$(basename "$0")
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Standard paths and configuration
declare -A CONFIG=(
    [INSTALL_DIR]="/opt/flexibuckets"
    [TRAEFIK_DIR]="/etc/traefik"
    [TRAEFIK_DYNAMIC_DIR]="/etc/traefik/dynamic"
    [REPO_URL]="https://github.com/flexibuckets/flexibuckets.git"
    [APP_USER]="flexibuckets"
    [DOCKER_GROUP]="docker"
    [MIN_RAM_GB]=4
    [MIN_CPU_CORES]=2
)

# Color and formatting definitions
declare -A COLORS=(
    [RED]='\033[0;31m'
    [GREEN]='\033[0;32m'
    [YELLOW]='\033[1;33m'
    [BLUE]='\033[0;34m'
    [NC]='\033[0m'
    [BOLD]='\033[1m'
)

# Initialize logging
declare -A LOG_LEVELS=([DEBUG]=0 [INFO]=1 [WARN]=2 [ERROR]=3)
CURRENT_LOG_LEVEL=${LOG_LEVEL:-1}  # Default to INFO

# Helper Functions
log() {
    local level=$1
    shift
    local color_code="${COLORS[${level}]:-${COLORS[NC]}}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [[ ${LOG_LEVELS[$level]:-0} -ge $CURRENT_LOG_LEVEL ]]; then
        echo -e "${color_code}${timestamp} [${level}] $*${COLORS[NC]}" >&2
    fi
}

die() {
    log "ERROR" "$*"
    exit 1
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        die "This script must be run as root. Please use sudo."
    fi
}

create_directories() {
    local dirs=("${CONFIG[INSTALL_DIR]}" "${CONFIG[TRAEFIK_DIR]}" "${CONFIG[TRAEFIK_DYNAMIC_DIR]}")
    
    for dir in "${dirs[@]}"; do
        if ! mkdir -p "$dir" 2>/dev/null; then
            die "Failed to create directory: $dir"
        fi
    done
}

validate_system_requirements() {
    log "INFO" "Validating system requirements..."
    
    # Check CPU cores
    local cpu_cores=$(nproc)
    if [[ $cpu_cores -lt ${CONFIG[MIN_CPU_CORES]} ]]; then
        log "WARN" "System has fewer than recommended CPU cores (${CONFIG[MIN_CPU_CORES]})"
    fi
    
    # Check RAM
    local mem_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local mem_gb=$((mem_kb / 1024 / 1024))
    if [[ $mem_gb -lt ${CONFIG[MIN_RAM_GB]} ]]; then
        log "WARN" "System has less than recommended RAM (${CONFIG[MIN_RAM_GB]}GB)"
    
    
    # Check disk space
    local available_space=$(df -BG "${CONFIG[INSTALL_DIR]}" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ $available_space -lt 10 ]]; then
        log "WARN" "Less than 10GB available disk space"
    fi
}

setup_system_user() {
    log "INFO" "Setting up system user and groups..."
    
    # Create system user if it doesn't exist
    if ! id "${CONFIG[APP_USER]}" &>/dev/null; then
        useradd -r -s /bin/false "${CONFIG[APP_USER]}" || 
            die "Failed to create system user"
    fi
    
    # Ensure Docker group exists
    if ! getent group docker >/dev/null; then
        groupadd docker || die "Failed to create docker group"
    fi
    
    # Add user to docker group
    usermod -aG docker "${CONFIG[APP_USER]}" || 
        die "Failed to add user to docker group"
        
    export APP_UID=$(id -u "${CONFIG[APP_USER]}")
    export DOCKER_GID=$(getent group docker | cut -d: -f3)
}

install_dependencies() {
    log "INFO" "Installing system dependencies..."
    
    apt-get update || die "Failed to update package lists"
    
    local deps=(
        apt-transport-https
        ca-certificates
        curl
        gnupg
        lsb-release
        git
        jq
        wget
    )
    
    apt-get install -y "${deps[@]}" || 
        die "Failed to install dependencies"
}

configure_docker() {
    log "INFO" "Configuring Docker..."
    
    # Install Docker if not present
    if ! command -v docker &>/dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    fi
    
    # Configure Docker daemon
    cat > /etc/docker/daemon.json <<EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "100m",
        "max-file": "3"
    },
    "default-ulimits": {
        "nofile": {
            "Name": "nofile",
            "Hard": 64000,
            "Soft": 64000
        }
    }
}
EOF

    # Restart Docker to apply changes
    systemctl restart docker || die "Failed to restart Docker"
}

generate_configs() {
    log "INFO" "Generating configuration files..."
    
    local env_file="${CONFIG[INSTALL_DIR]}/.env"
    local server_ip=$(curl -s ifconfig.me)
    
    # Generate secure passwords
    local db_password=$(openssl rand -base64 32)
    local auth_secret=$(openssl rand -base64 32)
    
    # Create comprehensive .env file
    cat > "$env_file" <<EOF
# System Configuration
APP_UID=${APP_UID}
DOCKER_GID=${DOCKER_GID}
SERVER_IP=${server_ip}

# Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${db_password}
POSTGRES_DB=flexibuckets
DATABASE_URL=postgresql://postgres:${db_password}@db:5432/flexibuckets

# Application Configuration
NODE_ENV=production
NEXTAUTH_URL=https://${server_ip}
NEXT_PUBLIC_APP_URL=https://${server_ip}
NEXTAUTH_SECRET=${auth_secret}

# Docker & Traefik Configuration
DOMAIN=${server_ip}
TRAEFIK_DIR=${CONFIG[TRAEFIK_DIR]}
ACME_EMAIL=admin@flexibuckets.com
EOF

    chmod 600 "$env_file"
}

setup_services() {
    log "INFO" "Setting up services..."
    
    cd "${CONFIG[INSTALL_DIR]}"
    
    # Pull and start services
    docker compose pull
    docker compose down --remove-orphans
    docker compose up -d
    
    # Wait for services to be healthy
    local timeout=60
    while [[ $timeout -gt 0 ]]; do
        if docker compose ps | grep -q "(healthy)"; then
            log "INFO" "Services are healthy"
            return 0
        fi
        sleep 1
        ((timeout--))
    done
    
    die "Services failed to become healthy within timeout"
}

cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        log "ERROR" "Installation failed with exit code $exit_code"
        log "ERROR" "Check logs for details: ${CONFIG[INSTALL_DIR]}/install.log"
    fi
    exit $exit_code
}

show_help() {
    cat <<EOF
FlexiBuckets Installer v${VERSION}

Usage: $SCRIPT_NAME [OPTIONS]

Options:
    -h, --help          Show this help message
    -v, --verbose       Enable verbose output
    --no-color          Disable colored output
    --skip-deps         Skip dependency installation
    
Example:
    sudo $SCRIPT_NAME --verbose
EOF
    exit 0
}

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help) show_help ;;
            -v|--verbose) CURRENT_LOG_LEVEL=${LOG_LEVELS[DEBUG]} ;;
            --no-color) unset COLORS ;;
            --skip-deps) SKIP_DEPS=1 ;;
            *) die "Unknown option: $1" ;;
        esac
        shift
    done
    
    # Setup error handling
    trap cleanup EXIT
    
    # Begin installation
    log "INFO" "Starting FlexiBuckets installation..."
    
    check_root
    validate_system_requirements
    create_directories
    setup_system_user
    
    [[ ${SKIP_DEPS:-0} -eq 0 ]] && install_dependencies
    
    configure_docker
    generate_configs
    setup_services
    
    log "INFO" "Installation completed successfully!"
    log "INFO" "Access FlexiBuckets at: https://${server_ip}"
}

# Execute main function
main "$@"