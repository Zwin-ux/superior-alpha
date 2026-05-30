param(
  [string]$WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path,
  [string]$TaskName = "SUPERIOR Daemon",
  [switch]$Build,
  [switch]$NoStart
)

$ErrorActionPreference = "Stop"

if ($Build) {
  Push-Location $WorkspaceRoot
  try {
    corepack pnpm --filter "@clawdbot/daemon" build
  } finally {
    Pop-Location
  }
}

$node = (Get-Command node -ErrorAction Stop).Source
$daemonEntry = Join-Path $WorkspaceRoot "apps\daemon\dist\server.js"

if (!(Test-Path -LiteralPath $daemonEntry)) {
  throw "Daemon build not found at $daemonEntry. Run corepack pnpm build first or pass -Build."
}

$action = New-ScheduledTaskAction `
  -Execute $node `
  -Argument "`"$daemonEntry`"" `
  -WorkingDirectory $WorkspaceRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn
$userId = if ($env:USERDOMAIN) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }
$principal = New-ScheduledTaskPrincipal `
  -UserId $userId `
  -LogonType Interactive `
  -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Days 0) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

try {
  Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description "Runs the SUPERIOR local daemon on loopback for the desktop app and browser extension." `
    -Force | Out-Null
} catch {
  throw "Windows blocked scheduled task registration for $TaskName as $userId. Run this from an elevated terminal or allow per-user scheduled tasks. $($_.Exception.Message)"
}

if ($NoStart) {
  Write-Host "Installed $TaskName."
} else {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Installed and started $TaskName."
}
