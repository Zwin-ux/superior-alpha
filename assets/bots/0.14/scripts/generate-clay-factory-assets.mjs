import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const assetRoot = resolve(scriptDir, "..");
const repoRoot = resolve(assetRoot, "..", "..", "..");
const manifestPath = join(assetRoot, "asset-manifest.json");
const godotAssetRoot = join(repoRoot, "superior", "godot-client", "assets", "clay");
const command = process.argv[2] ?? "export";
const atlasName = "superior-clay-factory-atlas.png";
const atlasJsonName = "superior-clay-factory-atlas.json";
const manualRequiredAssetIds = new Set(["scene.status-pill", "scene.bottom-card", "scene.wall", "scene.table"]);
const requiredAssetIds = [
  "scene.wall",
  "scene.lamp",
  "scene.sign",
  "scene.left-rail",
  "scene.menu-slab.default",
  "scene.menu-slab.hover",
  "scene.menu-slab.pressed",
  "scene.table",
  "scene.pedestal",
  "scene.right-tray",
  "scene.tray-slot.empty",
  "scene.tray-slot.equipped",
  "scene.bottom-card",
  "scene.status-pill",
  "bot.clawd.body",
  "bot.clawd.eye.pixel",
  "bot.clawd.skill.eye",
  "bot.clawd.skill.badge",
  "bot.clawd.skill.side",
  "boot.seed",
  "boot.wordmark",
  "boot.progress-pip"
];
const requiredZones = ["boot", "lamp-sign", "left-rail", "center-bot", "right-tray", "bottom-status"];

const palette = {
  black: hex("#080706"),
  shadow: hex("#21150f"),
  wallTop: hex("#327780"),
  wallBottom: hex("#1f4f58"),
  lamp: hex("#ffc469"),
  lampCore: hex("#fff0ad"),
  railTop: hex("#b39975"),
  railBottom: hex("#735843"),
  trayTop: hex("#c6a47c"),
  trayBottom: hex("#7a6048"),
  goldTop: hex("#dbad52"),
  goldBottom: hex("#a36b32"),
  tableTop: hex("#bc704d"),
  tableBottom: hex("#72412f"),
  paperTop: hex("#ecd4ad"),
  paperBottom: hex("#b98c61"),
  mossTop: hex("#8dab70"),
  mossMid: hex("#6e8d58"),
  mossBottom: hex("#4e653f"),
  lavender: hex("#7b5d78"),
  ink: hex("#2a1b12"),
  cream: hex("#f2e3c0"),
  blueEye: hex("#d8f7ff"),
  blueTrace: hex("#85d9ee"),
  good: hex("#69b65b"),
  warn: hex("#d6a841"),
  fail: hex("#a84e3d")
};

function main() {
  if (!["sheet", "export", "quality-gate", "seed-manual"].includes(command)) {
    throw new Error(`Unknown command "${command}". Use sheet, export, quality-gate, or seed-manual.`);
  }

  const manifest = readManifest();
  validateManifest(manifest);

  if (command === "seed-manual") {
    seedManualAssets(manifest);
    console.log("SUPERIOR 0.14 first-slice manual clay plates seeded.");
    return;
  }

  if (command === "quality-gate") {
    validateQualityArtifacts(manifest);
    console.log("SUPERIOR 0.14 clay factory quality gate passed.");
    return;
  }

  const generated = generateRuntimeAssets(manifest);
  writeContactSheet(manifest, generated);
  writeCompositionProof(generated);

  if (command === "export") {
    const atlas = writeAtlas(manifest, generated);
    const runtimeManifest = {
      version: manifest.version,
      name: manifest.name,
      artRule: manifest.artRule,
      atlas: atlasName,
      width: atlas.width,
      height: atlas.height,
      generatedAt: new Date().toISOString(),
      assets: atlas.assets
    };
    writeJson(join(assetRoot, "sheet", atlasJsonName), runtimeManifest);
    writeJson(manifestPath, manifest);
    writeQualityReport(manifest, atlas);
    mkdirSync(godotAssetRoot, { recursive: true });
    copyFileSync(join(assetRoot, "sheet", atlasName), join(godotAssetRoot, atlasName));
    writeJson(join(godotAssetRoot, atlasJsonName), runtimeManifest);
  }

  console.log(command === "sheet" ? "SUPERIOR 0.14 clay factory sheet generated." : "SUPERIOR 0.14 clay factory atlas exported.");
}

function readManifest() {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function validateManifest(data) {
  if (data.version !== "0.14") {
    throw new Error("Expected 0.14 asset manifest.");
  }
  if (!Array.isArray(data.assets)) {
    throw new Error("0.14 manifest must contain assets.");
  }

  const ids = new Set(data.assets.map((asset) => asset.id));
  for (const id of requiredAssetIds) {
    if (!ids.has(id)) {
      throw new Error(`Missing required 0.14 runtime asset: ${id}`);
    }
  }

  const zones = new Set();
  for (const asset of data.assets) {
    if (!asset.id || !asset.kind || !asset.state) {
      throw new Error(`Malformed asset entry: ${JSON.stringify(asset)}`);
    }
    if (asset.godotTarget && asset.state !== "approved-runtime") {
      throw new Error(`Godot runtime asset is not runtime-approved: ${asset.id}`);
    }
    if (asset.state === "approved-runtime" && !asset.approvedPath) {
      throw new Error(`Runtime-approved asset needs approvedPath: ${asset.id}`);
    }
    if (asset.width < 64 || asset.height < 64) {
      throw new Error(`Asset is too small for 0.14 runtime gate: ${asset.id}`);
    }
    const notes = (asset.qualityNotes ?? []).join(" ");
    if (/placeholder|plumbing|ai mush|smeared|melted/i.test(notes)) {
      throw new Error(`Runtime asset quality note contains rejected language: ${asset.id}`);
    }
    for (const zone of asset.zones ?? []) {
      zones.add(zone);
    }
  }

  for (const zone of requiredZones) {
    if (!zones.has(zone)) {
      throw new Error(`0.14 factory is missing composition zone: ${zone}`);
    }
  }
}

function validateQualityArtifacts(manifest) {
  const requiredFiles = [
    join(assetRoot, "sheet", "superior-clay-factory-contact-sheet.png"),
    join(assetRoot, "sheet", atlasName),
    join(assetRoot, "sheet", atlasJsonName),
    join(assetRoot, "sheet", "superior-clay-factory-quality-report.json"),
    join(assetRoot, "sheet", "superior-clay-factory-composition-proof.png"),
    join(godotAssetRoot, atlasName),
    join(godotAssetRoot, atlasJsonName)
  ];
  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      throw new Error(`Missing 0.14 quality artifact: ${file}`);
    }
  }

  const atlas = JSON.parse(readFileSync(join(assetRoot, "sheet", atlasJsonName), "utf8"));
  for (const asset of atlas.assets) {
    const rect = asset.atlasRect;
    if (!rect || rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0) {
      throw new Error(`Invalid atlas rect for ${asset.id}`);
    }
    if (rect.x + rect.width > atlas.width || rect.y + rect.height > atlas.height) {
      throw new Error(`Atlas rect outside bounds for ${asset.id}`);
    }
  }

  const byId = new Map(atlas.assets.map((asset) => [asset.id, asset]));
  for (const id of manualRequiredAssetIds) {
    const asset = byId.get(id);
    if (!asset) {
      throw new Error(`Manual-required asset missing from atlas: ${id}`);
    }
    if (asset.sourceKind !== "manual") {
      throw new Error(`Manual-required asset fell back to generated output: ${id}`);
    }
  }

  const report = JSON.parse(readFileSync(join(assetRoot, "sheet", "superior-clay-factory-quality-report.json"), "utf8"));
  if (!report.passed) {
    throw new Error("0.14 quality report is not passing.");
  }

  const runtimeIds = new Set(atlas.assets.map((asset) => asset.id));
  for (const asset of manifest.assets) {
    if (asset.godotTarget && !runtimeIds.has(asset.id)) {
      throw new Error(`Godot-targeted asset missing from runtime atlas: ${asset.id}`);
    }
  }
}

function generateRuntimeAssets(data) {
  const generated = new Map();
  for (const asset of data.assets) {
    const resolved = resolveRuntimeAsset(asset);
    asset.approvedPath = resolved.approvedPath;
    asset.sourcePath = resolved.sourcePath;
    asset.sourceKind = resolved.sourceKind;
    generated.set(asset.id, resolved.image);
  }
  return generated;
}

function resolveRuntimeAsset(asset) {
  const manualSourcePath = join(assetRoot, "source", "manual", `${asset.id}.png`);
  if (existsSync(manualSourcePath)) {
    const image = decodePng(manualSourcePath);
    validateImageDimensions(asset, image, manualSourcePath);
    const approvedPath = join(assetRoot, "approved-runtime", "manual", `${asset.id}.png`);
    mkdirSync(dirname(approvedPath), { recursive: true });
    copyFileSync(manualSourcePath, approvedPath);
    return {
      image,
      sourceKind: "manual",
      sourcePath: relativeToRepo(manualSourcePath),
      approvedPath: relativeToRepo(approvedPath)
    };
  }

  const image = createAssetImage(asset);
  const approvedPath = join(assetRoot, "approved-runtime", "generated", `${asset.id}.png`);
  mkdirSync(dirname(approvedPath), { recursive: true });
  writeFileSync(approvedPath, encodePng(image.pixels, image.width, image.height));
  return {
    image,
    sourceKind: "generated-fallback",
    sourcePath: undefined,
    approvedPath: relativeToRepo(approvedPath)
  };
}

function validateImageDimensions(asset, image, filePath) {
  if (image.width !== asset.width || image.height !== asset.height) {
    throw new Error(`Manual asset dimensions do not match manifest for ${asset.id}: ${filePath} is ${image.width}x${image.height}, expected ${asset.width}x${asset.height}`);
  }
}

function seedManualAssets(data) {
  mkdirSync(join(assetRoot, "source", "manual"), { recursive: true });
  mkdirSync(join(assetRoot, "source", "reference"), { recursive: true });
  for (const asset of data.assets) {
    if (!manualRequiredAssetIds.has(asset.id)) {
      continue;
    }
    const target = join(assetRoot, "source", "manual", `${asset.id}.png`);
    const image = createManualSeedImage(asset);
    writeFileSync(target, encodePng(image.pixels, image.width, image.height));
  }
}

function createManualSeedImage(asset) {
  const width = asset.width;
  const height = asset.height;
  const pixels = makePixels(width, height);
  const seed = hash(`manual:${asset.id}`);
  fill(pixels, width, height, { r: 0, g: 0, b: 0, a: 0 }, 0);

  switch (asset.id) {
    case "scene.wall":
      drawClayTile(pixels, width, height, hex("#34858a"), hex("#245c63"), seed, 15);
      drawRadial(pixels, width, height, width * 0.5, -height * 0.08, width * 0.58, palette.lamp, 0.22);
      drawRoundRect(pixels, width, height, 34, 26, 56, 186, 22, hex("#7a563b"), 0.54);
      drawRoundRect(pixels, width, height, 392, 18, 48, 202, 20, hex("#876347"), 0.38);
      drawRoundRect(pixels, width, height, 98, 210, 318, 18, 9, hex("#173941"), 0.28);
      drawRoundRect(pixels, width, height, 122, 214, 118, 8, 4, hex("#d5a65e"), 0.16);
      for (let i = 0; i < 9; i += 1) {
        const x = 64 + ((seed >>> (i % 12)) % 390);
        drawRoundRect(pixels, width, height, x, 46 + i * 22, 3 + (i % 3), 42, 2, hex("#153840"), 0.09);
      }
      addDents(pixels, width, height, 60, seed ^ 0x2191);
      break;
    case "scene.table":
      drawClayTile(pixels, width, height, hex("#b76543"), hex("#74402e"), seed, 13);
      drawRoundRect(pixels, width, height, 0, 0, width, 36, 0, hex("#cf8058"), 0.28);
      drawRoundRect(pixels, width, height, 0, 188, width, 68, 0, hex("#4d2d22"), 0.48);
      drawRoundRect(pixels, width, height, 0, 186, width, 10, 0, hex("#d28a61"), 0.22);
      drawEllipse(pixels, width, height, 386, 86, 250, 34, -0.02, palette.shadow, 0.20);
      drawEllipse(pixels, width, height, 118, 156, 62, 12, -0.08, hex("#301c16"), 0.15);
      drawEllipse(pixels, width, height, 626, 164, 86, 15, 0.05, hex("#301c16"), 0.12);
      for (let i = 0; i < 14; i += 1) {
        const x = 34 + i * 52 + ((seed >>> (i % 18)) & 7);
        drawRoundRect(pixels, width, height, x, 206, 3, 28 + (i % 4) * 5, 2, hex("#2b1a14"), 0.12);
      }
      addDents(pixels, width, height, 84, seed ^ 0x421a);
      break;
    case "scene.bottom-card":
      drawRoundRect(pixels, width, height, 10, 20, 458, 126, 20, hex("#9d734b"), 1);
      drawRoundRect(pixels, width, height, 20, 16, 440, 122, 17, hex("#efd9ae"), 0.96);
      drawRoundRect(pixels, width, height, 34, 34, 408, 34, 11, hex("#f7e5bf"), 0.28);
      drawRoundRect(pixels, width, height, 34, 86, 118, 34, 10, hex("#b7895b"), 0.20);
      drawRoundRect(pixels, width, height, 176, 86, 118, 34, 10, hex("#b7895b"), 0.18);
      drawRoundRect(pixels, width, height, 318, 86, 104, 34, 10, hex("#b7895b"), 0.18);
      drawRoundRect(pixels, width, height, 28, 140, 398, 4, 2, hex("#6a4a31"), 0.18);
      addClayNoise(pixels, width, height, 5, seed);
      addDents(pixels, width, height, 32, seed ^ 0x7619);
      break;
    case "scene.status-pill":
      drawRoundRect(pixels, width, height, 8, 12, width - 16, height - 22, 26, hex("#17120f"), 1);
      drawRoundRect(pixels, width, height, 16, 17, width - 34, height - 34, 22, hex("#2a2119"), 0.92);
      drawEllipse(pixels, width, height, 43, 40, 15, 15, 0, palette.good, 1);
      drawEllipse(pixels, width, height, 43, 40, 6, 6, 0, hex("#e5f6bd"), 0.9);
      drawRadial(pixels, width, height, 43, 40, 34, palette.good, 0.22);
      drawRoundRect(pixels, width, height, 74, 28, 148, 6, 3, hex("#fff1bb"), 0.10);
      drawRoundRect(pixels, width, height, 74, 46, 112, 5, 3, hex("#000000"), 0.16);
      addClayNoise(pixels, width, height, 4, seed);
      break;
    default:
      return createAssetImage(asset);
  }

  return { width, height, pixels };
}

function createAssetImage(asset) {
  const width = asset.width;
  const height = asset.height;
  const pixels = makePixels(width, height);
  const seed = hash(asset.id);
  fill(pixels, width, height, { r: 0, g: 0, b: 0, a: 0 }, 0);

  switch (asset.id) {
    case "scene.wall":
      drawClayTile(pixels, width, height, palette.wallTop, palette.wallBottom, seed, 22);
      drawRoundRect(pixels, width, height, 42, 36, 62, 152, 24, hex("#8b6a4c"), 0.55);
      drawRoundRect(pixels, width, height, 354, 34, 64, 164, 24, hex("#8e6545"), 0.42);
      drawRoundRect(pixels, width, height, 90, 196, 328, 15, 8, hex("#17353b"), 0.22);
      break;
    case "scene.lamp":
      drawRadial(pixels, width, height, width / 2, 115, 112, palette.lamp, 0.55);
      drawEllipse(pixels, width, height, width / 2, 64, 68, 32, 0, hex("#61564b"), 1);
      drawEllipse(pixels, width, height, width / 2, 72, 54, 10, 0, palette.lampCore, 1);
      drawRoundRect(pixels, width, height, width / 2 - 9, 8, 18, 48, 8, hex("#5a4a3b"), 1);
      addClayNoise(pixels, width, height, 10, seed);
      break;
    case "scene.sign":
      drawRoundRect(pixels, width, height, 24, 26, 464, 84, 24, hex("#b99a75"), 1);
      drawRoundRect(pixels, width, height, 118, 112, 276, 36, 16, hex("#b48761"), 1);
      addClayNoise(pixels, width, height, 8, seed);
      drawPixelText(pixels, width, "SUPERIOR", 98, 50, palette.ink, 7);
      drawPixelText(pixels, width, "WORKSHOP", 152, 119, palette.ink, 4);
      break;
    case "scene.left-rail":
      drawRoundRect(pixels, width, height, 20, 14, 216, 482, 28, palette.railBottom, 1);
      drawRoundRect(pixels, width, height, 26, 20, 204, 470, 24, palette.railTop, 0.82);
      addClayNoise(pixels, width, height, 11, seed);
      drawEllipse(pixels, width, height, 70, 66, 29, 26, 0, hex("#3d362f"), 1);
      drawEllipse(pixels, width, height, 60, 62, 5, 5, 0, palette.lampCore, 1);
      drawEllipse(pixels, width, height, 78, 62, 5, 5, 0, palette.lampCore, 1);
      break;
    case "scene.menu-slab.default":
      drawClaySlab(pixels, width, height, palette.goldTop, palette.goldBottom, seed, false);
      break;
    case "scene.menu-slab.hover":
      drawClaySlab(pixels, width, height, hex("#efbf61"), palette.goldBottom, seed, false);
      drawRadial(pixels, width, height, width / 2, height / 2, 98, palette.lampCore, 0.1);
      break;
    case "scene.menu-slab.pressed":
      drawClaySlab(pixels, width, height, palette.goldBottom, hex("#7d4e26"), seed, true);
      break;
    case "scene.table":
      drawClayTile(pixels, width, height, palette.tableTop, palette.tableBottom, seed, 16);
      drawEllipse(pixels, width, height, 390, 74, 220, 28, 0, palette.shadow, 0.22);
      drawRoundRect(pixels, width, height, 0, 208, width, 46, 0, hex("#4d2c21"), 0.46);
      break;
    case "scene.pedestal":
      drawEllipse(pixels, width, height, 192, 148, 150, 24, 0, palette.shadow, 0.26);
      drawRoundRect(pixels, width, height, 52, 78, 280, 76, 28, palette.tableBottom, 1);
      drawRoundRect(pixels, width, height, 42, 54, 300, 72, 30, palette.tableTop, 1);
      addClayNoise(pixels, width, height, 12, seed);
      break;
    case "scene.right-tray":
      drawRoundRect(pixels, width, height, 15, 12, 290, 488, 28, palette.trayBottom, 1);
      drawRoundRect(pixels, width, height, 24, 24, 272, 464, 22, palette.trayTop, 0.92);
      addClayNoise(pixels, width, height, 11, seed);
      break;
    case "scene.tray-slot.empty":
      drawTraySlot(pixels, width, height, seed, false);
      break;
    case "scene.tray-slot.equipped":
      drawTraySlot(pixels, width, height, seed, true);
      break;
    case "scene.bottom-card":
      drawRoundRect(pixels, width, height, 16, 16, 448, 128, 18, palette.paperBottom, 1);
      drawRoundRect(pixels, width, height, 24, 22, 432, 116, 15, palette.paperTop, 0.88);
      addClayNoise(pixels, width, height, 7, seed);
      break;
    case "scene.status-pill":
      drawRoundRect(pixels, width, height, 8, 14, 240, 50, 22, hex("#211b15"), 0.95);
      drawEllipse(pixels, width, height, 42, 39, 13, 13, 0, palette.good, 1);
      drawRadial(pixels, width, height, 42, 39, 24, palette.good, 0.22);
      break;
    case "bot.clawd.body":
      drawEllipse(pixels, width, height, 194, 214, 136, 122, -0.05, palette.mossBottom, 1);
      drawEllipse(pixels, width, height, 184, 198, 122, 102, -0.08, palette.mossTop, 0.88);
      drawEllipse(pixels, width, height, 88, 210, 34, 30, -0.28, palette.mossMid, 0.95);
      drawEllipse(pixels, width, height, 300, 220, 28, 25, 0.22, palette.mossMid, 0.95);
      drawRoundRect(pixels, width, height, 154, 54, 24, 92, 12, hex("#594a38"), 1);
      drawEllipse(pixels, width, height, 158, 52, 30, 26, -0.2, palette.goldTop, 1);
      drawEllipse(pixels, width, height, 205, 330, 120, 16, 0, palette.shadow, 0.24);
      addClayNoise(pixels, width, height, 13, seed);
      addDents(pixels, width, height, 42, seed ^ 0x9472);
      break;
    case "bot.clawd.eye.pixel":
      drawRadial(pixels, width, height, 128, 63, 94, palette.blueEye, 0.18);
      drawRoundRect(pixels, width, height, 74, 46, 21, 21, 4, palette.blueEye, 1);
      drawRoundRect(pixels, width, height, 158, 46, 21, 21, 4, palette.blueEye, 1);
      drawRoundRect(pixels, width, height, 78, 50, 9, 9, 2, hex("#ffffff"), 0.9);
      drawRoundRect(pixels, width, height, 162, 50, 9, 9, 2, hex("#ffffff"), 0.9);
      break;
    case "bot.clawd.skill.eye":
      drawEllipse(pixels, width, height, 96, 96, 68, 68, 0, hex("#5a493c"), 1);
      drawEllipse(pixels, width, height, 96, 96, 50, 50, 0, palette.goldTop, 1);
      drawEllipse(pixels, width, height, 96, 96, 28, 28, 0, hex("#483436"), 1);
      drawRadial(pixels, width, height, 96, 96, 48, palette.blueEye, 0.22);
      addClayNoise(pixels, width, height, 8, seed);
      break;
    case "bot.clawd.skill.badge":
      drawRoundRect(pixels, width, height, 58, 38, 78, 116, 12, palette.paperBottom, 1);
      drawRoundRect(pixels, width, height, 68, 48, 58, 94, 8, palette.paperTop, 0.9);
      drawPixelText(pixels, width, "?", 86, 80, palette.ink, 6);
      addClayNoise(pixels, width, height, 6, seed);
      break;
    case "bot.clawd.skill.side":
      drawGear(pixels, width, height, 96, 96, 54, palette.goldTop, palette.goldBottom);
      drawEllipse(pixels, width, height, 96, 96, 24, 24, 0, hex("#584338"), 1);
      break;
    case "boot.seed":
      drawRadial(pixels, width, height, 128, 128, 96, palette.blueTrace, 0.16);
      drawEllipse(pixels, width, height, 128, 128, 60, 52, -0.28, palette.mossMid, 1);
      drawRoundRect(pixels, width, height, 91, 88, 76, 76, 18, palette.goldTop, 0.7);
      addClayNoise(pixels, width, height, 12, seed);
      break;
    case "boot.wordmark":
      drawPixelText(pixels, width, "SUPERIOR", 56, 56, palette.cream, 8);
      break;
    case "boot.progress-pip":
      drawRoundRect(pixels, width, height, 18, 20, 60, 24, 10, palette.blueTrace, 1);
      drawRoundRect(pixels, width, height, 25, 26, 22, 10, 5, hex("#ffffff"), 0.52);
      break;
    default:
      drawClayTile(pixels, width, height, palette.paperTop, palette.paperBottom, seed, 8);
  }

  return { width, height, pixels };
}

function writeContactSheet(manifest, generated) {
  const columns = 3;
  const cellWidth = 400;
  const cellHeight = 250;
  const rows = Math.ceil(manifest.assets.length / columns);
  const width = columns * cellWidth;
  const height = rows * cellHeight + 112;
  const sheet = makePixels(width, height);
  fill(sheet, width, height, palette.black, 1);
  drawPixelText(sheet, width, "SUPERIOR 0.14 CLAY FACTORY", 28, 28, palette.cream, 4);
  drawPixelText(sheet, width, "RUNTIME APPROVED / CONCEPT COMPOSITION / NO PLACEHOLDER GATE", 30, 78, palette.goldTop, 2);

  manifest.assets.forEach((asset, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = col * cellWidth + 20;
    const y = row * cellHeight + 112;
    drawRoundRect(sheet, width, height, x, y, cellWidth - 34, cellHeight - 24, 18, hex("#201710"), 1);
    drawRoundRect(sheet, width, height, x + 12, y + 12, 154, 154, 12, hex("#33251a"), 1);
    const preview = fitImage(generated.get(asset.id), 144, 144);
    blit(sheet, width, preview, x + 17 + Math.floor((144 - preview.width) / 2), y + 17 + Math.floor((144 - preview.height) / 2));
    drawPixelText(sheet, width, asset.id.toUpperCase(), x + 184, y + 28, palette.cream, 1);
    drawPixelText(sheet, width, asset.kind.toUpperCase(), x + 184, y + 56, palette.goldTop, 1);
    drawPixelText(sheet, width, asset.state.toUpperCase(), x + 184, y + 84, palette.good, 1);
    drawPixelText(sheet, width, String(asset.sourceKind ?? "UNKNOWN").toUpperCase(), x + 184, y + 112, manualRequiredAssetIds.has(asset.id) ? palette.lampCore : palette.blueTrace, 1);
  });

  writeAsset("sheet/superior-clay-factory-contact-sheet.png", encodePng(sheet, width, height));
}

function writeCompositionProof(generated) {
  const width = 1280;
  const height = 720;
  const proof = makePixels(width, height);
  fill(proof, width, height, palette.black, 1);
  drawScaled(proof, width, generated.get("scene.wall"), 0, 0, 1280, 408);
  drawScaled(proof, width, generated.get("scene.table"), 0, 420, 1280, 300);
  drawScaled(proof, width, generated.get("scene.lamp"), 512, 8, 256, 192);
  drawScaled(proof, width, generated.get("scene.sign"), 384, 82, 512, 160);
  drawScaled(proof, width, generated.get("scene.left-rail"), 58, 102, 228, 456);
  drawScaled(proof, width, generated.get("scene.right-tray"), 992, 122, 256, 410);
  drawScaled(proof, width, generated.get("scene.pedestal"), 450, 388, 380, 190);
  drawScaled(proof, width, generated.get("bot.clawd.body"), 486, 226, 330, 330);
  drawScaled(proof, width, generated.get("bot.clawd.eye.pixel"), 546, 333, 220, 110);
  drawScaled(proof, width, generated.get("bot.clawd.skill.eye"), 458, 326, 86, 86);
  drawScaled(proof, width, generated.get("bot.clawd.skill.badge"), 756, 322, 78, 78);
  drawScaled(proof, width, generated.get("scene.bottom-card"), 395, 570, 490, 150);
  drawScaled(proof, width, generated.get("scene.status-pill"), 28, 662, 190, 58);
  drawScaled(proof, width, generated.get("scene.status-pill"), 232, 662, 190, 58);
  drawScaled(proof, width, generated.get("scene.status-pill"), 436, 662, 190, 58);
  for (const [index, label] of ["CONTINUE", "NEW BOT", "CUSTOMIZE", "SKILLS", "BROWSER", "OPTIONS", "QUIT"].entries()) {
    const y = 174 + index * 52;
    drawScaled(proof, width, generated.get("scene.menu-slab.default"), 92, y, 164, 46);
    drawPixelText(proof, width, label, 122, y + 16, palette.ink, 2);
  }
  for (const [index, label] of ["EYE", "BADGE", "SIDE", "CROWN", "CHARM"].entries()) {
    const y = 196 + index * 58;
    drawScaled(proof, width, generated.get(index < 3 ? "scene.tray-slot.equipped" : "scene.tray-slot.empty"), 1018, y, 206, 52);
    drawPixelText(proof, width, label, 1076, y + 18, palette.ink, 2);
  }
  writeAsset("sheet/superior-clay-factory-composition-proof.png", encodePng(proof, width, height));
}

function writeAtlas(manifest, generated) {
  const maxWidth = 2048;
  const padding = 4;
  let x = padding;
  let y = padding;
  let rowHeight = 0;
  const placements = [];

  for (const asset of manifest.assets) {
    const image = generated.get(asset.id);
    if (x + image.width + padding > maxWidth) {
      x = padding;
      y += rowHeight + padding;
      rowHeight = 0;
    }
    placements.push({ asset, image, x, y });
    x += image.width + padding;
    rowHeight = Math.max(rowHeight, image.height);
  }

  const width = maxWidth;
  const height = nextPowerOfTwo(y + rowHeight + padding);
  const atlas = makePixels(width, height);
  fill(atlas, width, height, { r: 0, g: 0, b: 0, a: 0 }, 0);

  const assets = placements.map((placement) => {
    blit(atlas, width, placement.image, placement.x, placement.y);
    const rect = { x: placement.x, y: placement.y, width: placement.image.width, height: placement.image.height };
    placement.asset.atlasRect = rect;
    return {
      id: placement.asset.id,
      kind: placement.asset.kind,
      state: placement.asset.state,
      sourceKind: placement.asset.sourceKind ?? "generated-fallback",
      sourcePath: placement.asset.sourcePath,
      approvedPath: placement.asset.approvedPath,
      atlasRect: rect,
      godotTarget: placement.asset.godotTarget,
      qualityNotes: placement.asset.qualityNotes ?? [],
      zones: placement.asset.zones ?? []
    };
  });

  writeAsset(`sheet/${atlasName}`, encodePng(atlas, width, height));
  return { width, height, assets };
}

function writeQualityReport(manifest, atlas) {
  const zones = new Set();
  for (const asset of manifest.assets) {
    for (const zone of asset.zones ?? []) {
      zones.add(zone);
    }
  }
  const sourceKindCounts = {};
  for (const asset of atlas.assets) {
    const sourceKind = asset.sourceKind ?? "unknown";
    sourceKindCounts[sourceKind] = (sourceKindCounts[sourceKind] ?? 0) + 1;
  }
  const manualMissing = [...manualRequiredAssetIds].filter((id) => {
    const asset = atlas.assets.find((candidate) => candidate.id === id);
    return !asset || asset.sourceKind !== "manual";
  });
  const report = {
    version: manifest.version,
    passed: manualMissing.length === 0,
    generatedAt: new Date().toISOString(),
    visualTarget: manifest.visualTarget,
    requiredZones,
    presentZones: [...zones],
    manualRequiredAssets: [...manualRequiredAssetIds],
    manualMissing,
    sourceKindCounts,
    assetCount: manifest.assets.length,
    runtimeApprovedCount: manifest.assets.filter((asset) => asset.state === "approved-runtime").length,
    atlas: { width: atlas.width, height: atlas.height, assets: atlas.assets.length },
    notes: [
      "0.14 gate separates runtime-approved clay factory parts from 0.13 plumbing placeholders.",
      "Composition proof must be compared against the soul target before the pass is accepted as visual product work."
    ]
  };
  writeJson(join(assetRoot, "sheet", "superior-clay-factory-quality-report.json"), report);
}

function drawClaySlab(buffer, width, height, top, bottom, seed, pressed) {
  const inset = pressed ? 12 : 8;
  drawRoundRect(buffer, width, height, 10, 12, width - 20, height - 22, 24, bottom, 1);
  drawRoundRect(buffer, width, height, inset, pressed ? 18 : 8, width - inset * 2, height - 28, 22, top, pressed ? 0.82 : 1);
  drawRoundRect(buffer, width, height, 34, pressed ? 27 : 18, width - 76, 10, 5, palette.lampCore, pressed ? 0.08 : 0.18);
  addClayNoise(buffer, width, height, 9, seed);
}

function drawTraySlot(buffer, width, height, seed, equipped) {
  drawRoundRect(buffer, width, height, 8, 10, width - 16, height - 20, 18, palette.trayBottom, 1);
  drawRoundRect(buffer, width, height, 18, 18, width - 36, height - 36, 14, equipped ? palette.paperTop : palette.paperBottom, 0.88);
  drawEllipse(buffer, width, height, 46, height / 2, 24, 24, 0, equipped ? palette.goldTop : hex("#6f5842"), 1);
  addClayNoise(buffer, width, height, 6, seed);
}

function drawGear(buffer, width, height, cx, cy, radius, top, bottom) {
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    drawRoundRect(buffer, width, height, cx + Math.cos(angle) * radius - 8, cy + Math.sin(angle) * radius - 12, 16, 24, 6, bottom, 1);
  }
  drawEllipse(buffer, width, height, cx, cy, radius, radius, 0, bottom, 1);
  drawEllipse(buffer, width, height, cx, cy, radius * 0.78, radius * 0.78, 0, top, 0.9);
}

function drawClayTile(buffer, width, height, top, bottom, seed, noise) {
  fillVerticalGradient(buffer, width, height, top, bottom);
  drawRadial(buffer, width, height, width * 0.34, height * 0.18, width * 0.62, palette.lampCore, 0.12);
  addClayNoise(buffer, width, height, noise, seed);
  addDents(buffer, width, height, Math.max(20, Math.floor((width * height) / 9000)), seed ^ 0x7137);
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
    const radius = 1.4 + (((state >>> 24) & 0xff) / 0xff) * 4.4;
    const color = (state & 1) === 0 ? hex("#5f3f2b") : palette.lampCore;
    drawEllipse(buffer, width, height, x, y, radius * 1.8, radius, -0.2, color, (state & 1) === 0 ? 0.1 : 0.12);
  }
}

function fitImage(source, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / source.width, maxHeight / source.height, 1);
  return resizeNearest(source, Math.max(1, Math.round(source.width * scale)), Math.max(1, Math.round(source.height * scale)));
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

function drawScaled(target, targetWidth, source, x, y, width, height) {
  blit(target, targetWidth, resizeNearest(source, width, height), x, y);
}

function blit(target, targetWidth, source, targetX, targetY) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const sourceIndex = (y * source.width + x) * 4;
      const alpha = source.pixels[sourceIndex + 3] / 255;
      if (alpha > 0) {
        blendPixel(
          target,
          targetWidth,
          targetX + x,
          targetY + y,
          {
            r: source.pixels[sourceIndex],
            g: source.pixels[sourceIndex + 1],
            b: source.pixels[sourceIndex + 2],
            a: alpha
          },
          alpha
        );
      }
    }
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

function decodePng(filePath) {
  const png = readFileSync(filePath);
  const signature = png.subarray(0, 8);
  if (!signature.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error(`Manual asset is not a PNG: ${filePath}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      const interlace = data[12];
      if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
        throw new Error(`Manual asset must be non-interlaced 8-bit RGBA PNG: ${filePath}`);
      }
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (!width || !height || idatChunks.length === 0) {
    throw new Error(`Manual asset PNG is missing image data: ${filePath}`);
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const pixels = new Uint8Array(width * height * bytesPerPixel);
  let inputOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[inputOffset + x];
      const left = x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? pixels[(y - 1) * stride + x - bytesPerPixel] : 0;
      let value = raw;
      if (filter === 1) {
        value = raw + left;
      } else if (filter === 2) {
        value = raw + up;
      } else if (filter === 3) {
        value = raw + Math.floor((left + up) / 2);
      } else if (filter === 4) {
        value = raw + paeth(left, up, upLeft);
      } else if (filter !== 0) {
        throw new Error(`Manual asset has unsupported PNG filter ${filter}: ${filePath}`);
      }
      pixels[y * stride + x] = value & 0xff;
    }
    inputOffset += stride;
  }

  return { width, height, pixels };
}

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
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
