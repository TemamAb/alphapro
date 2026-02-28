$filesToDelete = @(
    ".github\workflows\ci-cd.yml",
    ".github\workflows\deploy.yml",
    "EXECUTE_GO_LIVE.ps1",
    "Dockerfile"
)

Write-Host "🧹 Starting GCP Cleanup..." -ForegroundColor Cyan

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "✅ Deleted: $file" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Not Found: $file" -ForegroundColor Yellow
    }
}

Write-Host "🎉 Cleanup Complete. Repository is now Render-ready." -ForegroundColor Cyan