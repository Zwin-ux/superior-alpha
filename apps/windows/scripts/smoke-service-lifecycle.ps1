Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$installScript = Join-Path $repoRoot "apps\daemon\scripts\install-windows-service.ps1"
$uninstallScript = Join-Path $repoRoot "apps\daemon\scripts\uninstall-windows-service.ps1"
$taskName = "SUPERIOR Daemon Smoke"
$installed = $false

function New-Report {
  param(
    [string]$Status,
    [string]$Detail,
    [int]$ExitCode = 0
  )

  [pscustomobject]@{
    taskName = $taskName
    status = $Status
    detail = $Detail
    exitCode = $ExitCode
  } | ConvertTo-Json -Depth 3
}

try {
  & $installScript -WorkspaceRoot $repoRoot -TaskName $taskName -Build -NoStart | Out-String | Out-Null
  $installed = $true
  $task = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
  New-Report -Status "installed" -Detail "scheduled task state: $($task.State)"
} catch {
  $message = $_.Exception.Message

  if ($message -match "Access is denied|blocked scheduled task|elevated") {
    New-Report -Status "needs-admin" -Detail $message
    exit 0
  }

  New-Report -Status "failed" -Detail $message -ExitCode 1
  exit 1
} finally {
  if ($installed) {
    & $uninstallScript -TaskName $taskName | Out-String | Out-Null
  }
}
