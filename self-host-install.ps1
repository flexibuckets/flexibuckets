#Requires -Version 5.1
<#
.SYNOPSIS
    FlexiBuckets Self-Host Installer for Windows

.DESCRIPTION
    Installs and configures FlexiBuckets for local self-hosting on Windows
    using Docker Desktop. Sets up PostgreSQL + the FlexiBuckets app.

.NOTES
    Prerequisites: Docker Desktop for Windows must be installed and running.
    Run this script from the root of the flexibuckets repository clone.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─────────────────────────────────────────────────────────────
# Globals
# ─────────────────────────────────────────────────────────────
$SCRIPT_DIR   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ENV_FILE     = Join-Path $SCRIPT_DIR ".env"
$KEY_FILE     = Join-Path $SCRIPT_DIR "encryption_key.txt"
$COMPOSE_FILE = "docker-compose.local.yml"

# ─────────────────────────────────────────────────────────────
# Helper: Generate a cryptographically random Base64 string
# ─────────────────────────────────────────────────────────────
function New-RandomSecret {
    param([int]$ByteLength = 32)
    $bytes = [byte[]]::new($ByteLength)
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    return [System.Convert]::ToBase64String($bytes)
}

# ─────────────────────────────────────────────────────────────
# Helper: Generate a filesystem-safe random password (alphanumeric)
# ─────────────────────────────────────────────────────────────
function New-RandomPassword {
    param([int]$ByteLength = 24)
    $raw = New-RandomSecret -ByteLength $ByteLength
    # Strip non-alphanumeric chars so it's safe in URLs / connection strings
    return ($raw -replace '[^a-zA-Z0-9]', '').Substring(0, 32)
}

# ─────────────────────────────────────────────────────────────
# 1. Banner
# ─────────────────────────────────────────────────────────────
function Show-Banner {
    $banner = @"

   _____ _           _ ____             _        _
  |  ___| | _____  _(_) __ ) _   _  ___| | _____| |_ ___
  | |_  | |/ _ \ \/ / |  _ \| | | |/ __| |/ / _ \ __/ __|
  |  _| | |  __/>  <| | |_) | |_| | (__|   <  __/ |_\__ \
  |_|   |_|\___/_/\_\_|____/ \__,_|\___|_|\_\___|\__|___/

          Self-Host Installer for Windows
"@
    Write-Host $banner -ForegroundColor Cyan
    Write-Host ""
}

# ─────────────────────────────────────────────────────────────
# 2. Check prerequisites
# ─────────────────────────────────────────────────────────────
function Test-Prerequisites {
    Write-Host "`n[1/8] Checking prerequisites..." -ForegroundColor Cyan

    # --- Docker Engine ---
    try {
        $dockerVer = docker version --format '{{.Server.Version}}' 2>&1
        if ($LASTEXITCODE -ne 0) { throw "docker returned exit code $LASTEXITCODE" }
        Write-Host "  [OK] Docker Engine detected: $dockerVer" -ForegroundColor Green
    }
    catch {
        Write-Host "  [FAIL] Docker Desktop is not installed or not running." -ForegroundColor Red
        Write-Host ""
        Write-Host "  Please install Docker Desktop for Windows:" -ForegroundColor Yellow
        Write-Host "    https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  After installing, make sure Docker Desktop is running" -ForegroundColor Yellow
        Write-Host "  (look for the whale icon in the system tray) and try again." -ForegroundColor Yellow
        exit 1
    }

    # --- Docker Compose v2 ---
    try {
        $composeVer = docker compose version --short 2>&1
        if ($LASTEXITCODE -ne 0) { throw "docker compose returned exit code $LASTEXITCODE" }
        Write-Host "  [OK] Docker Compose detected: $composeVer" -ForegroundColor Green
    }
    catch {
        Write-Host "  [FAIL] Docker Compose v2 is not available." -ForegroundColor Red
        Write-Host ""
        Write-Host "  Docker Compose v2 is bundled with Docker Desktop." -ForegroundColor Yellow
        Write-Host "  Please update Docker Desktop to the latest version:" -ForegroundColor Yellow
        Write-Host "    https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
        exit 1
    }
}

# ─────────────────────────────────────────────────────────────
# 3. Find available port
# ─────────────────────────────────────────────────────────────
function Find-AvailablePort {
    Write-Host "`n[2/8] Finding available port..." -ForegroundColor Cyan

    for ($port = 3000; $port -le 3010; $port++) {
        $inUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if (-not $inUse) {
            Write-Host "  [OK] Port $port is available" -ForegroundColor Green
            return $port
        }
        Write-Host "  Port $port is in use, trying next..." -ForegroundColor Yellow
    }

    Write-Host "  [FAIL] No available ports found in range 3000-3010." -ForegroundColor Red
    Write-Host "  Please free up a port and try again." -ForegroundColor Yellow
    exit 1
}

# ─────────────────────────────────────────────────────────────
# 4. Database choice
# ─────────────────────────────────────────────────────────────
function Get-DatabaseConfig {
    param([int]$Port)

    Write-Host "`n[3/8] Database configuration" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  How would you like to set up the database?" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    [1] Use bundled PostgreSQL (recommended)" -ForegroundColor White
    Write-Host "        A PostgreSQL 16 container will run alongside the app." -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "    [2] Use external PostgreSQL (cloud DB / existing server)" -ForegroundColor White
    Write-Host "        Provide your own connection string." -ForegroundColor DarkGray
    Write-Host ""

    do {
        $choice = Read-Host "  Enter choice [1/2] (default: 1)"
        if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }
    } while ($choice -notin @("1", "2"))

    $config = @{
        UseBundledDb  = $false
        DatabaseUrl   = ""
        PostgresUser  = ""
        PostgresPass  = ""
        PostgresDb    = ""
    }

    if ($choice -eq "1") {
        # Bundled PostgreSQL
        $dbPassword = New-RandomPassword
        $config.UseBundledDb = $true
        $config.PostgresUser = "postgres"
        $config.PostgresPass = $dbPassword
        $config.PostgresDb   = "flexibuckets"
        $config.DatabaseUrl  = "postgresql://postgres:${dbPassword}@db:5432/flexibuckets"

        Write-Host ""
        Write-Host "  [OK] Bundled PostgreSQL configured" -ForegroundColor Green
        Write-Host "       Database password has been auto-generated." -ForegroundColor DarkGray
    }
    else {
        # External PostgreSQL
        Write-Host ""
        Write-Host "  Enter your PostgreSQL connection string." -ForegroundColor Yellow
        Write-Host "  Format: postgresql://user:password@host:port/database" -ForegroundColor DarkGray
        Write-Host ""

        do {
            $connStr = Read-Host "  Connection string"
            if ($connStr -notmatch '^postgres(ql)?://') {
                Write-Host "  [!] Connection string must start with postgresql:// or postgres://" -ForegroundColor Red
                $connStr = ""
            }
        } while ([string]::IsNullOrWhiteSpace($connStr))

        $config.UseBundledDb = $false
        $config.DatabaseUrl  = $connStr

        Write-Host ""
        Write-Host "  [OK] External database configured" -ForegroundColor Green
    }

    return $config
}

# ─────────────────────────────────────────────────────────────
# 5. Generate secrets
# ─────────────────────────────────────────────────────────────
function New-AppSecrets {
    Write-Host "`n[4/8] Generating secrets..." -ForegroundColor Cyan

    $secrets = @{
        NextAuthSecret = New-RandomSecret -ByteLength 32
        EncryptionKey  = New-RandomSecret -ByteLength 32
    }

    # Save encryption key to file
    $keyHeader = "# FlexiBuckets Encryption Key - KEEP THIS FILE SAFE. DO NOT DELETE.`n"
    $keyHeader += "# This key is used to encrypt sensitive data (S3 credentials, etc.).`n"
    $keyHeader += "# If you lose this key, encrypted data cannot be recovered.`n"
    $keyHeader += "# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
    $keyContent = $keyHeader + "`n" + $secrets.EncryptionKey

    [System.IO.File]::WriteAllText($KEY_FILE, $keyContent, [System.Text.UTF8Encoding]::new($false))

    Write-Host "  [OK] NEXTAUTH_SECRET generated" -ForegroundColor Green
    Write-Host "  [OK] ENCRYPTION_KEY generated" -ForegroundColor Green
    Write-Host "  [OK] Encryption key saved to: $KEY_FILE" -ForegroundColor Green
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
    Write-Host "  ║  WARNING: Back up encryption_key.txt to a safe location!    ║" -ForegroundColor Yellow
    Write-Host "  ║  If you lose this key, encrypted data CANNOT be recovered.  ║" -ForegroundColor Yellow
    Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow

    return $secrets
}

# ─────────────────────────────────────────────────────────────
# 6. Fetch latest version
# ─────────────────────────────────────────────────────────────
function Get-LatestVersion {
    Write-Host "`n[5/8] Fetching latest version..." -ForegroundColor Cyan

    $version  = "latest"
    $shaShort = "latest"

    # Try to get version from version.txt
    try {
        $versionResponse = Invoke-RestMethod -Uri "https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/version.txt" `
            -TimeoutSec 10 -ErrorAction Stop
        $fetchedVersion = ($versionResponse).Trim()
        if (-not [string]::IsNullOrWhiteSpace($fetchedVersion)) {
            $version = $fetchedVersion
        }
        Write-Host "  [OK] Latest version: $version" -ForegroundColor Green
    }
    catch {
        Write-Host "  [!] Could not fetch version, using fallback: $version" -ForegroundColor Yellow
    }

    # Try to get latest commit SHA
    try {
        $commitResponse = Invoke-RestMethod -Uri "https://api.github.com/repos/flexibuckets/flexibuckets/commits/main" `
            -TimeoutSec 10 -ErrorAction Stop
        $fullSha = $commitResponse.sha
        if (-not [string]::IsNullOrWhiteSpace($fullSha)) {
            $shaShort = $fullSha.Substring(0, 7)
        }
        Write-Host "  [OK] Latest commit: $shaShort" -ForegroundColor Green
    }
    catch {
        Write-Host "  [!] Could not fetch commit SHA, using fallback: $shaShort" -ForegroundColor Yellow
    }

    return @{
        Version  = $version
        ShaShort = $shaShort
    }
}

# ─────────────────────────────────────────────────────────────
# 7. Create .env file
# ─────────────────────────────────────────────────────────────
function Write-EnvFile {
    param(
        [hashtable]$DbConfig,
        [hashtable]$Secrets,
        [hashtable]$VersionInfo,
        [int]$Port
    )

    Write-Host "`n[6/8] Creating .env file..." -ForegroundColor Cyan

    # Check for existing .env and back it up
    if (Test-Path $ENV_FILE) {
        $backupFile = "${ENV_FILE}.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        Copy-Item $ENV_FILE $backupFile
        Write-Host "  [!] Existing .env backed up to: $(Split-Path -Leaf $backupFile)" -ForegroundColor Yellow
    }

    $envLines = [System.Collections.Generic.List[string]]::new()

    # Header
    $envLines.Add("# ============================================")
    $envLines.Add("# FlexiBuckets - Local Self-Host Configuration")
    $envLines.Add("# Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
    $envLines.Add("# ============================================")
    $envLines.Add("")

    # Database
    $envLines.Add("# --- Database ---")
    $envLines.Add("DATABASE_URL=$($DbConfig.DatabaseUrl)")

    if ($DbConfig.UseBundledDb) {
        $envLines.Add("POSTGRES_USER=$($DbConfig.PostgresUser)")
        $envLines.Add("POSTGRES_PASSWORD=$($DbConfig.PostgresPass)")
        $envLines.Add("POSTGRES_DB=$($DbConfig.PostgresDb)")
    }
    $envLines.Add("")

    # Deployment
    $envLines.Add("# --- Deployment ---")
    $envLines.Add("DEPLOYMENT_MODE=local")
    $envLines.Add("NODE_ENV=production")
    $envLines.Add("")

    # Auth
    $envLines.Add("# --- Authentication ---")
    $envLines.Add("NEXTAUTH_SECRET=$($Secrets.NextAuthSecret)")
    $envLines.Add("NEXTAUTH_URL=http://localhost:${Port}")
    $envLines.Add("AUTH_TRUST_HOST=true")
    $envLines.Add("")

    # App
    $envLines.Add("# --- Application ---")
    $envLines.Add("NEXT_PUBLIC_APP_URL=http://localhost:${Port}")
    $envLines.Add("ENCRYPTION_KEY=$($Secrets.EncryptionKey)")
    $envLines.Add("APP_PORT=${Port}")
    $envLines.Add("")

    # Version
    $envLines.Add("# --- Version ---")
    $envLines.Add("APP_VERSION=$($VersionInfo.Version)")
    $envLines.Add("APP_SHA_SHORT=$($VersionInfo.ShaShort)")
    $envLines.Add("")

    # Docker Compose
    $envLines.Add("# --- Docker Compose ---")
    $envLines.Add("COMPOSE_FILE=$COMPOSE_FILE")

    if ($DbConfig.UseBundledDb) {
        $envLines.Add("COMPOSE_PROFILES=fullstack")
    }
    $envLines.Add("")

    # Write with UTF-8 no BOM
    $content = $envLines -join "`n"
    [System.IO.File]::WriteAllText($ENV_FILE, $content, [System.Text.UTF8Encoding]::new($false))

    Write-Host "  [OK] .env file created at: $ENV_FILE" -ForegroundColor Green
}

# ─────────────────────────────────────────────────────────────
# 8. Start services
# ─────────────────────────────────────────────────────────────
function Start-Services {
    Write-Host "`n[7/8] Starting services..." -ForegroundColor Cyan

    # Pull latest images first
    Write-Host "  Pulling container images (this may take a few minutes)..." -ForegroundColor DarkGray
    $pullResult = & docker compose -f $COMPOSE_FILE pull 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [!] Image pull had warnings (continuing):" -ForegroundColor Yellow
        Write-Host "      $pullResult" -ForegroundColor DarkGray
    }

    # Start containers
    Write-Host "  Starting containers..." -ForegroundColor DarkGray
    & docker compose -f $COMPOSE_FILE up -d 2>&1 | ForEach-Object {
        Write-Host "      $_" -ForegroundColor DarkGray
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Failed to start services." -ForegroundColor Red
        Write-Host "  Check Docker Desktop is running and try again." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Debug with: docker compose -f $COMPOSE_FILE logs" -ForegroundColor Yellow
        exit 1
    }

    # Wait for services to be ready
    Write-Host "  Waiting for services to become healthy..." -ForegroundColor DarkGray
    $maxWait = 60
    $waited  = 0
    while ($waited -lt $maxWait) {
        $running = docker compose -f $COMPOSE_FILE ps --format json 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
        if ($running) {
            $allUp = $true
            foreach ($svc in $running) {
                if ($svc.State -ne "running") { $allUp = $false; break }
            }
            if ($allUp) { break }
        }
        Start-Sleep -Seconds 2
        $waited += 2
        Write-Host "      Waiting... ($waited/$maxWait seconds)" -ForegroundColor DarkGray
    }

    if ($waited -ge $maxWait) {
        Write-Host "  [!] Services may not be fully ready yet (timed out after ${maxWait}s)." -ForegroundColor Yellow
        Write-Host "      Check status with: docker compose -f $COMPOSE_FILE ps" -ForegroundColor Yellow
    }
    else {
        Write-Host "  [OK] All services are running" -ForegroundColor Green
    }
}

# ─────────────────────────────────────────────────────────────
# 9. Run database migrations
# ─────────────────────────────────────────────────────────────
function Invoke-Migrations {
    param([bool]$UseBundledDb)

    Write-Host "`n[8/8] Running database migrations..." -ForegroundColor Cyan

    # If bundled DB, wait for PostgreSQL to accept connections
    if ($UseBundledDb) {
        Write-Host "  Waiting for PostgreSQL to be ready..." -ForegroundColor DarkGray
        $maxWait = 30
        $waited  = 0
        $dbReady = $false

        while ($waited -lt $maxWait) {
            & docker compose -f $COMPOSE_FILE exec -T db pg_isready -h localhost -U postgres 2>$null | Out-Null
            if ($LASTEXITCODE -eq 0) {
                $dbReady = $true
                break
            }
            Start-Sleep -Seconds 1
            $waited++
            if ($waited % 5 -eq 0) {
                Write-Host "      Waiting for database... ($waited/$maxWait seconds)" -ForegroundColor DarkGray
            }
        }

        if (-not $dbReady) {
            Write-Host "  [FAIL] PostgreSQL did not become ready within ${maxWait}s." -ForegroundColor Red
            Write-Host "  Check logs with: docker compose -f $COMPOSE_FILE logs db" -ForegroundColor Yellow
            exit 1
        }

        Write-Host "  [OK] PostgreSQL is ready" -ForegroundColor Green
    }

    # Run Prisma migrations
    Write-Host "  Applying Prisma migrations..." -ForegroundColor DarkGray
    & docker compose -f $COMPOSE_FILE exec -T app sh -c 'cd /app && TMPDIR=/tmp ./node_modules/.bin/prisma migrate deploy' 2>&1 | ForEach-Object {
        Write-Host "      $_" -ForegroundColor DarkGray
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [!] Migration had issues. The app may still work if this is a fresh install." -ForegroundColor Yellow
        Write-Host "      Check logs with: docker compose -f $COMPOSE_FILE logs app" -ForegroundColor Yellow
    }
    else {
        Write-Host "  [OK] Database migrations applied successfully" -ForegroundColor Green
    }
}

# ─────────────────────────────────────────────────────────────
# 10. Print success summary
# ─────────────────────────────────────────────────────────────
function Show-Success {
    param([int]$Port)

    $url = "http://localhost:${Port}"

    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║                                                              ║" -ForegroundColor Green
    Write-Host "  ║   FlexiBuckets is ready!                                     ║" -ForegroundColor Green
    Write-Host "  ║                                                              ║" -ForegroundColor Green
    Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Access your instance:" -ForegroundColor White
    Write-Host "    $url" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  File locations:" -ForegroundColor White
    Write-Host "    Config:         $ENV_FILE" -ForegroundColor DarkGray
    Write-Host "    Encryption key: $KEY_FILE" -ForegroundColor DarkGray
    Write-Host "    Compose file:   $(Join-Path $SCRIPT_DIR $COMPOSE_FILE)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Useful commands:" -ForegroundColor White
    Write-Host "    View logs:      docker compose -f $COMPOSE_FILE logs -f" -ForegroundColor DarkGray
    Write-Host "    Stop:           docker compose -f $COMPOSE_FILE down" -ForegroundColor DarkGray
    Write-Host "    Restart:        docker compose -f $COMPOSE_FILE restart" -ForegroundColor DarkGray
    Write-Host "    Status:         docker compose -f $COMPOSE_FILE ps" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  For support: https://github.com/flexibuckets/flexibuckets" -ForegroundColor Yellow
    Write-Host ""
}

# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────
function Main {
    # Ensure we're running from the repo root
    Push-Location $SCRIPT_DIR

    try {
        Show-Banner
        Test-Prerequisites

        $port       = Find-AvailablePort
        $dbConfig   = Get-DatabaseConfig -Port $port
        $secrets    = New-AppSecrets
        $versionInfo = Get-LatestVersion

        Write-EnvFile -DbConfig $dbConfig -Secrets $secrets -VersionInfo $versionInfo -Port $port
        Start-Services
        Invoke-Migrations -UseBundledDb $dbConfig.UseBundledDb
        Show-Success -Port $port
    }
    catch {
        Write-Host ""
        Write-Host "  [ERROR] Installation failed:" -ForegroundColor Red
        Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "  Stack trace:" -ForegroundColor DarkGray
        Write-Host "  $($_.ScriptStackTrace)" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "  If this is a Docker issue, make sure Docker Desktop is running." -ForegroundColor Yellow
        Write-Host "  For help, visit: https://github.com/flexibuckets/flexibuckets/issues" -ForegroundColor Yellow
        exit 1
    }
    finally {
        Pop-Location
    }
}

# Run
Main
