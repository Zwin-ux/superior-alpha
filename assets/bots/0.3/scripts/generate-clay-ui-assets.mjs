import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(scriptDir, "..");
const publicRoot = resolve(sourceRoot, "..", "..", "..", "apps", "desktop", "public", "assets", "bots", "0.3");
const outputRoots = [sourceRoot, publicRoot];

const palette = {
  wallTop: hex("#95b7bd"),
  wallBottom: hex("#b8c6b8"),
  tableTop: hex("#c47a55"),
  tableBottom: hex("#865238"),
  railTop: hex("#caa884"),
  railBottom: hex("#a97750"),
  goldTop: hex("#efbd65"),
  goldMid: hex("#d89b47"),
  goldPressed: hex("#c47f42"),
  creamTop: hex("#f0d5ae"),
  creamBottom: hex("#d4ae7f"),
  trayTop: hex("#e8cfaa"),
  trayBottom: hex("#c89c6c"),
  ink: hex("#2a211b")
};

writeAsset("generated/backgrounds/workshop-scene.png", createWorkshopScene());
writeAsset("generated/backgrounds/menu-rail-clay.png", createClaySurface(512, 512, palette.railTop, palette.railBottom, 0));
writeAsset("generated/backgrounds/tray-surface.png", createTraySurface());
writeAsset("generated/backgrounds/table-slab.png", createTableSlab());
writeAsset("generated/buttons/menu-default.png", createMenuSlab("default"));
writeAsset("generated/buttons/menu-hover.png", createMenuSlab("hover"));
writeAsset("generated/buttons/menu-pressed.png", createMenuSlab("pressed"));
writeAsset("generated/buttons/menu-disabled.png", createMenuSlab("disabled"));
writeAsset("generated/panels/panel-raised.png", createPanel("raised"));
writeAsset("generated/panels/panel-pressed.png", createPanel("pressed"));

function writeAsset(relativePath, png) {
  for (const root of outputRoots) {
    const target = join(root, relativePath);

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, png);
  }
}

function createWorkshopScene() {
  const width = 1280;
  const height = 720;
  const pixels = makePixels(width, height);

  fillVerticalGradient(pixels, width, height, palette.wallTop, palette.wallBottom, 0, 0.53);
  fillVerticalGradient(pixels, width, height, palette.tableTop, palette.tableBottom, 0.53, 1);
  drawRadial(pixels, width, height, width * 0.51, height * 0.11, width * 0.22, hex("#ffe6a6"), 0.48);
  drawRadial(pixels, width, height, width * 0.5, height * 0.43, width * 0.36, hex("#f8d192"), 0.12);
  drawRoundRect(pixels, width, height, 250, 116, 780, 10, 5, hex("#6e776d"), 0.28);
  drawRoundRect(pixels, width, height, 250, 138, 780, 10, 5, hex("#6e776d"), 0.18);
  drawRoundRect(pixels, width, height, 312, 446, 660, 78, 32, hex("#ba684a"), 0.9);
  drawRoundRect(pixels, width, height, 310, 444, 660, 54, 28, hex("#d0845b"), 0.74);
  drawEllipse(pixels, width, height, 640, 544, 310, 36, 0, hex("#3a2519"), 0.16);
  drawRadial(pixels, width, height, 140, 620, 180, hex("#2b211b"), 0.14);
  drawRadial(pixels, width, height, 1160, 620, 200, hex("#2b211b"), 0.14);
  addClayNoise(pixels, width, height, 0, 0x03a3);
  addDents(pixels, width, height, 90, 0x21ef);

  return encodePng(pixels, width, height);
}

function createTraySurface() {
  const width = 512;
  const height = 512;
  const pixels = createClaySurfacePixels(width, height, palette.trayTop, palette.trayBottom, 0x6231);

  drawRadial(pixels, width, height, width * 0.78, height * 0.08, width * 0.44, hex("#f3d67a"), 0.2);
  drawRoundRect(pixels, width, height, 26, 28, 460, 118, 28, hex("#f1d7b2"), 0.32);
  drawRoundRect(pixels, width, height, 34, 176, 444, 92, 24, hex("#b57d54"), 0.13);
  drawRoundRect(pixels, width, height, 34, 298, 444, 92, 24, hex("#b57d54"), 0.11);
  drawRoundRect(pixels, width, height, 34, 420, 444, 58, 22, hex("#f6dfbf"), 0.2);
  addDents(pixels, width, height, 52, 0x6293);

  return encodePng(pixels, width, height);
}

function createTableSlab() {
  const width = 800;
  const height = 180;
  const pixels = makePixels(width, height);

  drawRoundRect(pixels, width, height, 18, 26, 764, 118, 48, palette.tableBottom, 1);
  drawRoundRect(pixels, width, height, 18, 14, 764, 96, 44, palette.tableTop, 1);
  drawRoundRect(pixels, width, height, 44, 34, 710, 36, 20, hex("#e39a70"), 0.35);
  drawEllipse(pixels, width, height, width * 0.5, 154, 340, 28, 0, hex("#3a2519"), 0.14);
  addClayNoise(pixels, width, height, 0, 0x7137);
  addDents(pixels, width, height, 36, 0x1641);

  return encodePng(pixels, width, height);
}

function createMenuSlab(state) {
  const width = 420;
  const height = 112;
  const pixels = makePixels(width, height);
  const y = state === "pressed" ? 16 : 10;
  const h = state === "pressed" ? 78 : 84;
  const top = state === "disabled" ? hex("#c9a879") : state === "pressed" ? palette.goldPressed : state === "hover" ? hex("#f2c66f") : palette.goldTop;
  const bottom = state === "disabled" ? hex("#9d7852") : state === "pressed" ? hex("#a96536") : palette.goldMid;

  drawRoundRect(pixels, width, height, 16, y + 12, 388, h, 26, hex("#724524"), state === "pressed" ? 0.22 : 0.34);
  drawGradientRoundRect(pixels, width, height, 14, y, 392, h, 27, top, bottom, state === "disabled" ? 0.84 : 1);
  drawRoundRect(pixels, width, height, 34, y + 11, 348, 14, 12, hex("#ffe2a1"), state === "pressed" ? 0.22 : 0.36);
  drawRoundRect(pixels, width, height, 36, y + h - 18, 344, 10, 12, hex("#8e562f"), state === "pressed" ? 0.18 : 0.2);
  addClayNoise(pixels, width, height, 0, state === "hover" ? 0x7782 : state === "pressed" ? 0x8851 : 0x4451);
  addDents(pixels, width, height, state === "disabled" ? 12 : 20, state === "pressed" ? 0x9051 : 0x4550);

  return encodePng(pixels, width, height);
}

function createPanel(state) {
  const width = 512;
  const height = 320;
  const pixels = makePixels(width, height);
  const top = state === "pressed" ? hex("#d2af84") : palette.creamTop;
  const bottom = state === "pressed" ? hex("#ba8d61") : palette.creamBottom;

  drawRoundRect(pixels, width, height, 12, 18, 488, 284, 30, hex("#5f3f2b"), state === "pressed" ? 0.16 : 0.22);
  drawGradientRoundRect(pixels, width, height, 10, 10, 492, 284, 30, top, bottom, 1);
  drawRoundRect(pixels, width, height, 28, 26, 456, 18, 14, hex("#fff0c9"), state === "pressed" ? 0.22 : 0.36);
  drawRoundRect(pixels, width, height, 28, 252, 456, 16, 14, hex("#8e6140"), state === "pressed" ? 0.18 : 0.14);
  addClayNoise(pixels, width, height, 0, state === "pressed" ? 0xbab1 : 0xa7d1);
  addDents(pixels, width, height, 28, state === "pressed" ? 0xbab2 : 0xa7d2);

  return encodePng(pixels, width, height);
}

function createClaySurface(width, height, top, bottom, intensity) {
  const pixels = createClaySurfacePixels(width, height, top, bottom, 0x3209);

  addClayNoise(pixels, width, height, intensity, 0x3209);
  addDents(pixels, width, height, 45, 0x320a);

  return encodePng(pixels, width, height);
}

function createClaySurfacePixels(width, height, top, bottom, seed) {
  const pixels = makePixels(width, height);

  fillVerticalGradient(pixels, width, height, top, bottom, 0, 1);
  drawRadial(pixels, width, height, width * 0.18, height * 0.12, width * 0.4, hex("#fff1cb"), 0.2);
  addClayNoise(pixels, width, height, 0, seed);

  return pixels;
}

function makePixels(width, height) {
  return new Uint8Array(width * height * 4);
}

function fillVerticalGradient(buffer, width, height, top, bottom, startRatio, endRatio) {
  const startY = Math.floor(height * startRatio);
  const endY = Math.max(startY + 1, Math.floor(height * endRatio));

  for (let y = startY; y < endY; y += 1) {
    const t = (y - startY) / Math.max(1, endY - startY - 1);
    const color = mix(top, bottom, t);

    for (let x = 0; x < width; x += 1) {
      setPixel(buffer, width, x, y, color, 1);
    }
  }
}

function drawGradientRoundRect(buffer, width, height, x, y, rectWidth, rectHeight, radius, top, bottom, alpha) {
  for (let py = Math.floor(y); py <= Math.ceil(y + rectHeight); py += 1) {
    const t = Math.max(0, Math.min(1, (py - y) / rectHeight));
    const color = mix(top, bottom, t);

    for (let px = Math.floor(x); px <= Math.ceil(x + rectWidth); px += 1) {
      if (insideRoundRect(px + 0.5, py + 0.5, x, y, rectWidth, rectHeight, radius)) {
        blendPixel(buffer, width, px, py, color, alpha);
      }
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
  if (intensity <= 0) {
    return;
  }

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
    const radius = 1.2 + (((state >>> 24) & 0xff) / 0xff) * 3.8;
    const color = (state & 1) === 0 ? hex("#5f3f2b") : hex("#fff1cb");

    drawEllipse(buffer, width, height, x, y, radius * 1.8, radius, -0.2, color, (state & 1) === 0 ? 0.09 : 0.12);
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
  const index = (y * width + x) * 4;
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
