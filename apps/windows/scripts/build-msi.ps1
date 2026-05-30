param(
  [switch]$SkipPublish
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$artifactRoot = Join-Path $repoRoot ".clawdbot\artifacts\windows"
$publishDir = Join-Path $artifactRoot "publish\SUPERIOR"
$msiPath = Join-Path $artifactRoot "SUPERIOR-0.7.0-alpha-win-x64.msi"
$installerSource = Join-Path $repoRoot "apps\windows\installer\Product.wxs"
$iconPath = Join-Path $repoRoot "assets\bots\soul\icons\clawd-windows.ico"
$localDotnet = Join-Path $repoRoot ".clawdbot\toolchains\dotnet\dotnet.exe"

function Get-DotnetExe {
  if ($env:SUPERIOR_DOTNET_PATH) {
    if (Test-Path -LiteralPath $env:SUPERIOR_DOTNET_PATH -PathType Leaf) {
      return $env:SUPERIOR_DOTNET_PATH
    }

    $candidate = Join-Path $env:SUPERIOR_DOTNET_PATH "dotnet.exe"
    if (Test-Path -LiteralPath $candidate -PathType Leaf) {
      return $candidate
    }
  }

  if (Test-Path -LiteralPath $localDotnet -PathType Leaf) {
    return $localDotnet
  }

  $dotnetCommand = Get-Command dotnet -ErrorAction SilentlyContinue
  if ($dotnetCommand) {
    return $dotnetCommand.Source
  }

  throw "Missing .NET SDK. Run corepack pnpm windows:install-sdk."
}

$dotnetExe = Get-DotnetExe
$dotnetRoot = Split-Path -Parent $dotnetExe
$env:DOTNET_ROOT = $dotnetRoot
$env:PATH = "$dotnetRoot;$env:PATH"

if (-not $SkipPublish) {
  powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "publish-native.ps1")
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not (Test-Path -LiteralPath (Join-Path $publishDir "SUPERIOR.Windows.exe"))) {
  throw "Missing publish output at $publishDir."
}

& $dotnetExe tool restore
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (Test-Path -LiteralPath $msiPath) {
  Remove-Item -LiteralPath $msiPath -Force
}

& $dotnetExe tool run wix -- build $installerSource `
  -arch x64 `
  -d "PublishDir=$publishDir" `
  -d "ProductVersion=0.7.0.0" `
  -d "IconPath=$iconPath" `
  -o $msiPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

[pscustomobject]@{
  msi = $msiPath
  publishDir = $publishDir
} | ConvertTo-Json -Depth 3
