import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultUrl = "http://127.0.0.1:5173/";
const artifactRoot = path.join(rootDir, ".clawdbot", "video-proof");

const args = parseArgs(process.argv.slice(2));
const scenario = args.scenario ?? "workshop";
const targetUrl = args.url ?? defaultUrl;
const viewport = {
  width: Number(args.width ?? 1280),
  height: Number(args.height ?? 720)
};

if (scenario !== "workshop") {
  throw new Error(`Unknown video proof scenario: ${scenario}`);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(artifactRoot, `${stamp}-${scenario}`);
const rawVideoDir = path.join(runDir, "raw");
const mp4Path = path.join(runDir, `SUPERIOR-${scenario}-${stamp}.mp4`);
const posterPath = path.join(runDir, `SUPERIOR-${scenario}-${stamp}.png`);
const manifestPath = path.join(runDir, "manifest.json");
const latestManifestPath = path.join(artifactRoot, "latest.json");

await mkdir(rawVideoDir, { recursive: true });

let viteProcess;
let browser;
let context;
let videoPath;
const startedAt = new Date().toISOString();

try {
  if (!(await canReach(targetUrl))) {
    viteProcess = startVite();
    await waitForUrl(targetUrl, 45_000);
  }

  const { chromium } = await import("playwright");
  browser = await launchChromium(chromium);
  context = await browser.newContext({
    viewport,
    recordVideo: {
      dir: rawVideoDir,
      size: viewport
    }
  });

  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator('[aria-label="SUPERIOR workshop"], body').first().waitFor({ timeout: 15_000 });
  await page.screenshot({ path: posterPath, fullPage: false });

  await runWorkshopScenario(page);

  const pageVideo = page.video();
  await page.close();
  await context.close();
  videoPath = pageVideo ? await pageVideo.path() : undefined;
  await browser.close();
  browser = undefined;

  if (!videoPath || !existsSync(videoPath)) {
    throw new Error("Playwright did not produce a raw video.");
  }

  const ffmpegPath = await resolveFfmpegPath();
  convertToMp4(ffmpegPath, videoPath, mp4Path);

  const manifest = {
    kind: "superior-video-proof",
    scenario,
    url: targetUrl,
    viewport,
    startedAt,
    finishedAt: new Date().toISOString(),
    mp4Path,
    posterPath,
    rawVideoPath: videoPath,
    notes: [
      "Generated from the alpha Workshop harness.",
      "Use this MP4 as the critique artifact for gameplay, motion, and function feel."
    ]
  };

  await writeJson(manifestPath, manifest);
  await writeJson(latestManifestPath, manifest);
  console.log(JSON.stringify(manifest, null, 2));
} finally {
  if (context) {
    await context.close().catch(() => undefined);
  }
  if (browser) {
    await browser.close().catch(() => undefined);
  }
  if (viteProcess) {
    stopProcessTree(viteProcess);
  }
}

async function runWorkshopScenario(page) {
  await settle(page, 900);
  await sweepMouse(page);

  await clickMenu(page, "New Bot");
  await settle(page, 900);
  await clickFirstVisibleText(page, ["Orb", "Gremlin", "Scanner", "Moss Green", "Lavender"]);
  await settle(page, 700);

  await clickMenu(page, "Customize Bot");
  await settle(page, 700);
  await dragFirstPartToken(page);
  await settle(page, 900);

  await clickMenu(page, "Skills");
  await settle(page, 900);
  await clickFirstVisibleText(page, ["Article X-Ray", "Page Explainer", "Repo Reader", "Badge", "Eye"]);
  await settle(page, 900);

  await clickMenu(page, "Browser Link");
  await settle(page, 900);
  await sweepMouse(page);

  await clickMenu(page, "Continue");
  await settle(page, 1_100);
}

async function clickMenu(page, label) {
  const menuButton = page.getByRole("button", { name: label }).first();
  if ((await menuButton.count()) === 0) {
    return false;
  }
  await menuButton.click({ timeout: 2_000 }).catch(() => undefined);
  return true;
}

async function clickFirstVisibleText(page, labels) {
  for (const label of labels) {
    const candidate = page.getByText(label, { exact: true }).first();
    if ((await candidate.count()) > 0 && (await candidate.isVisible().catch(() => false))) {
      await candidate.click({ timeout: 2_000 }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

async function dragFirstPartToken(page) {
  const token = page.locator(".assembly-part, .part-token, .choice-chip").first();
  const bench = page.locator('[aria-label*="assembly bench"], [aria-label="SUPERIOR workshop"]').first();
  if ((await token.count()) === 0 || (await bench.count()) === 0) {
    return false;
  }

  const tokenBox = await token.boundingBox().catch(() => undefined);
  const benchBox = await bench.boundingBox().catch(() => undefined);
  if (!tokenBox || !benchBox) {
    return false;
  }

  await page.mouse.move(tokenBox.x + tokenBox.width / 2, tokenBox.y + tokenBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(benchBox.x + benchBox.width * 0.52, benchBox.y + benchBox.height * 0.48, { steps: 12 });
  await page.mouse.up();
  return true;
}

async function sweepMouse(page) {
  const viewportSize = page.viewportSize() ?? viewport;
  const points = [
    [viewportSize.width * 0.32, viewportSize.height * 0.42],
    [viewportSize.width * 0.58, viewportSize.height * 0.34],
    [viewportSize.width * 0.68, viewportSize.height * 0.52],
    [viewportSize.width * 0.46, viewportSize.height * 0.58]
  ];

  for (const [x, y] of points) {
    await page.mouse.move(x, y, { steps: 10 });
    await settle(page, 180);
  }
}

async function settle(page, ms) {
  await page.waitForTimeout(ms);
}

function startVite() {
  const child = spawn("corepack pnpm --filter @clawdbot/desktop dev:vite:raw", {
    cwd: rootDir,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  child.stdout?.on("data", (chunk) => process.stdout.write(`[vite] ${chunk}`));
  child.stderr?.on("data", (chunk) => process.stderr.write(`[vite] ${chunk}`));
  return child;
}

async function canReach(url) {
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await canReach(url)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

async function launchChromium(chromium) {
  const attempts = [
    () => chromium.launch({ headless: true }),
    () => chromium.launch({ channel: "chrome", headless: true }),
    () => chromium.launch({ channel: "msedge", headless: true })
  ];

  let lastError;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
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

  const lookup = process.platform === "win32" ? spawnSync("where", ["ffmpeg"], { encoding: "utf8" }) : spawnSync("which", ["ffmpeg"], { encoding: "utf8" });
  const found = lookup.stdout?.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (found && existsSync(found)) {
    return found;
  }

  throw new Error("ffmpeg is required for MP4 proof. Run `corepack pnpm install` or install ffmpeg on PATH.");
}

function convertToMp4(ffmpegPath, inputPath, outputPath) {
  const result = spawnSync(
    ffmpegPath,
    ["-y", "-i", inputPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", outputPath],
    { encoding: "utf8" }
  );

  if (result.status !== 0 || !existsSync(outputPath)) {
    throw new Error(`ffmpeg failed to produce MP4.\n${result.stderr || result.stdout}`);
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function stopProcessTree(child) {
  if (!child.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  child.kill("SIGTERM");
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [key, inlineValue] = arg.slice(2).split("=");
    const nextValue = rawArgs[index + 1];
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }

    if (nextValue && !nextValue.startsWith("--")) {
      parsed[key] = nextValue;
      index += 1;
      continue;
    }

    parsed[key] = true;
  }
  return parsed;
}
