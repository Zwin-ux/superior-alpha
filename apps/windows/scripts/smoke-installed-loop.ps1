param(
  [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$artifactRoot = Join-Path $repoRoot ".clawdbot\artifacts\windows"
$msiPath = Join-Path $artifactRoot "SUPERIOR-0.7.0-alpha-win-x64.msi"
$installDir = Join-Path $env:LOCALAPPDATA "Programs\SUPERIOR"
$installedExe = Join-Path $installDir "SUPERIOR.Windows.exe"
$stateDir = Join-Path $env:APPDATA "SUPERIOR\.clawdbot"
$healthUrl = "http://127.0.0.1:5317/health"
$botIdentityUrl = "http://127.0.0.1:5317/bot-identity"
$logPath = Join-Path $artifactRoot "installed-loop-msi.log"
$process = $null
$originalBotIdentity = $null

function Invoke-Msi([string[]]$arguments) {
  $msiexec = Start-Process -FilePath "msiexec.exe" -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden
  if ($msiexec.ExitCode -ne 0 -and $msiexec.ExitCode -ne 3010) {
    throw "msiexec failed with exit code $($msiexec.ExitCode). See $logPath"
  }
}

function Test-DaemonHealth {
  try {
    return Invoke-RestMethod -Uri $healthUrl -TimeoutSec 1
  } catch {
    return $null
  }
}

function Wait-InstalledDaemonReady {
  $ready = $false
  $health = $null

  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    Start-Sleep -Milliseconds 500
    $health = Test-DaemonHealth

    if ($health -and $health.service -eq "superior-daemon" -and $health.localConfig.stateDirectory -eq $stateDir) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    throw "Installed daemon did not become ready from $stateDir."
  }

  return $health
}

function Get-BotIdentity {
  return Invoke-RestMethod -Uri $botIdentityUrl -TimeoutSec 2
}

function Save-BotIdentity($bot) {
  $body = $bot | ConvertTo-Json -Depth 8
  return Invoke-RestMethod -Uri $botIdentityUrl -Method Put -ContentType "application/json" -Body $body -TimeoutSec 3
}

function New-ReinstallProofBotIdentity {
  $now = (Get-Date).ToUniversalTime().ToString("O")

  [pscustomobject]@{
    id = "installed-loop-spore"
    name = "Loop Clawd"
    body = "gremlin"
    color = "mossGreen"
    eye = "pixel"
    race = "builder"
    starterPresetId = "clawd"
    skills = @("article-xray", "repo-reader")
    rules = @(
      @{
        id = "concise"
        label = "Keep explanations short"
        enabled = $true
      },
      @{
        id = "cite-page"
        label = "Refer only to page content"
        enabled = $true
      }
    )
    browserLinkState = @{
      status = "unpaired"
    }
    iconVariant = @{
      surface = "launcher"
      body = "gremlin"
      color = "mossGreen"
      eye = "pixel"
    }
    createdAt = $now
    updatedAt = $now
  }
}

function Get-OptionalProperty($value, [string]$name) {
  if ($value.PSObject.Properties.Name -contains $name) {
    return $value.$name
  }

  return $null
}

function Convert-BotIdentityToSignature($bot) {
  [pscustomobject]@{
    id = $bot.id
    name = $bot.name
    body = $bot.body
    color = $bot.color
    eye = $bot.eye
    race = Get-OptionalProperty $bot "race"
    starterPresetId = Get-OptionalProperty $bot "starterPresetId"
    skills = @($bot.skills)
    iconVariant = $bot.iconVariant
  } | ConvertTo-Json -Depth 8 -Compress
}

function Stop-InstalledProcessTree {
  if (-not $process) {
    return
  }

  if ($process.HasExited) {
    return
  }

  try {
    taskkill.exe /PID $process.Id /T /F 2>$null | Out-Null
  } catch {}

  $script:process = $null
}

function Start-InstalledApp {
  $script:process = Start-Process -FilePath $installedExe -WindowStyle Hidden -PassThru
  return Wait-InstalledDaemonReady
}

function Ensure-KeyFile {
  New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
  $targetKey = Join-Path $stateDir ".env.local"

  if (Test-Path -LiteralPath $targetKey) {
    return
  }

  $sourceKey = Join-Path $repoRoot ".env.local"
  if (Test-Path -LiteralPath $sourceKey) {
    Copy-Item -LiteralPath $sourceKey -Destination $targetKey -Force
    return
  }

  if ($env:OPENAI_API_KEY) {
    @"
OPENAI_API_KEY=$env:OPENAI_API_KEY
OPENAI_MODEL=gpt-4.1-mini
"@ | Set-Content -NoNewline -Encoding utf8 -LiteralPath $targetKey
    return
  }

  throw "Missing OpenAI key for installed smoke. Use the native app once or set OPENAI_API_KEY."
}

Push-Location $repoRoot
try {
  if (-not $SkipBuild) {
    corepack pnpm windows:msi
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  $existingHealth = Test-DaemonHealth
  if ($existingHealth -and $existingHealth.localConfig.stateDirectory -ne $stateDir) {
    throw "Port 5317 is already served by a non-installed daemon at $($existingHealth.localConfig.stateDirectory). Stop it before installed smoke."
  }

  Ensure-KeyFile

  Invoke-Msi @("/i", "`"$msiPath`"", "/qn", "/norestart", "ALLUSERS=2", "MSIINSTALLPERUSER=1", "/L*v", "`"$logPath`"")

  if (-not (Test-Path -LiteralPath $installedExe)) {
    throw "Installed EXE missing at $installedExe"
  }

  $health = Start-InstalledApp

  if (-not $health.openaiConfigured) {
    throw "Installed daemon is running but OpenAI key is not configured."
  }

  $originalBotIdentity = Get-BotIdentity
  $identityBeforeReinstall = Save-BotIdentity (New-ReinstallProofBotIdentity)
  $identitySignatureBeforeReinstall = Convert-BotIdentityToSignature $identityBeforeReinstall

  node tools/contract-fixtures/run-native-loop-fixture.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Stop-InstalledProcessTree
  Invoke-Msi @("/x", "`"$msiPath`"", "/qn", "/norestart")
  Invoke-Msi @("/i", "`"$msiPath`"", "/qn", "/norestart", "ALLUSERS=2", "MSIINSTALLPERUSER=1", "/L*v", "`"$logPath`"")

  if (-not (Test-Path -LiteralPath $installedExe)) {
    throw "Reinstalled EXE missing at $installedExe"
  }

  $healthAfterReinstall = Start-InstalledApp
  $identityAfterReinstall = Get-BotIdentity
  $identitySignatureAfterReinstall = Convert-BotIdentityToSignature $identityAfterReinstall

  if ($identitySignatureAfterReinstall -ne $identitySignatureBeforeReinstall) {
    throw "Installed-loop reinstall changed the active spore identity."
  }

  [pscustomobject]@{
    installedExe = $installedExe
    stateDirectory = $stateDir
    packagedNode = Test-Path -LiteralPath (Join-Path $installDir "resources\node\node.exe")
    packagedDaemon = Test-Path -LiteralPath (Join-Path $installDir "resources\daemon\server.mjs")
    packagedExtension = Test-Path -LiteralPath (Join-Path $installDir "resources\extension\manifest.json")
    health = $health.status
    reinstallHealth = $healthAfterReinstall.status
    sporePersistence = "passed"
    spore = @{
      name = $identityAfterReinstall.name
      body = $identityAfterReinstall.body
      color = $identityAfterReinstall.color
      eye = $identityAfterReinstall.eye
    }
  } | ConvertTo-Json -Depth 4
} finally {
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:5317/browser-runtime/stop" -Method Post -TimeoutSec 2 | Out-Null
  } catch {}

  if ($originalBotIdentity) {
    try {
      Save-BotIdentity $originalBotIdentity | Out-Null
    } catch {}
  }

  Stop-InstalledProcessTree

  if (Test-Path -LiteralPath $msiPath) {
    try {
      Invoke-Msi @("/x", "`"$msiPath`"", "/qn", "/norestart")
    } catch {
      Write-Warning $_
    }
  }

  Pop-Location
}
