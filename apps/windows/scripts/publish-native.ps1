Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$projectPath = Join-Path $projectRoot "SUPERIOR.Windows\SUPERIOR.Windows.csproj"
$artifactRoot = Join-Path $repoRoot ".clawdbot\artifacts\windows"
$publishDir = Join-Path $artifactRoot "publish\SUPERIOR"
$daemonBundle = Join-Path $artifactRoot "daemon\server.mjs"
$extensionDist = Join-Path $repoRoot "apps\extension\dist"
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

function Remove-InArtifactRoot([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    return
  }

  $artifactResolved = (Resolve-Path -LiteralPath $artifactRoot).Path
  $targetResolved = (Resolve-Path -LiteralPath $path).Path

  if (-not $targetResolved.StartsWith($artifactResolved, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to remove path outside artifact root: $targetResolved"
  }

  Remove-Item -LiteralPath $targetResolved -Recurse -Force
}

$dotnetExe = Get-DotnetExe
$dotnetRoot = Split-Path -Parent $dotnetExe
$env:DOTNET_ROOT = $dotnetRoot
$env:PATH = "$dotnetRoot;$env:PATH"

New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null
Remove-InArtifactRoot $publishDir
Remove-InArtifactRoot (Join-Path $artifactRoot "daemon")
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $daemonBundle) | Out-Null

Push-Location $repoRoot
try {
  corepack pnpm --filter "@clawdbot/extension" build
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  corepack pnpm exec esbuild apps/daemon/src/server.ts --bundle --platform=node --format=esm --outfile="$daemonBundle"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  & $dotnetExe publish $projectPath `
    -c Release `
    -r win-x64 `
    --self-contained true `
    -p:PublishSingleFile=false `
    -p:DebugType=embedded `
    -p:AssemblyVersion=0.7.0.0 `
    -p:FileVersion=0.7.0.0 `
    -p:InformationalVersion=0.7.0-alpha `
    -o $publishDir
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

$nodeCommand = Get-Command node -ErrorAction Stop
$resourcesDir = Join-Path $publishDir "resources"
$nodeDir = Join-Path $resourcesDir "node"
$daemonDir = Join-Path $resourcesDir "daemon"
$extensionDir = Join-Path $resourcesDir "extension"

New-Item -ItemType Directory -Force -Path $nodeDir, $daemonDir, $extensionDir | Out-Null
Copy-Item -LiteralPath $nodeCommand.Source -Destination (Join-Path $nodeDir "node.exe") -Force
Copy-Item -LiteralPath $daemonBundle -Destination (Join-Path $daemonDir "server.mjs") -Force
Copy-Item -Path (Join-Path $extensionDist "*") -Destination $extensionDir -Recurse -Force

[pscustomobject]@{
  publishDir = $publishDir
  exe = Join-Path $publishDir "SUPERIOR.Windows.exe"
  daemon = Join-Path $daemonDir "server.mjs"
  node = Join-Path $nodeDir "node.exe"
  extension = Join-Path $extensionDir "manifest.json"
} | ConvertTo-Json -Depth 3
