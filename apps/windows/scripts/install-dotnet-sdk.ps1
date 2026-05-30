Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$toolRoot = Join-Path $repoRoot ".clawdbot\toolchains"
$dotnetDir = Join-Path $toolRoot "dotnet"
$installScript = Join-Path $toolRoot "dotnet-install.ps1"

New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null

if (-not (Test-Path -LiteralPath $installScript)) {
  Invoke-WebRequest -UseBasicParsing -Uri "https://dot.net/v1/dotnet-install.ps1" -OutFile $installScript
}

& powershell -NoProfile -ExecutionPolicy Bypass -File $installScript -Channel 8.0 -Architecture x64 -InstallDir $dotnetDir

$dotnetExe = Join-Path $dotnetDir "dotnet.exe"
& $dotnetExe --info
