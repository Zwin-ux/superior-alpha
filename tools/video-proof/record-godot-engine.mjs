import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const projectDir = path.join(rootDir, "superior", "godot-client");
const artifactRoot = path.join(rootDir, ".clawdbot", "video-proof");
const scenario = "godot-engine";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(artifactRoot, `${stamp}-${scenario}`);
const rawMoviePath = path.join(runDir, `SUPERIOR-${scenario}-${stamp}.avi`);
const mp4Path = path.join(runDir, `SUPERIOR-${scenario}-${stamp}.mp4`);
const posterPath = path.join(runDir, `SUPERIOR-${scenario}-${stamp}.png`);
const manifestPath = path.join(runDir, "manifest.json");
const latestManifestPath = path.join(artifactRoot, "latest-godot.json");
const startedAt = new Date().toISOString();
const godotWindowTitle = "SUPERIOR Alpha Engine (DEBUG)";

await mkdir(runDir, { recursive: true });

const godotPath = resolveGodotPath();
const ffmpegPath = await resolveFfmpegPath();
let godotProcess;

try {
  const result = spawnSync(godotPath, [
    "--rendering-driver",
    "opengl3",
    "--path",
    projectDir,
    "--fixed-fps",
    "30",
    "--write-movie",
    rawMoviePath,
    "--quit-after",
    "600"
  ], {
    cwd: projectDir,
    encoding: "utf8",
    windowsHide: false,
    env: {
      ...process.env,
      SUPERIOR_FORCE_WORKSHOP: "1",
      SUPERIOR_VIDEO_PROOF: "1"
    }
  });

  if (result.status !== 0 || !existsSync(rawMoviePath)) {
    throw new Error(`Godot movie writer failed.\n${result.stderr || result.stdout}`);
  }

  convertMovie(ffmpegPath, rawMoviePath, mp4Path);
  extractPoster(ffmpegPath, mp4Path, posterPath);

  const manifest = {
    kind: "superior-video-proof",
    scenario,
    engine: "Godot",
    godotPath,
    projectDir,
    startedAt,
    finishedAt: new Date().toISOString(),
    rawMoviePath,
    mp4Path,
    posterPath,
    captureMode: "godot-write-movie",
    frames: 600,
    fps: 30,
    notes: [
      "Generated from the Superior Alpha Godot engine slice.",
      "Shows the 0.14 SUPERIOR console boot, clay lamp reveal, concept-mapped workshop menu, Clawd Gremlin, CRT pass, mocked server events, and input-driven reactions."
    ]
  };

  await writeJson(manifestPath, manifest);
  await writeJson(latestManifestPath, manifest);
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  if (godotProcess?.pid) {
    stopProcessTree(godotProcess.pid);
  }
}

function resolveGodotPath() {
  const candidates = [
    process.env.GODOT_BIN,
    commandPath("godot"),
    commandPath("godot_console"),
    path.join(
      process.env.LOCALAPPDATA ?? "",
      "Microsoft",
      "WinGet",
      "Packages",
      "GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe",
      "Godot_v4.6.3-stable_win64.exe"
    )
  ].filter(Boolean);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Godot 4.x was not found. Set GODOT_BIN to the Godot executable path.");
  }
  return found;
}

function commandPath(command) {
  const lookup = process.platform === "win32" ? spawnSync("where", [command], { encoding: "utf8" }) : spawnSync("which", [command], { encoding: "utf8" });
  return lookup.stdout?.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
}

async function resolveFfmpegPath() {
  try {
    const ffmpegStatic = await import("ffmpeg-static");
    const candidate = ffmpegStatic.default;
    if (typeof candidate === "string" && existsSync(candidate)) {
      return candidate;
    }
  } catch {
    // Fall through to PATH lookup.
  }

  const found = commandPath("ffmpeg");
  if (found && existsSync(found)) {
    return found;
  }

  throw new Error("ffmpeg is required for Godot MP4 proof. Run `corepack pnpm install` or install ffmpeg on PATH.");
}

function getWindowBounds(pid) {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
public class NativeWindow {
  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
"@
$process = Get-Process -Id ${pid}
$rect = New-Object RECT
[NativeWindow]::GetWindowRect($process.MainWindowHandle, [ref]$rect) | Out-Null
[pscustomobject]@{
  left = $rect.Left
  top = $rect.Top
  width = ($rect.Right - $rect.Left)
  height = ($rect.Bottom - $rect.Top)
} | ConvertTo-Json -Compress
`;

  const result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Could not read Godot window bounds.\n${result.stderr || result.stdout}`);
  }

  const bounds = JSON.parse(result.stdout);
  bounds.left = Math.max(0, Number(bounds.left));
  bounds.top = Math.max(0, Number(bounds.top));
  bounds.width = Math.max(2, Number(bounds.width) - (Number(bounds.width) % 2));
  bounds.height = Math.max(2, Number(bounds.height) - (Number(bounds.height) % 2));

  if (!Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) || bounds.width < 320 || bounds.height < 240) {
    throw new Error(`Invalid Godot window bounds: ${JSON.stringify(bounds)}`);
  }

  return bounds;
}

function waitForWindowBounds(pid, timeoutMs) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      return getWindowBounds(pid);
    } catch (error) {
      lastError = error;
      spawnSync("powershell", ["-NoProfile", "-Command", "Start-Sleep -Milliseconds 250"], { stdio: "ignore" });
    }
  }
  throw lastError ?? new Error("Timed out waiting for Godot window bounds.");
}

function focusWindow(pid) {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class NativeFocus {
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")]
  public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")]
  public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
}
"@
$process = Get-Process -Id ${pid}
$handle = $process.MainWindowHandle
[NativeFocus]::ShowWindowAsync($handle, 9) | Out-Null
[NativeFocus]::SetWindowPos($handle, [IntPtr]::new(-1), 80, 80, 1280, 720, 0x0040) | Out-Null
[NativeFocus]::SetForegroundWindow($handle) | Out-Null
`;
  spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { stdio: "ignore" });
}

function startInputDriver(windowTitle) {
  const script = `
Add-Type -AssemblyName System.Windows.Forms
$shell = New-Object -ComObject WScript.Shell
Start-Sleep -Seconds 6
$shell.AppActivate("${windowTitle}") | Out-Null
[System.Windows.Forms.SendKeys]::SendWait("1")
Start-Sleep -Seconds 2
$shell.AppActivate("${windowTitle}") | Out-Null
[System.Windows.Forms.SendKeys]::SendWait("2")
Start-Sleep -Seconds 2
$shell.AppActivate("${windowTitle}") | Out-Null
[System.Windows.Forms.SendKeys]::SendWait("3")
`;

  return spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    stdio: "ignore",
    windowsHide: true
  });
}

async function waitForInputDriver(child) {
  if (!child) {
    return;
  }

  await new Promise((resolve) => {
    child.once("exit", resolve);
    child.once("error", resolve);
  });
}

function captureDesktopRegion(ffmpegPath, outputPath, bounds) {
  const result = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-f",
      "gdigrab",
      "-framerate",
      "30",
      "-offset_x",
      String(bounds.left),
      "-offset_y",
      String(bounds.top),
      "-video_size",
      `${bounds.width}x${bounds.height}`,
      "-i",
      "desktop",
      "-t",
      "20",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0 || !existsSync(outputPath)) {
    throw new Error(`ffmpeg failed to capture the Godot proof.\n${result.stderr || result.stdout}`);
  }
}

function convertMovie(ffmpegPath, inputPath, outputPath) {
  const result = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0 || !existsSync(outputPath)) {
    throw new Error(`ffmpeg failed to convert the Godot movie.\n${result.stderr || result.stdout}`);
  }
}

function captureWindowTitle(ffmpegPath, outputPath, windowTitle) {
  const result = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-f",
      "gdigrab",
      "-framerate",
      "30",
      "-i",
      `title=${windowTitle}`,
      "-t",
      "20",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0 || !existsSync(outputPath)) {
    throw new Error(`ffmpeg failed to capture the Godot window by title.\n${result.stderr || result.stdout}`);
  }
}

function extractPoster(ffmpegPath, inputPath, outputPath) {
  const result = spawnSync(ffmpegPath, ["-y", "-ss", "00:00:10", "-i", inputPath, "-frames:v", "1", outputPath], { encoding: "utf8" });
  if (result.status !== 0 || !existsSync(outputPath)) {
    throw new Error(`ffmpeg failed to extract poster frame.\n${result.stderr || result.stdout}`);
  }
}

function stopProcessTree(pid) {
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  process.kill(pid, "SIGTERM");
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
