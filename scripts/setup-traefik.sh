#!/bin/bash
set -e

TRAEFIK_DIR="./traefik"
DYNAMIC_DIR="${TRAEFIK_DIR}/dynamic"

# Create Traefik configuration directories
mkdir -p "${DYNAMIC_DIR}"

# Set proper permissions
chmod 775 "${DYNAMIC_DIR}"
chown -R 1001:999 "${DYNAMIC_DIR}"  # flexibuckets:docker

echo "Traefik dynamic configuration directory setup complete" 