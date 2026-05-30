Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$exePath = Join-Path $projectRoot "SUPERIOR.Windows\bin\Debug\net8.0-windows\SUPERIOR.Windows.exe"

if (-not (Test-Path -LiteralPath $exePath)) {
  Write-Error "Missing native Windows app build output. Run corepack pnpm windows:check first."
  exit 1
}

$process = Start-Process -FilePath $exePath -WindowStyle Hidden -PassThru
Start-Sleep -Seconds 3

$stayedAlive = -not $process.HasExited

if ($stayedAlive) {
  Stop-Process -Id $process.Id -Force
}

[pscustomobject]@{
  exe = $exePath
  processId = $process.Id
  launched = $true
  stayedAliveForSmoke = $stayedAlive
} | ConvertTo-Json -Depth 3

if (-not $stayedAlive) {
  exit 1
}
