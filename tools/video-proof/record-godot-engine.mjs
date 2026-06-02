import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const projectDir = path.join(rootDir, "superior", "godot-client");
const artifactRoot = path.join(rootDir, ".clawdbot", "video-proof");
const options = parseArgs(process.argv.slice(2));
const scenario = options.scenario;
const fps = 30;
const frameCount = options.frames;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(artifactRoot, `${stamp}-${scenario}`);
const rawMoviePath = path.join(runDir, `SUPERIOR-${scenario}-${stamp}.avi`);
const mp4Path = path.join(runDir, `SUPERIOR-${scenario}-${stamp}.mp4`);
const posterPath = path.join(runDir, `SUPERIOR-${scenario}-${stamp}.png`);
const reviewFramesDir = path.join(runDir, "review-frames");
const contactSheetPath = path.join(reviewFramesDir, "contact-sheet-1s.png");
const manifestPath = path.join(runDir, "manifest.json");
const latestManifestPath = path.join(artifactRoot, options.showcase ? "latest-showcase.json" : "latest-godot.json");
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
    String(fps),
    "--write-movie",
    rawMoviePath,
    "--quit-after",
    String(frameCount)
  ], {
    cwd: projectDir,
    encoding: "utf8",
    windowsHide: false,
    env: {
      ...process.env,
      SUPERIOR_FORCE_ONBOARDING: "1",
      SUPERIOR_VIDEO_PROOF: "1",
      SUPERIOR_SHOWCASE: options.showcase ? "1" : process.env.SUPERIOR_SHOWCASE ?? ""
    }
  });

  if (result.status !== 0 || !existsSync(rawMoviePath)) {
    throw new Error(`Godot movie writer failed.\n${result.stderr || result.stdout}`);
  }

  convertMovie(ffmpegPath, rawMoviePath, mp4Path);
  extractPoster(ffmpegPath, mp4Path, posterPath, options.posterSecond);
  await mkdir(reviewFramesDir, { recursive: true });
  extractReviewFrames(ffmpegPath, mp4Path, reviewFramesDir, options.reviewFrameSeconds);
  createContactSheet(ffmpegPath, mp4Path, contactSheetPath, Math.ceil(frameCount / fps));

  const manifest = {
    kind: "superior-video-proof",
    scenario,
    showcase: options.showcase,
    engine: "Godot",
    godotPath,
    projectDir,
    startedAt,
    finishedAt: new Date().toISOString(),
    rawMoviePath,
    mp4Path,
    posterPath,
    reviewFramesDir,
    contactSheetPath,
    captureMode: "godot-write-movie",
    frames: frameCount,
    fps,
    durationSeconds: frameCount / fps,
    notes: options.notes
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

function parseArgs(args) {
  let requestedScenario = "engine";
  let requestedFrames;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--scenario") {
      requestedScenario = args[index + 1] ?? requestedScenario;
      index += 1;
    } else if (arg === "--showcase") {
      requestedScenario = "showcase";
    } else if (arg === "--frames") {
      requestedFrames = Number(args[index + 1]);
      index += 1;
    }
  }

  const showcase = requestedScenario === "showcase" || requestedScenario === "godot-showcase";
  const scenario = showcase ? "godot-showcase" : "godot-engine";
  const frames = Number.isFinite(requestedFrames) && requestedFrames > 0 ? Math.floor(requestedFrames) : (showcase ? 660 : 720);

  return {
    scenario,
    showcase,
    frames,
    posterSecond: showcase ? 10.8 : 12.1,
    reviewFrameSeconds: showcase ? [1.0, 2.6, 4.2, 5.8, 7.4, 9.2, 10.8, 12.6, 15.0, 17.2, 20.6] : [1.0, 3.2, 5.2, 7.2, 9.2, 10.8, 12.1, 14.6, 17.4, 20.0, 22.8],
    notes: showcase
      ? [
          "Production showcase from the Superior Godot runtime.",
          "22-second beat map: console boot, Wake Spore, body pick, eye fit, role stamp, Browser bind, ICON MATCH, Article X-Ray SKILL RAN, spore reaction, registry stamp, Spore Garden, Workshop reactions.",
          "Uses SUPERIOR_SHOWCASE=1 to hide debug controls and keep labels product-facing."
        ]
      : [
          "Generated from the Superior Alpha Godot engine slice.",
          "Shows the SUPERIOR first-boot ritual: Wake Spore, choose body, fit eye, choose role, bind browser hand, ICON MATCH, Article X-Ray SKILL RAN, spore reaction, stamp registry, Spore Garden home, workshop drop, mocked server events, and bot reactions."
        ]
  };
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

function extractPoster(ffmpegPath, inputPath, outputPath, posterSecond) {
  const result = spawnSync(ffmpegPath, ["-y", "-ss", formatTimestamp(posterSecond), "-i", inputPath, "-frames:v", "1", outputPath], { encoding: "utf8" });
  if (result.status !== 0 || !existsSync(outputPath)) {
    throw new Error(`ffmpeg failed to extract poster frame.\n${result.stderr || result.stdout}`);
  }
}

function extractReviewFrames(ffmpegPath, inputPath, outputDir, seconds) {
  for (const second of seconds) {
    const outputPath = path.join(outputDir, `frame-${String(second).replace(".", "-")}s.png`);
    const result = spawnSync(ffmpegPath, ["-y", "-ss", formatTimestamp(second), "-i", inputPath, "-frames:v", "1", outputPath], { encoding: "utf8" });
    if (result.status !== 0 || !existsSync(outputPath)) {
      throw new Error(`ffmpeg failed to extract review frame at ${second}s.\n${result.stderr || result.stdout}`);
    }
  }
}

function createContactSheet(ffmpegPath, inputPath, outputPath, durationSeconds) {
  const columns = 5;
  const rows = Math.ceil(durationSeconds / columns);
  const result = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-i",
      inputPath,
      "-vf",
      `fps=1,scale=320:-1,tile=${columns}x${rows}`,
      "-frames:v",
      "1",
      outputPath
    ],
    { encoding: "utf8" }
  );
  if (result.status !== 0 || !existsSync(outputPath)) {
    throw new Error(`ffmpeg failed to create review contact sheet.\n${result.stderr || result.stdout}`);
  }
}

function formatTimestamp(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const milliseconds = Math.round((seconds - whole) * 1000);
  const hh = String(Math.floor(whole / 3600)).padStart(2, "0");
  const mm = String(Math.floor((whole % 3600) / 60)).padStart(2, "0");
  const ss = String(whole % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}.${String(milliseconds).padStart(3, "0")}`;
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
