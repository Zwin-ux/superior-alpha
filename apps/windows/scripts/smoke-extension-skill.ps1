Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$healthUrl = "http://127.0.0.1:5317/health"
$ownedDaemon = $null

function Test-DaemonReady {
  try {
    $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 1
    return $response.service -eq "superior-daemon"
  } catch {
    return $false
  }
}

Push-Location $repoRoot
try {
  if (-not (Test-DaemonReady)) {
    $ownedDaemon = Start-Process `
      -FilePath "cmd.exe" `
      -ArgumentList "/c corepack pnpm dev:daemon" `
      -WorkingDirectory $repoRoot `
      -WindowStyle Hidden `
      -PassThru

    $ready = $false

    for ($attempt = 0; $attempt -lt 40; $attempt++) {
      Start-Sleep -Milliseconds 500

      if (Test-DaemonReady) {
        $ready = $true
        break
      }
    }

    if (-not $ready) {
      throw "SUPERIOR daemon did not become ready for extension skill smoke."
    }
  }

  node tools/contract-fixtures/run-extension-skill-fixture.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  if ($ownedDaemon -and -not $ownedDaemon.HasExited) {
    taskkill.exe /PID $ownedDaemon.Id /T /F | Out-Null
  }

  Pop-Location
}
