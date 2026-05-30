param(
  [string]$Version = "0.8.0"
)

$ErrorActionPreference = "Stop"

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$PackageRoot = Resolve-Path (Join-Path $ScriptRoot "..")
$RepoRoot = Resolve-Path (Join-Path $PackageRoot "..\..")
$Dist = Join-Path $PackageRoot "dist"
$ManifestPath = Join-Path $Dist "manifest.json"
$ArtifactDir = Join-Path $RepoRoot ".clawdbot\artifacts\extension"
$ZipPath = Join-Path $ArtifactDir "SUPERIOR-$Version-chrome-mv3.zip"

function Assert-SetEquals {
  param(
    [string]$Name,
    [string[]]$Actual,
    [string[]]$Expected
  )

  $ActualSorted = @($Actual | Sort-Object)
  $ExpectedSorted = @($Expected | Sort-Object)
  $Diff = Compare-Object -ReferenceObject $ExpectedSorted -DifferenceObject $ActualSorted

  if ($Diff) {
    throw "$Name does not match expected store-gate shape. Actual: $($ActualSorted -join ', ')"
  }
}

Push-Location $RepoRoot
try {
  corepack pnpm --filter @clawdbot/extension build
  if ($LASTEXITCODE -ne 0) {
    throw "Extension build failed."
  }
} finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $ManifestPath)) {
  throw "Extension dist manifest is missing at $ManifestPath"
}

$Manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json

if ($Manifest.manifest_version -ne 3) {
  throw "Manifest must be MV3."
}

if ($Manifest.name -ne "SUPERIOR") {
  throw "Manifest name must stay SUPERIOR for the store packet."
}

if ($Manifest.version -ne $Version) {
  throw "Manifest version $($Manifest.version) does not match package version $Version."
}

Assert-SetEquals -Name "permissions" -Actual @($Manifest.permissions) -Expected @(
  "activeTab",
  "contextMenus",
  "scripting",
  "storage",
  "tabs"
)

Assert-SetEquals -Name "host_permissions" -Actual @($Manifest.host_permissions) -Expected @(
  "http://127.0.0.1:5317/*",
  "http://localhost:5317/*"
)

$RequiredFiles = @(
  "manifest.json",
  "popup.html",
  "assets/background.js",
  "assets/superiorBrowserAttach.js",
  "icons/clawdbot-16.png",
  "icons/clawdbot-32.png",
  "icons/clawdbot-48.png",
  "icons/clawdbot-128.png",
  "icons/clawdbot-256.png"
)

foreach ($File in $RequiredFiles) {
  $Path = Join-Path $Dist $File

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required extension package file is missing: $File"
  }
}

New-Item -ItemType Directory -Force -Path $ArtifactDir | Out-Null

if (Test-Path -LiteralPath $ZipPath) {
  Remove-Item -LiteralPath $ZipPath -Force
}

Compress-Archive -Path (Join-Path $Dist "*") -DestinationPath $ZipPath -CompressionLevel Optimal -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
$Zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
try {
  $Entries = @($Zip.Entries | ForEach-Object { $_.FullName.Replace("\", "/") })

  foreach ($File in $RequiredFiles) {
    if ($Entries -notcontains $File) {
      throw "Packaged zip is missing required entry: $File"
    }
  }

  [pscustomobject]@{
    status = "ready"
    artifact = $ZipPath
    version = $Manifest.version
    entries = $Entries.Count
  } | ConvertTo-Json
} finally {
  $Zip.Dispose()
}
