# Alpha-Orion Git Push & Hash Capture Script

$RepoUrl = "https://github.com/TemamAb/alphaorion.git"

Write-Host "Configuring remote origin to $RepoUrl..."
git remote remove origin 2>$null
git remote add origin $RepoUrl

Write-Host "Staging and committing all changes..."
git add .
git commit -m "feat: enterprise production release v1.0"

Write-Host "Pushing to GitHub..."
git push -u origin main

$CommitHash = git rev-parse HEAD
Write-Host "`nSUCCESS: Codebase pushed to GitHub."
Write-Host "Commit Hash: $CommitHash"
Write-Host "Copy this hash for your deployment logs."