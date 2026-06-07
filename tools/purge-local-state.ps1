# Purge local SUPERIOR state for clean install testing
$ErrorActionPreference = "Continue"

$workspaceRoot = Get-Location
$dotClawdbot = Join-Path $workspaceRoot ".clawdbot"

if (Test-Path $dotClawdbot) {
    Write-Host "Purging local state at $dotClawdbot..." -ForegroundColor Yellow
    Remove-Item -Path $dotClawdbot -Recurse -Force
    Write-Host "Local state purged." -ForegroundColor Green
} else {
    Write-Host "No local state found at $dotClawdbot." -ForegroundColor Cyan
}

$appDataClawdbot = Join-Path $env:APPDATA "SUPERIOR\.clawdbot"
if (Test-Path $appDataClawdbot) {
    Write-Host "Purging AppData state at $appDataClawdbot..." -ForegroundColor Yellow
    Remove-Item -Path $appDataClawdbot -Recurse -Force
    Write-Host "AppData state purged." -ForegroundColor Green
}
