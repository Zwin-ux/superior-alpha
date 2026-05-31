import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const assetRoot = resolve(scriptDir, "..");
const repoRoot = resolve(assetRoot, "..", "..", "..");
const manifestPath = join(assetRoot, "asset-manifest.json");
const godotAssetRoot = join(repoRoot, "superior", "godot-client", "assets", "clay");
const command = process.argv[2] ?? "export";
const requiredAssetIds = [
  "clay.wall",
  "clay.table",
  "clay.pedestal",
  "clay.lamp",
  "clay.rail",
  "clay.tray",
  "bot.clawd.head",
  "bot.clawd.eye.pixel",
  "bot.clawd.antenna",
  "skill.eye.xray",
  "skill.badge.explain",
  "skill.side.repo",
  "ui.status.light",
  "ui.stamp.spore",
  "onboarding.empty-bench"
];

const palette = {
  black: hex("#0b0907"),
  wallTop: hex("#2f6b73"),
  wallBottom: hex("#1f454b"),
  tableTop: hex("#b86f4e"),
  tableBottom: hex("#74422d"),
  paperTop: hex("#e8cfaa"),
  paperBottom: hex("#ba9063"),
  goldTop: hex("#d7a84b"),
  goldBottom: hex("#9f6a32"),
  mossTop: hex("#8cad70"),
  mossBottom: hex("#567345"),
  trayTop: hex("#c5a37c"),
  trayBottom: hex("#7d634b"),
  cream: hex("#f3e7c8"),
  ink: hex("#271a11"),
  pixelEye: hex("#dff8ff"),
  success: hex("#61b45b"),
  danger: hex("#a8523f")
};

function main() {
  if (!["sheet", "validate", "export"].includes(command)) {
    throw new Error(`Unknown command "${command}". Use sheet, validate, or export.`);
  }

  const manifest = readManifest();
  validateManifest(manifest);

  if (command === "validate") {
    validateAtlasIfPresent(manifest);
    console.log("SUPERIOR 0.13 Godot asset manifest is valid.");
    return;
  }

  const generated = generateApprovedAssets(manifest);
  writeContactSheet(manifest, generated);

  if (command === "export") {
    const atlasResult = writeAtlas(manifest, generated);
    const runtimeManifest = {
      version: manifest.version,
      artRule: manifest.artRule,
      atlas: "superior-clay-atlas.png",
      width: atlasResult.width,
      height: atlasResult.height,
      generatedAt: new Date().toISOString(),
      assets: atlasResult.assets
    };

    writeJson(join(assetRoot, "sheet", "superior-clay-atlas.json"), runtimeManifest);
    writeJson(manifestPath, manifest);
    mkdirSync(godotAssetRoot, { recursive: true });
    copyFileSync(join(assetRoot, "sheet", "superior-clay-atlas.png"), join(godotAssetRoot, "superior-clay-atlas.png"));
    writeJson(join(godotAssetRoot, "superior-clay-atlas.json"), runtimeManifest);
  }

  console.log(
    command === "sheet"
      ? "SUPERIOR 0.13 contact sheet generated."
      : "SUPERIOR 0.13 Godot atlas exported."
  );
}

function readManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function validateManifest(data) {
  if (data.version !== "0.13") {
    throw new Error("Expected 0.13 asset manifest.");
  }
  if (!Array.isArray(data.assets)) {
    throw new Error("Asset manifest must contain an assets array.");
  }

  const ids = new Set(data.assets.map((asset) => asset.id));
  for (const required of requiredAssetIds) {
    if (!ids.has(required)) {
      throw new Error(`Missing required 0.13 asset: ${required}`);
    }
  }

  for (const asset of data.assets) {
    if (!asset.id || !asset.kind || !asset.state) {
      throw new Error(`Malformed asset entry: ${JSON.stringify(asset)}`);
    }
    if (asset.godotTarget && asset.state !== "approved") {
      throw new Error(`Godot-mapped asset must be approved: ${asset.id}`);
    }
    if (asset.state === "approved" && !asset.approvedPath) {
      throw new Error(`Approved asset must define approvedPath: ${asset.id}`);
    }
    if (asset.qualityNotes?.some((note) => /ai mush|smeared|melted/i.test(note))) {
      throw new Error(`Quality notes cannot approve rejected visual language: ${asset.id}`);
    }
  }
}

function validateAtlasIfPresent(data) {
  const atlasPath = join(assetRoot, "sheet", "superior-clay-atlas.json");
  if (!existsSync(atlasPath)) {
    return;
  }

  const atlas = JSON.parse(readFileSync(atlasPath, "utf8"));
  if (!Array.isArray(atlas.assets)) {
    throw new Error("Atlas manifest must include assets.");
  }
  for (const asset of atlas.assets) {
    const rect = asset.atlasRect;
    if (!rect || rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0) {
      throw new Error(`Invalid atlas rect for ${asset.id}`);
    }
    if (rect.x + rect.width > atlas.width || rect.y + rect.height > atlas.height) {
      throw new Error(`Atlas rect outside bounds for ${asset.id}`);
    }
  }
}

function generateApprovedAssets(data) {
  const generated = new Map();

  for (const asset of data.assets) {
    const image = createAssetImage(asset);
    const approvedPath = resolve(repoRoot, asset.approvedPath);
    mkdirSync(dirname(approvedPath), { recursive: true });
    writeFileSync(approvedPath, encodePng(image.pixels, image.width, image.height));
    generated.set(asset.id, image);
  }

  return generated;
}

function writeContactSheet(data, generated) {
  const columns = 2;
  const cellWidth = 420;
  const cellHeight = 210;
  const rows = Math.ceil(data.assets.length / columns);
  const width = columns * cellWidth;
  const height = rows * cellHeight + 90;
  const sheet = makePixels(width, height);

  fill(sheet, width, height, palette.black, 1);
  drawPixelText(sheet, width, "SUPERIOR 0.13 ASSET SHEET", 24, 22, palette.cream, 3);
  drawPixelText(sheet, width, "CLAY WORLD / PIXEL INTERFACE / NO AI MUSH", 24, 58, palette.goldTop, 2);

  data.assets.forEach((asset, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = col * cellWidth + 20;
    const y = row * cellHeight + 96;
    drawRoundRect(sheet, width, height, x, y, cellWidth - 40, cellHeight - 24, 18, hex("#201711"), 1);
    drawRoundRect(sheet, width, height, x + 8, y + 8, 144, 144, 12, hex("#2d2117"), 1);
    blit(sheet, width, generated.get(asset.id), x + 16, y + 16);
    drawPixelText(sheet, width, asset.id.toUpperCase(), x + 164, y + 22, palette.cream, 1);
    drawPixelText(sheet, width, asset.kind.toUpperCase(), x + 164, y + 50, palette.goldTop, 1);
    drawPixelText(sheet, width, asset.state.toUpperCase(), x + 164, y + 78, asset.state === "approved" ? palette.success : palette.danger, 1);
  });

  writeAsset("sheet/superior-clay-contact-sheet.png", encodePng(sheet, width, height));
}

function writeAtlas(data, generated) {
  const cell = 128;
  const columns = 5;
  const rows = Math.ceil(data.assets.length / columns);
  const width = columns * cell;
  const height = rows * cell;
  const atlas = makePixels(width, height);
  fill(atlas, width, height, { r: 0, g: 0, b: 0, a: 0 }, 0);

  const assets = data.assets.map((asset, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const rect = { x: col * cell, y: row * cell, width: cell, height: cell };
    blit(atlas, width, generated.get(asset.id), rect.x, rect.y);
    asset.atlasRect = rect;
    return {
      id: asset.id,
      kind: asset.kind,
      state: asset.state,
      atlasRect: rect,
      godotTarget: asset.godotTarget,
      qualityNotes: asset.qualityNotes ?? []
    };
  });

  writeAsset("sheet/superior-clay-atlas.png", encodePng(atlas, width, height));
  return { width, height, assets };
}

function createAssetImage(asset) {
  const width = 128;
  const height = 128;
  const pixels = makePixels(width, height);
  const seed = hash(asset.id);

  switch (asset.id) {
    case "clay.wall":
      drawClayTile(pixels, width, height, palette.wallTop, palette.wallBottom, seed, 12);
      drawRoundRect(pixels, width, height, 12, 24, 104, 8, 4, hex("#5f7e80"), 0.28);
      drawRoundRect(pixels, width, height, 22, 76, 82, 7, 4, hex("#1a3639"), 0.18);
      break;
    case "clay.table":
      drawClayTile(pixels, width, height, palette.tableTop, palette.tableBottom, seed, 16);
      drawEllipse(pixels, width, height, 64, 110, 42, 7, 0, hex("#301e15"), 0.18);
      break;
    case "clay.pedestal":
      drawRoundRect(pixels, width, height, 12, 46, 104, 50, 18, palette.tableBottom, 1);
      drawRoundRect(pixels, width, height, 12, 34, 104, 46, 18, palette.tableTop, 1);
      addClayNoise(pixels, width, height, 12, seed);
      addDents(pixels, width, height, 8, seed);
      break;
    case "clay.lamp":
      drawRadial(pixels, width, height, 64, 72, 52, hex("#ffd27d"), 0.52);
      drawRoundRect(pixels, width, height, 30, 35, 68, 26, 13, hex("#5e5448"), 1);
      drawRoundRect(pixels, width, height, 42, 60, 44, 8, 4, hex("#ffd27d"), 1);
      break;
    case "clay.rail":
      drawClayTile(pixels, width, height, hex("#9b8063"), hex("#6d523d"), seed, 12);
      for (let y = 18; y < 112; y += 24) {
        drawRoundRect(pixels, width, height, 18, y, 92, 12, 6, palette.goldTop, 0.84);
      }
      break;
    case "clay.tray":
      drawClayTile(pixels, width, height, palette.trayTop, palette.trayBottom, seed, 12);
      for (let y = 22; y < 108; y += 30) {
        drawRoundRect(pixels, width, height, 18, y, 92, 18, 8, palette.paperTop, 0.72);
      }
      break;
    case "bot.clawd.head":
      drawEllipse(pixels, width, height, 64, 68, 46, 42, -0.05, palette.mossBottom, 1);
      drawEllipse(pixels, width, height, 58, 61, 39, 34, -0.05, palette.mossTop, 0.82);
      drawEllipse(pixels, width, height, 29, 68, 14, 12, -0.2, hex("#5f7b4e"), 0.92);
      drawEllipse(pixels, width, height, 101, 72, 11, 10, 0.25, hex("#789963"), 0.92);
      addDents(pixels, width, height, 10, seed);
      break;
    case "bot.clawd.eye.pixel":
      drawRadial(pixels, width, height, 64, 64, 46, palette.pixelEye, 0.24);
      drawRoundRect(pixels, width, height, 42, 51, 12, 12, 2, palette.pixelEye, 1);
      drawRoundRect(pixels, width, height, 74, 51, 12, 12, 2, palette.pixelEye, 1);
      drawRoundRect(pixels, width, height, 44, 75, 40, 5, 2, hex("#9cdce8"), 0.7);
      break;
    case "bot.clawd.antenna":
      drawRoundRect(pixels, width, height, 58, 26, 12, 60, 6, hex("#5a4939"), 1);
      drawEllipse(pixels, width, height, 64, 22, 17, 15, -0.2, palette.goldTop, 1);
      drawEllipse(pixels, width, height, 68, 20, 8, 6, -0.2, hex("#f0c66e"), 0.65);
      break;
    case "skill.eye.xray":
      drawEllipse(pixels, width, height, 64, 64, 40, 40, 0, hex("#6b5140"), 1);
      drawEllipse(pixels, width, height, 64, 64, 28, 28, 0, palette.goldTop, 1);
      drawEllipse(pixels, width, height, 64, 64, 15, 15, 0, hex("#523b35"), 1);
      drawRadial(pixels, width, height, 64, 64, 30, palette.pixelEye, 0.18);
      break;
    case "skill.badge.explain":
      drawRoundRect(pixels, width, height, 42, 30, 48, 68, 9, palette.paperTop, 1);
      drawRoundRect(pixels, width, height, 50, 43, 32, 5, 2, palette.ink, 0.35);
      drawRoundRect(pixels, width, height, 50, 57, 25, 5, 2, palette.ink, 0.32);
      drawPixelText(pixels, width, "?", 57, 70, palette.ink, 3);
      break;
    case "skill.side.repo":
      drawEllipse(pixels, width, height, 64, 64, 37, 37, 0, palette.goldBottom, 1);
      for (let i = 0; i < 8; i += 1) {
        const angle = (i / 8) * Math.PI * 2;
        drawRoundRect(pixels, width, height, 60 + Math.cos(angle) * 39, 60 + Math.sin(angle) * 39, 8, 10, 3, palette.goldTop, 1);
      }
      drawEllipse(pixels, width, height, 64, 64, 18, 18, 0, hex("#5a4939"), 1);
      break;
    case "ui.status.light":
      drawRadial(pixels, width, height, 64, 64, 48, palette.success, 0.32);
      drawRoundRect(pixels, width, height, 48, 48, 32, 32, 5, palette.success, 1);
      drawRoundRect(pixels, width, height, 56, 56, 16, 16, 3, hex("#b9f0a9"), 1);
      break;
    case "ui.stamp.spore":
      drawRoundRect(pixels, width, height, 24, 28, 80, 68, 8, palette.danger, 0.95);
      drawRoundRect(pixels, width, height, 31, 35, 66, 54, 4, palette.black, 0.34);
      drawPixelText(pixels, width, "SPORE", 37, 56, palette.cream, 2);
      break;
    case "onboarding.empty-bench":
      drawRoundRect(pixels, width, height, 16, 74, 96, 28, 14, palette.tableBottom, 1);
      drawRoundRect(pixels, width, height, 20, 62, 88, 24, 12, palette.tableTop, 1);
      drawEllipse(pixels, width, height, 64, 52, 34, 16, 0.05, hex("#8a7355"), 1);
      drawPixelText(pixels, width, "PICK", 43, 95, palette.cream, 1);
      break;
    default:
      drawClayTile(pixels, width, height, palette.paperTop, palette.paperBottom, seed, 8);
  }

  return { width, height, pixels };
}

function writeAsset(relativePath, png) {
  const target = join(assetRoot, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, png);
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function drawClayTile(buffer, width, height, top, bottom, seed, noise) {
  fillVerticalGradient(buffer, width, height, top, bottom);
  drawRadial(buffer, width, height, width * 0.28, height * 0.18, width * 0.62, hex("#fff0c9"), 0.14);
  addClayNoise(buffer, width, height, noise, seed);
  addDents(buffer, width, height, 18, seed ^ 0x7137);
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

function fillVerticalGradient(buffer, width, height, top, bottom) {
  for (let y = 0; y < height; y += 1) {
    const color = mix(top, bottom, y / Math.max(1, height - 1));
    for (let x = 0; x < width; x += 1) {
      setPixel(buffer, width, x, y, color, 1);
    }
  }
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
      buffer[index] = clampByte(buffer[index] + delta);
      buffer[index + 1] = clampByte(buffer[index + 1] + delta);
      buffer[index + 2] = clampByte(buffer[index + 2] + delta);
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
    const radius = 1.1 + (((state >>> 24) & 0xff) / 0xff) * 3.3;
    const color = (state & 1) === 0 ? hex("#5f3f2b") : hex("#fff1cb");
    drawEllipse(buffer, width, height, x, y, radius * 1.7, radius, -0.2, color, (state & 1) === 0 ? 0.09 : 0.11);
  }
}

function blit(target, targetWidth, source, targetX, targetY) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceIndex = (y * source.width + x) * 4;
      const color = {
        r: source.pixels[sourceIndex],
        g: source.pixels[sourceIndex + 1],
        b: source.pixels[sourceIndex + 2],
        a: source.pixels[sourceIndex + 3] / 255
      };
      if (color.a > 0) {
        blendPixel(target, targetWidth, targetX + x, targetY + y, color, color.a);
      }
    }
  }
}

function drawPixelText(buffer, width, text, x, y, color, scale) {
  let cursor = x;
  const upper = text.toUpperCase();
  for (const char of upper) {
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

function setPixel(buffer, width, x, y, color, alpha) {
  const index = (y * width + x) * 4;
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

function mix(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
    a: 1
  };
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

function hash(value) {
  let state = 0x811c9dc5;
  for (const char of value) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 0x01000193) >>> 0;
  }
  return state;
}

const font = {
  "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  "C": ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  "G": ["01111", "10000", "10000", "10011", "10001", "10001", "01110"],
  "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  "J": ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"]
};

main();
