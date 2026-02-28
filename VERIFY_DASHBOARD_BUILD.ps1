$ErrorActionPreference = "Stop"

# Ensure we are in the script directory
Set-Location $PSScriptRoot

Write-Host "🐳 Alpha-Orion Dashboard Verification Sequence" -ForegroundColor Cyan
Write-Host "=============================================="

# 1. Check for Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed or not in PATH."
    exit 1
}

# 2. Build Docker Image
Write-Host "`n🏗️  Building Dashboard Docker Image..." -ForegroundColor Cyan
# Command from report: docker build --target production-dashboard -t alpha-orion-dashboard:local -f Dockerfile .
try {
    docker build --target production-dashboard -t alpha-orion-dashboard:local -f Dockerfile .
    if ($LASTEXITCODE -ne 0) { throw "Docker build failed." }
    Write-Host "✅ Image Built Successfully." -ForegroundColor Green
} catch {
    Write-Error "Build failed. Ensure 'Dockerfile' exists in the root directory and has target 'production-dashboard'."
    exit 1
}

# 3. Run Container
Write-Host "`n🚀 Starting Container..." -ForegroundColor Cyan
# Cleanup previous
docker rm -f alpha-orion-local 2>$null | Out-Null

# Command from report: docker run -d -p 5000:3000 --name alpha-orion-local alpha-orion-dashboard:local
try {
    docker run -d -p 5000:3000 --name alpha-orion-local alpha-orion-dashboard:local
    if ($LASTEXITCODE -ne 0) { throw "Docker run failed." }
    Write-Host "✅ Container Running on port 5000." -ForegroundColor Green
} catch {
    Write-Error "Failed to start container."
    exit 1
}

# 4. Verify Endpoint
Write-Host "`n⏳ Waiting for service to initialize (5s)..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "🔍 Verifying HTTP Response..." -ForegroundColor Cyan
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing
    if ($Response.StatusCode -eq 200) {
        Write-Host "✅ HTTP 200 OK received." -ForegroundColor Green
        Write-Host "   Content Length: $($Response.Content.Length)"
    } else {
        Write-Host "⚠️  Received Status Code: $($Response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to connect to http://localhost:5000" -ForegroundColor Red
    Write-Host "   Error: $_"
}

Write-Host "`n👉 Action Required: Open http://localhost:5000 in your browser." -ForegroundColor White
Write-Host "   If you see a black screen, check F12 Console." -ForegroundColor Gray