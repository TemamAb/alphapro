$ErrorActionPreference = "Stop"

# Ensure we are in the script directory so relative paths and docker-compose work correctly
Set-Location $PSScriptRoot

Write-Host "🐳 Alpha-Orion Docker Verification Sequence" -ForegroundColor Cyan
Write-Host "==========================================="

# 1. Check for Docker and Docker Compose
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed or not in PATH. Please install Docker Desktop."
    exit 1
}

if (-not (docker compose version -ErrorAction SilentlyContinue)) {
    Write-Error "Docker Compose V2 is not available. Please ensure you are using a modern version of Docker Desktop."
    exit 1
}

$Root = $PSScriptRoot
$ServiceDir = Join-Path $Root "backend-services\services\user-api-service"

# 2. Ensure package-lock.json exists (Required for 'npm ci' in Dockerfile)
Write-Host "🔍 Checking dependencies..."
if (-not (Test-Path "$ServiceDir\package-lock.json")) {
    Write-Host "⚠️  package-lock.json missing in user-api-service. Generating..." -ForegroundColor Yellow
    Push-Location $ServiceDir
    try {
        npm install --package-lock-only --quiet
        Write-Host "✅ package-lock.json generated." -ForegroundColor Green
    } catch {
        Write-Error "Failed to generate package-lock.json. Ensure Node.js is installed."
    } finally {
        Pop-Location
    }
}

# 3. Build the Docker Image manually (Verification Step 1)
Write-Host "`n🏗️  Building Docker Image [Standalone Verification]..." -ForegroundColor Cyan
Push-Location $ServiceDir
try {
    docker build -t alpha-orion-api:local .
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed for alpha-orion-api:local."
    }
    Write-Host "✅ Docker Image Built Successfully." -ForegroundColor Green
} finally {
    Pop-Location
}

# 4. Run Stack with Docker Compose (Verification Step 2)
Write-Host "`n🚀 Launching Full Stack [API + DB + Redis]..." -ForegroundColor Cyan
if (Test-Path "$Root\docker-compose.yml") {
    try {
        docker compose down # Cleanup previous runs
        docker compose up -d --build
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Stack is RUNNING!" -ForegroundColor Green
            Write-Host "   👉 API Health: http://localhost:8080/health"
            Write-Host "   👉 Dashboard Stats: http://localhost:8080/api/dashboard/stats [Requires Auth]"
            
            # Robust Health Check with retries
            Write-Host "`n⏳ Waiting for services to stabilize (max 30s)..."
            $HealthCheckSuccess = $false
            for ($i = 1; $i -le 15; $i++) {
                try {
                    $Health = Invoke-RestMethod -Uri "http://localhost:8080/health" -Method Get
                    if ($Health.status -eq 'ok') {
                        Write-Host "🏥 Health Check Status: $($Health.status)" -ForegroundColor Green
                        Write-Host "   DB: $($Health.services.database)"
                        Write-Host "   Redis: $($Health.services.redis)"
                        $HealthCheckSuccess = $true
                        break
                    }
                } catch { # Suppress error message on failed attempts
                }
                Write-Host "   Attempt $i/15: API not ready yet. Retrying in 2s..."
                Start-Sleep -Seconds 2
            }

            if (-not $HealthCheckSuccess) {
                Write-Warning "⚠️  Health check failed after multiple attempts. Container might have crashed."
                docker compose logs api --tail 50
                throw "API service failed to become healthy."
            }
        } else {
            throw "Docker Compose failed to start."
        }
    } catch {
        Write-Error "An error occurred during Docker Compose execution: $_"
        docker compose logs api --tail 50
    }
} else {
    Write-Error "docker-compose.yml not found in $Root"
}

Write-Host "`n📜 Use 'docker compose logs -f' to monitor logs." -ForegroundColor Gray
Write-Host "🛑 Use 'docker compose down' to stop the stack." -ForegroundColor Gray