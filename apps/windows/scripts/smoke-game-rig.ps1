param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptRoot "..\..\..")
Push-Location $repoRoot

try {
  if (-not $SkipBuild) {
    corepack pnpm --filter @clawdbot/shared build
    corepack pnpm --filter @clawdbot/daemon build
  }

  corepack pnpm fixture:game-runtime:skip-build
} finally {
  Pop-Location
}
