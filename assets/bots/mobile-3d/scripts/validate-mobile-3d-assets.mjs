import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const assetRoot = resolve(scriptDir, "..");
const manifestPath = join(assetRoot, "asset-manifest.json");
const reportPath = join(assetRoot, "generated", "mobile-3d-validation-report.json");

const manifest = readJson(manifestPath);
const failures = [];
const assets = [];

if (manifest.format?.shipping !== "glb") {
  failures.push("Mobile 3D shelf must ship GLB assets.");
}

if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
  failures.push("Mobile 3D manifest must define at least one asset.");
}

for (const asset of manifest.assets ?? []) {
  const assetPath = join(assetRoot, asset.runtime);
  if (!asset.runtime?.endsWith(".glb")) {
    failures.push(`${asset.id} must point to a .glb runtime asset.`);
    continue;
  }
  if (!existsSync(assetPath)) {
    failures.push(`${asset.id} is missing: ${asset.runtime}. Run corepack pnpm assets:mobile-3d-generate.`);
    continue;
  }

  const parsed = parseGlb(assetPath);
  const triangleCount = countTriangles(parsed.json);
  const nodeNames = new Set((parsed.json.nodes ?? []).map((node) => node.name).filter(Boolean));
  const missingNodes = (manifest.requiredNodeNames ?? []).filter((nodeName) => !nodeNames.has(nodeName));

  if (parsed.fileBytes > manifest.budgets.maxGlbBytes) {
    failures.push(`${asset.id} is too large: ${parsed.fileBytes} > ${manifest.budgets.maxGlbBytes} bytes.`);
  }
  if (triangleCount > manifest.budgets.maxTriangles) {
    failures.push(`${asset.id} has too many triangles: ${triangleCount} > ${manifest.budgets.maxTriangles}.`);
  }
  if ((parsed.json.materials ?? []).length > manifest.budgets.maxMaterials) {
    failures.push(`${asset.id} has too many materials: ${(parsed.json.materials ?? []).length} > ${manifest.budgets.maxMaterials}.`);
  }
  if ((parsed.json.nodes ?? []).length > manifest.budgets.maxNodes) {
    failures.push(`${asset.id} has too many nodes: ${(parsed.json.nodes ?? []).length} > ${manifest.budgets.maxNodes}.`);
  }
  if (missingNodes.length > 0) {
    failures.push(`${asset.id} is missing required named nodes: ${missingNodes.join(", ")}.`);
  }
  if ((parsed.json.images ?? []).some((image) => image.uri)) {
    failures.push(`${asset.id} contains external image URIs; alpha mobile GLBs must be self-contained.`);
  }

  assets.push({
    id: asset.id,
    runtime: asset.runtime,
    fileBytes: parsed.fileBytes,
    triangleCount,
    nodeCount: (parsed.json.nodes ?? []).length,
    materialCount: (parsed.json.materials ?? []).length,
    namedNodes: [...nodeNames]
  });
}

const report = {
  validatedAt: new Date().toISOString(),
  manifestVersion: manifest.version,
  passed: failures.length === 0,
  failures,
  assets
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error(`SUPERIOR mobile 3D asset validation failed.`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`SUPERIOR mobile 3D asset validation passed.`);
for (const asset of assets) {
  console.log(`${asset.id}: ${asset.triangleCount} triangles, ${asset.fileBytes} bytes`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseGlb(path) {
  const buffer = readFileSync(path);
  if (buffer.readUInt32LE(0) !== 0x46546c67) {
    throw new Error(`${path} is not a GLB file.`);
  }
  if (buffer.readUInt32LE(4) !== 2) {
    throw new Error(`${path} is not GLB version 2.`);
  }

  let offset = 12;
  let json = null;
  while (offset < buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkType === 0x4e4f534a) {
      json = JSON.parse(buffer.subarray(chunkStart, chunkEnd).toString("utf8").trim());
      break;
    }
    offset = chunkEnd;
  }

  if (!json) {
    throw new Error(`${path} does not contain a JSON chunk.`);
  }
  if (json.asset?.version !== "2.0") {
    throw new Error(`${path} is not glTF 2.0.`);
  }

  return { fileBytes: buffer.byteLength, json };
}

function countTriangles(json) {
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const indexAccessor = json.accessors?.[primitive.indices];
      if (primitive.mode === 4 && indexAccessor?.count) {
        triangles += indexAccessor.count / 3;
      }
    }
  }
  return triangles;
}
