#!/bin/bash

# Set strict error handling
set -eo pipefail

# Configuration
HEALTH_ENDPOINT="http://localhost:3000/api/health"
TIMEOUT=5
MAX_MEMORY_PERCENT=90
MAX_DISK_PERCENT=90

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to log messages
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check HTTP endpoint
check_http_endpoint() {
    if command_exists curl; then
        response=$(curl -s -f -m $TIMEOUT "$HEALTH_ENDPOINT" 2>&1)
        return $?
    elif command_exists wget; then
        response=$(wget -q -T $TIMEOUT -O - "$HEALTH_ENDPOINT" 2>&1)
        return $?
    else
        log_message "ERROR: Neither curl nor wget is available"
        return 1
    fi
}

# Function to check memory usage
check_memory() {
    if command_exists free; then
        memory_usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
        if [ "$memory_usage" -gt "$MAX_MEMORY_PERCENT" ]; then
            log_message "ERROR: Memory usage is ${memory_usage}%"
            return 1
        fi
    fi
    return 0
}

# Function to check disk usage
check_disk() {
    if command_exists df; then
        disk_usage=$(df -h / | awk 'NR==2 {gsub(/%/,""); print $5}')
        if [ "$disk_usage" -gt "$MAX_DISK_PERCENT" ]; then
            log_message "ERROR: Disk usage is ${disk_usage}%"
            return 1
        fi
    fi
    return 0
}

# Function to check if Node process is running
check_node_process() {
    if ! pgrep -f "bun" > /dev/null; then
        log_message "ERROR: Bun process is not running"
        return 1
    fi
    return 0
}

# Main health check
main() {
    # Check HTTP endpoint
    if ! check_http_endpoint; then
        log_message "ERROR: Health endpoint check failed"
        exit 1
    fi

    # Check memory usage
    if ! check_memory; then
        exit 1
    fi

    # Check disk usage
    if ! check_disk; then
        exit 1
    fi

    # Check if Node process is running
    if ! check_node_process; then
        exit 1
    fi

    log_message "SUCCESS: All health checks passed"
    exit 0
}

# Run main function
main