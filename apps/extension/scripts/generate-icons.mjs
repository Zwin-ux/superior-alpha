import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const iconDir = join(scriptDir, "..", "public", "icons");
const desktopIconDir = join(scriptDir, "..", "..", "desktop", "src-tauri", "icons");
const desktopPublicDir = join(scriptDir, "..", "..", "desktop", "public");
const soulIconDir = join(scriptDir, "..", "..", "..", "assets", "bots", "soul", "icons");
const sizes = [16, 32, 48, 128, 256];

const colors = {
  mossGreen: hex("#7f9b64"),
  mossShadow: hex("#566d46"),
  mossHighlight: hex("#b8c9a6"),
  chalk: hex("#fff4dc"),
  chalkShadow: hex("#b9ad9b"),
  lens: hex("#7cc8d8"),
  gold: hex("#d8a849"),
  ink: hex("#15120f")
};

mkdirSync(iconDir, { recursive: true });
mkdirSync(desktopIconDir, { recursive: true });
mkdirSync(desktopPublicDir, { recursive: true });

if (copySoulIcons()) {
  process.exit(0);
}

const desktopPngs = [];
for (const size of sizes) {
  const png = createIconPng(size);
  desktopPngs.push({ size, png });

  writeFileSync(join(iconDir, `clawdbot-${size}.png`), png);
}

writeFileSync(join(desktopIconDir, "32x32.png"), desktopPngs.find((entry) => entry.size === 32).png);
writeFileSync(join(desktopIconDir, "128x128.png"), desktopPngs.find((entry) => entry.size === 128).png);
writeFileSync(join(desktopIconDir, "128x128@2x.png"), desktopPngs.find((entry) => entry.size === 256).png);
writeFileSync(join(desktopIconDir, "icon.png"), desktopPngs.find((entry) => entry.size === 256).png);
writeFileSync(join(desktopIconDir, "icon.ico"), createIco(desktopPngs));
writeFileSync(join(desktopPublicDir, "favicon.ico"), createIco(desktopPngs));

function copySoulIcons() {
  const iconSources = new Map([
    [16, "chrome-extension-icon-16.png"],
    [32, "chrome-extension-icon-32.png"],
    [48, "chrome-extension-icon-48.png"],
    [128, "chrome-extension-icon-128.png"],
    [256, "clawd-windows-256.png"]
  ]);
  const windowsIconPath = join(soulIconDir, "clawd-windows.ico");
  const everySourceExists =
    existsSync(windowsIconPath) && [...iconSources.values()].every((fileName) => existsSync(join(soulIconDir, fileName)));

  if (!everySourceExists) {
    return false;
  }

  for (const [size, fileName] of iconSources) {
    copyFileSync(join(soulIconDir, fileName), join(iconDir, `clawdbot-${size}.png`));
  }

  copyFileSync(join(soulIconDir, "chrome-extension-icon-32.png"), join(desktopIconDir, "32x32.png"));
  copyFileSync(join(soulIconDir, "chrome-extension-icon-128.png"), join(desktopIconDir, "128x128.png"));
  copyFileSync(join(soulIconDir, "clawd-windows-256.png"), join(desktopIconDir, "128x128@2x.png"));
  copyFileSync(join(soulIconDir, "clawd-windows-256.png"), join(desktopIconDir, "icon.png"));
  copyFileSync(windowsIconPath, join(desktopIconDir, "icon.ico"));
  copyFileSync(windowsIconPath, join(desktopPublicDir, "favicon.ico"));

  const avatarPath = join(soulIconDir, "clawd-avatar-1024.png");
  if (existsSync(avatarPath)) {
    writeFileSync(join(iconDir, "clawd-avatar-1024.png"), readFileSync(avatarPath));
  }

  return true;
}

function createIconPng(size) {
  const buffer = new Uint8Array(size * size * 4);
  const scale = size / 64;
  const cx = 32 * scale;
  const cy = 33 * scale;
  const rx = 23 * scale;
  const ry = 20 * scale;

  drawEllipse(buffer, size, cx, 45 * scale, 24 * scale, 9 * scale, 0, { ...colors.mossShadow, a: 0.42 });
  drawLine(buffer, size, 23 * scale, 17 * scale, 15 * scale, 5 * scale, 5 * scale, { ...colors.mossShadow, a: 1 });
  drawLine(buffer, size, 39 * scale, 16 * scale, 48 * scale, 7 * scale, 5 * scale, { ...colors.mossShadow, a: 1 });
  drawEllipse(buffer, size, cx, cy, rx, ry, -0.12, { ...colors.mossGreen, a: 1 });
  drawEllipse(buffer, size, 29 * scale, 25 * scale, 20 * scale, 9 * scale, -0.32, { ...colors.mossHighlight, a: 0.3 });
  drawEllipse(buffer, size, 41 * scale, 44 * scale, 15 * scale, 8 * scale, -0.2, { ...colors.mossShadow, a: 0.28 });
  drawClayDents(buffer, size, scale);

  drawCircle(buffer, size, 54 * scale, 34 * scale, 8 * scale, { ...colors.mossShadow, a: 1 });
  drawCircle(buffer, size, 54 * scale, 34 * scale, 3 * scale, { ...colors.chalkShadow, a: 1 });

  drawCircle(buffer, size, 16 * scale, 32 * scale, 9 * scale, { ...colors.chalk, a: 0.96 });
  drawCircle(buffer, size, 16 * scale, 32 * scale, 5 * scale, { ...colors.mossGreen, a: 1 });
  drawCircle(buffer, size, 16 * scale, 32 * scale, 2.5 * scale, { ...colors.lens, a: 0.85 });

  drawRoundRect(buffer, size, 47 * scale, 25 * scale, 11 * scale, 17 * scale, 4 * scale, { ...colors.chalk, a: 0.96 });
  drawLine(buffer, size, 50 * scale, 31 * scale, 55 * scale, 31 * scale, 1.4 * scale, { ...colors.chalkShadow, a: 1 });
  drawLine(buffer, size, 50 * scale, 35 * scale, 54 * scale, 35 * scale, 1.4 * scale, { ...colors.chalkShadow, a: 1 });

  drawRoundRect(buffer, size, 24 * scale, 30 * scale, 6 * scale, 6 * scale, 1.2 * scale, { ...colors.ink, a: 1 });
  drawRoundRect(buffer, size, 38 * scale, 30 * scale, 6 * scale, 6 * scale, 1.2 * scale, { ...colors.ink, a: 1 });
  drawEllipse(buffer, size, 24 * scale, 22 * scale, 8 * scale, 3 * scale, -0.42, { ...colors.mossHighlight, a: 0.46 });
  drawCircle(buffer, size, 18 * scale, 38 * scale, 1.2 * scale, { ...colors.mossShadow, a: 0.42 });
  drawCircle(buffer, size, 35 * scale, 21 * scale, 1 * scale, { ...colors.mossShadow, a: 0.3 });

  return encodePng(buffer, size, size);
}

function drawClayDents(buffer, size, scale) {
  const dents = [
    [20, 24, 1.2, colors.mossShadow, 0.22],
    [31, 20, 0.9, colors.mossShadow, 0.18],
    [43, 27, 1.1, colors.mossShadow, 0.2],
    [28, 41, 0.9, colors.mossShadow, 0.2],
    [39, 38, 1, colors.mossHighlight, 0.18],
    [22, 36, 0.8, colors.mossHighlight, 0.16]
  ];

  for (const [x, y, radius, color, alpha] of dents) {
    drawCircle(buffer, size, x * scale, y * scale, Math.max(0.55, radius * scale), { ...color, a: alpha });
  }
}

function drawCircle(buffer, size, cx, cy, radius, color) {
  drawEllipse(buffer, size, cx, cy, radius, radius, 0, color);
}

function drawEllipse(buffer, size, cx, cy, rx, ry, rotation, color) {
  const samples = 3;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const minX = Math.max(0, Math.floor(cx - rx - 2));
  const maxX = Math.min(size - 1, Math.ceil(cx + rx + 2));
  const minY = Math.max(0, Math.floor(cy - ry - 2));
  const maxY = Math.min(size - 1, Math.ceil(cy + ry + 2));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      let covered = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples - cx;
          const py = y + (sy + 0.5) / samples - cy;
          const localX = px * cos + py * sin;
          const localY = -px * sin + py * cos;

          if ((localX * localX) / (rx * rx) + (localY * localY) / (ry * ry) <= 1) {
            covered += 1;
          }
        }
      }

      if (covered > 0) {
        blendPixel(buffer, size, x, y, color, covered / (samples * samples));
      }
    }
  }
}

function drawRoundRect(buffer, size, x, y, width, height, radius, color) {
  const samples = 3;
  const minX = Math.max(0, Math.floor(x - 1));
  const maxX = Math.min(size - 1, Math.ceil(x + width + 1));
  const minY = Math.max(0, Math.floor(y - 1));
  const maxY = Math.min(size - 1, Math.ceil(y + height + 1));

  for (let py = minY; py <= maxY; py += 1) {
    for (let px = minX; px <= maxX; px += 1) {
      let covered = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const pointX = px + (sx + 0.5) / samples;
          const pointY = py + (sy + 0.5) / samples;

          if (insideRoundRect(pointX, pointY, x, y, width, height, radius)) {
            covered += 1;
          }
        }
      }

      if (covered > 0) {
        blendPixel(buffer, size, px, py, color, covered / (samples * samples));
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

function drawLine(buffer, size, x1, y1, x2, y2, width, color) {
  const radius = width / 2;
  const minX = Math.max(0, Math.floor(Math.min(x1, x2) - radius - 1));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(x1, x2) + radius + 1));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2) - radius - 1));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(y1, y2) + radius + 1));
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy || 1;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = Math.max(0, Math.min(1, ((x + 0.5 - x1) * dx + (y + 0.5 - y1) * dy) / lengthSquared));
      const nearestX = x1 + t * dx;
      const nearestY = y1 + t * dy;
      const distance = Math.hypot(x + 0.5 - nearestX, y + 0.5 - nearestY);
      const coverage = Math.max(0, Math.min(1, radius + 0.5 - distance));

      if (coverage > 0) {
        blendPixel(buffer, size, x, y, color, coverage);
      }
    }
  }
}

function blendPixel(buffer, size, x, y, color, coverage) {
  const index = (y * size + x) * 4;
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

function createIco(entries) {
  const headerSize = 6;
  const directoryEntrySize = 16;
  const header = Buffer.alloc(headerSize);
  const directory = Buffer.alloc(directoryEntrySize * entries.length);
  const images = entries.map((entry) => entry.png);
  let imageOffset = headerSize + directory.length;

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  entries.forEach((entry, index) => {
    const offset = index * directoryEntrySize;
    directory[offset] = entry.size >= 256 ? 0 : entry.size;
    directory[offset + 1] = entry.size >= 256 ? 0 : entry.size;
    directory[offset + 2] = 0;
    directory[offset + 3] = 0;
    directory.writeUInt16LE(1, offset + 4);
    directory.writeUInt16LE(32, offset + 6);
    directory.writeUInt32LE(entry.png.length, offset + 8);
    directory.writeUInt32LE(imageOffset, offset + 12);
    imageOffset += entry.png.length;
  });

  return Buffer.concat([header, directory, ...images]);
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
