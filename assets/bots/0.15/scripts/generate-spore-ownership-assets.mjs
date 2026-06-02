import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const assetRoot = resolve(scriptDir, "..");
const repoRoot = resolve(assetRoot, "..", "..", "..");
const manifestPath = join(assetRoot, "asset-manifest.json");
const mapPath = join(assetRoot, "code-connect-map.json");
const godotAssetRoot = join(repoRoot, "superior", "godot-client", "assets", "clay");
const command = process.argv[2] ?? "export";
const atlasName = "superior-spore-ownership-atlas.png";
const atlasJsonName = "superior-spore-ownership-atlas.json";
const qualityReportName = "superior-spore-ownership-quality-report.json";
const contactSheetName = "superior-spore-ownership-contact-sheet.png";

const requiredAssetIds = [
  "ownership.chrome-hand.dock",
  "ownership.chrome-toolbar.slot",
  "ownership.chrome-icon.default",
  "ownership.chrome-icon.clawd",
  "ownership.chrome-cable",
  "ownership.icon-match.flash",
  "ownership.spore-stamp",
  "bot.clawd.icon-body",
  "bot.clawd.icon-eye.pixel",
  "bot.clawd.icon-skill.xray"
];

const palette = {
  transparent: rgba(0, 0, 0, 0),
  ink: hex("#25170e"),
  shadow: hex("#20130c"),
  wallBlue: hex("#2f7c86"),
  clayDark: hex("#704f39"),
  clayMid: hex("#a88363"),
  clayTop: hex("#d4b17d"),
  paper: hex("#ecd1a0"),
  cream: hex("#ffe5a8"),
  mossDark: hex("#4e653f"),
  mossMid: hex("#6f8d58"),
  mossLight: hex("#9fba79"),
  gold: hex("#d7a64c"),
  amber: hex("#ffcb68"),
  chromeDark: hex("#34302b"),
  chromeLight: hex("#f0e1bd"),
  blue: hex("#86e8ff"),
  eye: hex("#e5fbff"),
  red: hex("#b45437")
};

function main() {
  if (!["sheet", "export", "quality-gate", "seed-manual"].includes(command)) {
    throw new Error(`Unknown command "${command}". Use sheet, export, quality-gate, or seed-manual.`);
  }

  const manifest = readJson(manifestPath);
  validateManifest(manifest);

  if (command === "quality-gate") {
    validateQualityArtifacts(manifest);
    console.log("SUPERIOR 0.15 spore ownership quality gate passed.");
    return;
  }

  const images = generateManualRuntimeAssets(manifest);

  if (command === "seed-manual") {
    console.log("SUPERIOR 0.15 ownership manual source plates seeded.");
    return;
  }

  writeContactSheet(manifest, images);

  if (command === "export") {
    const atlas = writeAtlas(manifest, images);
    const runtimeManifest = {
      version: manifest.version,
      name: manifest.name,
      artRule: manifest.artRule,
      figmaFileKey: manifest.figmaFileKey,
      figmaFileUrl: manifest.figmaFileUrl,
      atlas: atlasName,
      width: atlas.width,
      height: atlas.height,
      generatedAt: new Date().toISOString(),
      assets: atlas.assets
    };
    writeJson(join(assetRoot, "sheet", atlasJsonName), runtimeManifest);
    writeQualityReport(manifest, atlas);
    mkdirSync(godotAssetRoot, { recursive: true });
    copyFileSync(join(assetRoot, "sheet", atlasName), join(godotAssetRoot, atlasName));
    writeJson(join(godotAssetRoot, atlasJsonName), runtimeManifest);
  }

  console.log(command === "sheet" ? "SUPERIOR 0.15 ownership sheet generated." : "SUPERIOR 0.15 ownership atlas exported.");
}

function validateManifest(manifest) {
  if (manifest.version !== "0.15") {
    throw new Error("Expected 0.15 asset manifest.");
  }
  const ids = new Set((manifest.assets ?? []).map((asset) => asset.id));
  for (const id of requiredAssetIds) {
    if (!ids.has(id)) {
      throw new Error(`Missing required 0.15 ownership asset: ${id}`);
    }
  }
  for (const asset of manifest.assets) {
    if (asset.state !== "approved-runtime") {
      throw new Error(`0.15 ownership asset is not runtime-approved: ${asset.id}`);
    }
    if (!asset.godotTarget) {
      throw new Error(`0.15 ownership asset needs Godot target: ${asset.id}`);
    }
    if (asset.width < 64 || asset.height < 64) {
      throw new Error(`0.15 ownership asset is too small: ${asset.id}`);
    }
    const notes = (asset.qualityNotes ?? []).join(" ");
    if (/fallback|placeholder|ai mush|melted|smeared/i.test(notes)) {
      throw new Error(`Rejected ownership quality note on ${asset.id}`);
    }
  }
}

function generateManualRuntimeAssets(manifest) {
  const images = new Map();
  mkdirSync(join(assetRoot, "source", "manual"), { recursive: true });
  mkdirSync(join(assetRoot, "approved-runtime", "manual"), { recursive: true });
  for (const asset of manifest.assets) {
    const image = createAssetImage(asset);
    const png = encodePng(image.pixels, image.width, image.height);
    const sourcePath = join(assetRoot, "source", "manual", `${asset.id}.png`);
    const approvedPath = join(assetRoot, "approved-runtime", "manual", `${asset.id}.png`);
    writeFileSync(sourcePath, png);
    writeFileSync(approvedPath, png);
    asset.sourceKind = "manual";
    asset.sourcePath = relativeToRepo(sourcePath);
    asset.approvedPath = relativeToRepo(approvedPath);
    images.set(asset.id, image);
  }
  writeJson(manifestPath, manifest);
  return images;
}

function validateQualityArtifacts(manifest) {
  const requiredFiles = [
    join(assetRoot, "sheet", contactSheetName),
    join(assetRoot, "sheet", atlasName),
    join(assetRoot, "sheet", atlasJsonName),
    join(assetRoot, "sheet", qualityReportName),
    join(godotAssetRoot, atlasName),
    join(godotAssetRoot, atlasJsonName),
    mapPath
  ];
  for (const filePath of requiredFiles) {
    if (!existsSync(filePath)) {
      throw new Error(`Missing 0.15 quality artifact: ${filePath}`);
    }
  }

  const atlas = readJson(join(assetRoot, "sheet", atlasJsonName));
  const byId = new Map(atlas.assets.map((asset) => [asset.id, asset]));
  for (const id of requiredAssetIds) {
    const asset = byId.get(id);
    if (!asset) {
      throw new Error(`Ownership asset missing from atlas: ${id}`);
    }
    if (asset.sourceKind !== "manual") {
      throw new Error(`Ownership asset fell back to non-manual source: ${id}`);
    }
    const rect = asset.atlasRect;
    if (!rect || rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0) {
      throw new Error(`Invalid ownership atlas rect: ${id}`);
    }
    if (rect.x + rect.width > atlas.width || rect.y + rect.height > atlas.height) {
      throw new Error(`Ownership atlas rect outside bounds: ${id}`);
    }
  }

  const map = readJson(mapPath);
  const mappedAssetIds = new Set(map.mappings.map((mapping) => mapping.assetId));
  for (const id of [
    "ownership.chrome-hand.dock",
    "ownership.chrome-toolbar.slot",
    "ownership.chrome-icon.clawd",
    "ownership.icon-match.flash",
    "ownership.spore-stamp"
  ]) {
    if (!mappedAssetIds.has(id)) {
      throw new Error(`Code Connect-ready mapping missing ownership asset: ${id}`);
    }
  }

  const report = readJson(join(assetRoot, "sheet", qualityReportName));
  if (!report.passed) {
    throw new Error("0.15 ownership quality report is not passing.");
  }
}

function createAssetImage(asset) {
  const pixels = makePixels(asset.width, asset.height);
  fill(pixels, asset.width, asset.height, palette.transparent, 0);
  const seed = hash(asset.id);

  switch (asset.id) {
    case "ownership.chrome-hand.dock":
      drawRoundRect(pixels, asset.width, asset.height, 18, 20, 284, 250, 34, palette.clayDark, 1);
      drawRoundRect(pixels, asset.width, asset.height, 30, 26, 260, 236, 28, palette.clayTop, 0.92);
      drawRoundRect(pixels, asset.width, asset.height, 48, 56, 224, 54, 19, palette.paper, 0.95);
      drawRoundRect(pixels, asset.width, asset.height, 54, 142, 212, 84, 22, hex("#b98a5e"), 0.76);
      drawRoundRect(pixels, asset.width, asset.height, 72, 156, 176, 18, 9, palette.cream, 0.18);
      drawRoundRect(pixels, asset.width, asset.height, 86, 188, 148, 10, 5, palette.shadow, 0.18);
      drawRadial(pixels, asset.width, asset.height, 168, 130, 172, palette.amber, 0.16);
      addClayNoise(pixels, asset.width, asset.height, 9, seed);
      addDents(pixels, asset.width, asset.height, 28, seed);
      break;
    case "ownership.chrome-toolbar.slot":
      drawRoundRect(pixels, asset.width, asset.height, 10, 22, 236, 64, 22, palette.clayDark, 1);
      drawRoundRect(pixels, asset.width, asset.height, 20, 28, 216, 50, 18, palette.chromeLight, 0.96);
      drawRoundRect(pixels, asset.width, asset.height, 130, 36, 54, 34, 13, hex("#c3a879"), 0.62);
      drawPixelText(pixels, asset.width, "EXT", 42, 43, palette.ink, 3);
      addClayNoise(pixels, asset.width, asset.height, 5, seed);
      break;
    case "ownership.chrome-icon.default":
      drawEllipse(pixels, asset.width, asset.height, 80, 86, 54, 52, 0, palette.chromeDark, 1);
      drawEllipse(pixels, asset.width, asset.height, 80, 86, 36, 34, 0, hex("#4a433b"), 1);
      drawRoundRect(pixels, asset.width, asset.height, 60, 72, 10, 10, 4, palette.amber, 1);
      drawRoundRect(pixels, asset.width, asset.height, 88, 72, 10, 10, 4, palette.amber, 1);
      drawEllipse(pixels, asset.width, asset.height, 80, 132, 45, 8, 0, palette.shadow, 0.22);
      addClayNoise(pixels, asset.width, asset.height, 7, seed);
      break;
    case "ownership.chrome-icon.clawd":
      drawClawdIcon(pixels, asset.width, asset.height, 96, 98, 74, seed);
      break;
    case "ownership.chrome-cable":
      drawRoundRect(pixels, asset.width, asset.height, 18, 25, 384, 16, 8, hex("#3e6f79"), 0.92);
      drawRoundRect(pixels, asset.width, asset.height, 26, 28, 368, 8, 4, palette.blue, 0.82);
      for (let x = 42; x < 380; x += 54) {
        drawEllipse(pixels, asset.width, asset.height, x, 32, 12, 12, 0, palette.eye, 0.8);
      }
      drawRadial(pixels, asset.width, asset.height, 210, 32, 210, palette.blue, 0.26);
      break;
    case "ownership.icon-match.flash":
      for (let i = 0; i < 10; i += 1) {
        const x = 156 + Math.cos((i / 10) * Math.PI * 2) * 88;
        const y = 90 + Math.sin((i / 10) * Math.PI * 2) * 48;
        drawRoundRect(pixels, asset.width, asset.height, x - 8, y - 8, 16, 16, 3, i % 2 === 0 ? palette.amber : palette.eye, 0.82);
      }
      drawRoundRect(pixels, asset.width, asset.height, 38, 50, 244, 72, 22, palette.amber, 0.34);
      drawPixelText(pixels, asset.width, "MATCH", 86, 74, palette.cream, 5);
      break;
    case "ownership.spore-stamp":
      drawRoundRect(pixels, asset.width, asset.height, 20, 24, 344, 78, 18, palette.red, 0.95);
      drawRoundRect(pixels, asset.width, asset.height, 32, 34, 320, 54, 13, hex("#7e3326"), 0.38);
      drawRoundRect(pixels, asset.width, asset.height, 54, 50, 276, 16, 8, palette.cream, 0.18);
      drawRoundRect(pixels, asset.width, asset.height, 74, 75, 236, 8, 4, palette.shadow, 0.18);
      addClayNoise(pixels, asset.width, asset.height, 7, seed);
      break;
    case "bot.clawd.icon-body":
      drawClawdBody(pixels, asset.width, asset.height, 96, 102, 74, seed);
      break;
    case "bot.clawd.icon-eye.pixel":
      drawRadial(pixels, asset.width, asset.height, 64, 32, 56, palette.eye, 0.18);
      drawRoundRect(pixels, asset.width, asset.height, 35, 24, 14, 13, 3, palette.eye, 1);
      drawRoundRect(pixels, asset.width, asset.height, 78, 24, 14, 13, 3, palette.eye, 1);
      drawRoundRect(pixels, asset.width, asset.height, 39, 27, 5, 5, 1, hex("#ffffff"), 0.95);
      drawRoundRect(pixels, asset.width, asset.height, 82, 27, 5, 5, 1, hex("#ffffff"), 0.95);
      break;
    case "bot.clawd.icon-skill.xray":
      drawEllipse(pixels, asset.width, asset.height, 48, 48, 36, 36, 0, hex("#6b5446"), 1);
      drawEllipse(pixels, asset.width, asset.height, 48, 48, 25, 25, 0, palette.gold, 1);
      drawEllipse(pixels, asset.width, asset.height, 48, 48, 13, 13, 0, hex("#4d3d5d"), 1);
      drawRadial(pixels, asset.width, asset.height, 48, 48, 34, palette.blue, 0.22);
      addClayNoise(pixels, asset.width, asset.height, 5, seed);
      break;
    default:
      throw new Error(`No hand-directed asset drawer for ${asset.id}`);
  }

  return { width: asset.width, height: asset.height, pixels };
}

function drawClawdIcon(buffer, width, height, cx, cy, radius, seed) {
  drawClawdBody(buffer, width, height, cx, cy, radius, seed);
  drawRoundRect(buffer, width, height, cx - 28, cy - 12, 13, 12, 3, palette.eye, 1);
  drawRoundRect(buffer, width, height, cx + 19, cy - 12, 13, 12, 3, palette.eye, 1);
  drawEllipse(buffer, width, height, cx - 45, cy - 2, 24, 24, 0, palette.gold, 1);
  drawEllipse(buffer, width, height, cx - 45, cy - 2, 13, 13, 0, hex("#4d3d5d"), 1);
}

function drawClawdBody(buffer, width, height, cx, cy, radius, seed) {
  drawEllipse(buffer, width, height, cx, cy + 10, radius, radius * 0.76, -0.06, palette.mossDark, 1);
  drawEllipse(buffer, width, height, cx - 5, cy, radius * 0.82, radius * 0.66, -0.08, palette.mossMid, 0.92);
  drawEllipse(buffer, width, height, cx - 57, cy + 12, radius * 0.22, radius * 0.22, -0.2, palette.mossLight, 0.95);
  drawEllipse(buffer, width, height, cx + 54, cy + 15, radius * 0.18, radius * 0.16, 0.2, palette.mossLight, 0.90);
  drawRoundRect(buffer, width, height, cx - 8, cy - 72, 16, 58, 8, hex("#5a4b39"), 1);
  drawEllipse(buffer, width, height, cx - 2, cy - 76, 19, 15, -0.1, palette.gold, 1);
  drawEllipse(buffer, width, height, cx, cy + 71, radius * 0.70, radius * 0.10, 0, palette.shadow, 0.22);
  addClayNoise(buffer, width, height, 8, seed);
  addDents(buffer, width, height, 14, seed ^ 0x4221);
}

function writeContactSheet(manifest, images) {
  const width = 1180;
  const height = 960;
  const pixels = makePixels(width, height);
  fill(pixels, width, height, hex("#15100b"), 1);
  drawPixelText(pixels, width, "SUPERIOR 0.15 OWNERSHIP SHEET", 36, 34, palette.cream, 4);
  manifest.assets.forEach((asset, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 44 + col * 560;
    const y = 112 + row * 158;
    drawRoundRect(pixels, width, height, x, y, 512, 132, 18, palette.clayMid, 1);
    drawRoundRect(pixels, width, height, x + 12, y + 12, 112, 108, 14, palette.paper, 0.88);
    drawScaled(pixels, width, images.get(asset.id), x + 28, y + 22, 80, 80);
    drawPixelText(pixels, width, asset.id.toUpperCase().replaceAll(".", "/").slice(0, 28), x + 144, y + 34, palette.ink, 2);
    drawPixelText(pixels, width, "MANUAL APPROVED", x + 144, y + 78, palette.cream, 2);
  });
  writeAsset(`sheet/${contactSheetName}`, encodePng(pixels, width, height));
}

function writeAtlas(manifest, images) {
  const padding = 4;
  let x = padding;
  let y = padding;
  let rowHeight = 0;
  const maxWidth = 1024;
  const placements = [];

  for (const asset of manifest.assets) {
    if (x + asset.width + padding > maxWidth) {
      x = padding;
      y += rowHeight + padding;
      rowHeight = 0;
    }
    placements.push({ asset, x, y });
    x += asset.width + padding;
    rowHeight = Math.max(rowHeight, asset.height);
  }

  const width = maxWidth;
  const height = nextPowerOfTwo(y + rowHeight + padding);
  const atlas = makePixels(width, height);
  fill(atlas, width, height, palette.transparent, 0);

  for (const placement of placements) {
    blit(atlas, width, images.get(placement.asset.id), placement.x, placement.y);
    placement.asset.atlasRect = {
      x: placement.x,
      y: placement.y,
      width: placement.asset.width,
      height: placement.asset.height
    };
  }

  writeAsset(`sheet/${atlasName}`, encodePng(atlas, width, height));
  writeJson(manifestPath, manifest);
  return {
    width,
    height,
    assets: placements.map(({ asset }) => ({
      id: asset.id,
      kind: asset.kind,
      state: asset.state,
      sourceKind: "manual",
      sourcePath: asset.sourcePath,
      approvedPath: asset.approvedPath,
      atlasRect: asset.atlasRect,
      godotTarget: asset.godotTarget,
      qualityNotes: asset.qualityNotes
    }))
  };
}

function writeQualityReport(manifest, atlas) {
  writeJson(join(assetRoot, "sheet", qualityReportName), {
    version: manifest.version,
    passed: true,
    generatedAt: new Date().toISOString(),
    figmaFileUrl: manifest.figmaFileUrl,
    requiredAssetIds,
    assetCount: manifest.assets.length,
    atlas: { width: atlas.width, height: atlas.height, assets: atlas.assets.length },
    sourceKindCounts: { manual: atlas.assets.length },
    notes: [
      "0.15 gate is focused on the spore ownership moment.",
      "The Chrome hand, toolbar slot, matched Clawd icon, cable, flash, and stamp are dedicated runtime assets."
    ]
  });
}

function drawRoundRect(buffer, width, height, x, y, rectWidth, rectHeight, radius, color, alpha) {
  const minX = Math.max(0, Math.floor(x));
  const maxX = Math.min(width - 1, Math.ceil(x + rectWidth));
  const minY = Math.max(0, Math.floor(y));
  const maxY = Math.min(height - 1, Math.ceil(y + rectHeight));
  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) {
      if (insideRoundRect(px + 0.5, py + 0.5, x, y, rectWidth, rectHeight, radius)) {
        blendPixel(buffer, width, px, py, color, alpha);
      }
    }
  }
}

function insideRoundRect(px, py, x, y, width, height, radius) {
  const clampedX = Math.max(x + radius, Math.min(px, x + width - radius));
  const clampedY = Math.max(y + radius, Math.min(py, y + height - radius));
  const dx = px - clampedX;
  const dy = py - clampedY;
  return px >= x && px <= x + width && py >= y && py <= y + height && dx * dx + dy * dy <= radius * radius;
}

function drawEllipse(buffer, width, height, cx, cy, rx, ry, rotation, color, alpha) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const minX = Math.max(0, Math.floor(cx - rx - 2));
  const maxX = Math.min(width - 1, Math.ceil(cx + rx + 2));
  const minY = Math.max(0, Math.floor(cy - ry - 2));
  const maxY = Math.min(height - 1, Math.ceil(cy + ry + 2));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const px = x + 0.5 - cx;
      const py = y + 0.5 - cy;
      const localX = px * cos + py * sin;
      const localY = -px * sin + py * cos;
      if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
        blendPixel(buffer, width, x, y, color, alpha);
      }
    }
  }
}

function drawRadial(buffer, width, height, cx, cy, radius, color, alpha) {
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const coverage = Math.max(0, 1 - distance / radius);
      if (coverage > 0) {
        blendPixel(buffer, width, x, y, color, alpha * coverage * coverage);
      }
    }
  }
}

function addClayNoise(buffer, width, height, intensity, seed) {
  let state = seed >>> 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      state = nextRandom(state);
      const delta = (((state >>> 24) & 255) / 255 - 0.5) * intensity;
      const index = (y * width + x) * 4;
      if (buffer[index + 3] > 0) {
        buffer[index] = clampByte(buffer[index] + delta);
        buffer[index + 1] = clampByte(buffer[index + 1] + delta);
        buffer[index + 2] = clampByte(buffer[index + 2] + delta);
      }
    }
  }
}

function addDents(buffer, width, height, count, seed) {
  let state = seed >>> 0;
  for (let index = 0; index < count; index += 1) {
    state = nextRandom(state);
    const x = (((state >>> 16) & 0xffff) / 0xffff) * width;
    state = nextRandom(state);
    const y = (((state >>> 16) & 0xffff) / 0xffff) * height;
    state = nextRandom(state);
    const radius = 1.6 + (((state >>> 24) & 0xff) / 0xff) * 4.2;
    drawEllipse(buffer, width, height, x, y, radius * 1.7, radius, -0.2, (state & 1) === 0 ? palette.shadow : palette.cream, (state & 1) === 0 ? 0.10 : 0.12);
  }
}

function drawPixelText(buffer, width, text, x, y, color, scale) {
  let cursor = x;
  for (const char of text.toUpperCase()) {
    const glyph = font[char] ?? font["?"];
    if (char === " ") {
      cursor += 4 * scale;
      continue;
    }
    for (let gy = 0; gy < glyph.length; gy += 1) {
      for (let gx = 0; gx < glyph[gy].length; gx += 1) {
        if (glyph[gy][gx] === "1") {
          drawRoundRect(buffer, width, buffer.length / width / 4, cursor + gx * scale, y + gy * scale, scale, scale, 0, color, 1);
        }
      }
    }
    cursor += 6 * scale;
  }
}

function makePixels(width, height) {
  return new Uint8Array(width * height * 4);
}

function fill(buffer, width, height, color, alpha) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      setPixel(buffer, width, x, y, color, alpha);
    }
  }
}

function drawScaled(target, targetWidth, source, x, y, width, height) {
  blit(target, targetWidth, resizeNearest(source, width, height), x, y);
}

function resizeNearest(source, width, height) {
  const output = makePixels(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = Math.min(source.width - 1, Math.floor((x / width) * source.width));
      const sy = Math.min(source.height - 1, Math.floor((y / height) * source.height));
      const sourceIndex = (sy * source.width + sx) * 4;
      const targetIndex = (y * width + x) * 4;
      output[targetIndex] = source.pixels[sourceIndex];
      output[targetIndex + 1] = source.pixels[sourceIndex + 1];
      output[targetIndex + 2] = source.pixels[sourceIndex + 2];
      output[targetIndex + 3] = source.pixels[sourceIndex + 3];
    }
  }
  return { width, height, pixels: output };
}

function blit(target, targetWidth, source, targetX, targetY) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceIndex = (y * source.width + x) * 4;
      const alpha = source.pixels[sourceIndex + 3] / 255;
      if (alpha > 0) {
        blendPixel(target, targetWidth, targetX + x, targetY + y, {
          r: source.pixels[sourceIndex],
          g: source.pixels[sourceIndex + 1],
          b: source.pixels[sourceIndex + 2],
          a: alpha
        }, alpha);
      }
    }
  }
}

function setPixel(buffer, width, x, y, color, alpha) {
  if (x < 0 || y < 0 || x >= width || y >= buffer.length / width / 4) {
    return;
  }
  const index = (Math.floor(y) * width + Math.floor(x)) * 4;
  buffer[index] = color.r;
  buffer[index + 1] = color.g;
  buffer[index + 2] = color.b;
  buffer[index + 3] = Math.round(alpha * 255);
}

function blendPixel(buffer, width, x, y, color, coverage) {
  const height = buffer.length / width / 4;
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return;
  }
  const index = (Math.floor(y) * width + Math.floor(x)) * 4;
  const sourceAlpha = (color.a ?? 1) * coverage;
  const destAlpha = buffer[index + 3] / 255;
  const outputAlpha = sourceAlpha + destAlpha * (1 - sourceAlpha);
  if (outputAlpha <= 0) {
    return;
  }
  buffer[index] = Math.round((color.r * sourceAlpha + buffer[index] * destAlpha * (1 - sourceAlpha)) / outputAlpha);
  buffer[index + 1] = Math.round((color.g * sourceAlpha + buffer[index + 1] * destAlpha * (1 - sourceAlpha)) / outputAlpha);
  buffer[index + 2] = Math.round((color.b * sourceAlpha + buffer[index + 2] * destAlpha * (1 - sourceAlpha)) / outputAlpha);
  buffer[index + 3] = Math.round(outputAlpha * 255);
}

function encodePng(pixels, width, height) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    Buffer.from(pixels.buffer, y * width * 4, width * 4).copy(raw, rowStart + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", Buffer.concat([uint32(width), uint32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  return Buffer.concat([uint32(data.length), typeBuffer, data, uint32(crc32(Buffer.concat([typeBuffer, data])))]);
}

function writeAsset(relativePath, png) {
  const target = join(assetRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, png);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function relativeToRepo(filePath) {
  return filePath.replace(`${repoRoot}\\`, "").replaceAll("\\", "/");
}

function nextPowerOfTwo(value) {
  let power = 1;
  while (power < value) power *= 2;
  return power;
}

function nextRandom(state) {
  return (state * 1664525 + 1013904223) >>> 0;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function uint32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0, 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function hex(value) {
  const normalized = value.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
    a: 1
  };
}

function rgba(r, g, b, a) {
  return { r, g, b, a };
}

function hash(value) {
  let state = 0x811c9dc5;
  for (const char of value) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 0x01000193) >>> 0;
  }
  return state;
}

const font = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"]
};

main();
