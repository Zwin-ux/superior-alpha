Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$projectPath = Join-Path $projectRoot "SUPERIOR.Windows\SUPERIOR.Windows.csproj"
$localDotnet = Join-Path $repoRoot ".clawdbot\toolchains\dotnet\dotnet.exe"

if (-not (Test-Path -LiteralPath $projectPath)) {
  Write-Error "Missing native Windows project: $projectPath"
  exit 1
}

$dotnetExe = $null

if ($env:SUPERIOR_DOTNET_PATH) {
  if (Test-Path -LiteralPath $env:SUPERIOR_DOTNET_PATH -PathType Leaf) {
    $dotnetExe = $env:SUPERIOR_DOTNET_PATH
  } else {
    $candidate = Join-Path $env:SUPERIOR_DOTNET_PATH "dotnet.exe"
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
      $dotnetExe = $candidate
    }
  }
}

if (-not $dotnetExe -and (Test-Path -LiteralPath $localDotnet -PathType Leaf)) {
  $dotnetExe = $localDotnet
}

if (-not $dotnetExe) {
  $dotnetCommand = Get-Command dotnet -ErrorAction SilentlyContinue
  if ($dotnetCommand) {
    $dotnetExe = $dotnetCommand.Source
  }
}

if (-not $dotnetExe) {
  Write-Host "SUPERIOR native Windows lane is source-ready, but dotnet is not installed or not on PATH."
  Write-Host "Run: powershell -ExecutionPolicy Bypass -File apps/windows/scripts/install-dotnet-sdk.ps1"
  exit 1
}

$dotnetRoot = Split-Path -Parent $dotnetExe
$env:DOTNET_ROOT = $dotnetRoot
$env:PATH = "$dotnetRoot;$env:PATH"

& $dotnetExe --info
& $dotnetExe build $projectPath -c Debug
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
