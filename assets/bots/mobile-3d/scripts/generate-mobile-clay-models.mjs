import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const assetRoot = resolve(scriptDir, "..");
const manifestPath = join(assetRoot, "asset-manifest.json");
const outputDir = join(assetRoot, "generated");
const outputGlbPath = join(outputDir, "mobile-clawd-gremlin.glb");
const reportPath = join(outputDir, "mobile-3d-quality-report.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const materials = [
  clayMaterial("Moss_Green_Clay", [0.38, 0.52, 0.28, 1]),
  clayMaterial("Moss_Green_Shadow_Clay", [0.24, 0.34, 0.19, 1]),
  clayMaterial("Pixel_Eye_Dark", [0.08, 0.07, 0.06, 1]),
  clayMaterial("Warm_Lens_Clay", [0.86, 0.78, 0.62, 1]),
  clayMaterial("Repo_Gear_Clay", [0.78, 0.58, 0.29, 1]),
  clayMaterial("Soft_Highlight", [0.92, 0.86, 0.72, 1])
];

const parts = [
  {
    nodeName: "Body_Gremlin",
    meshName: "Body_Gremlin_MatteClay",
    material: 0,
    geometry: createEllipsoid({
      center: [0, 0, 0],
      radius: [0.72, 0.58, 0.64],
      latSegments: 8,
      lonSegments: 14,
      wobble: 0.045
    })
  },
  {
    nodeName: "Eye_Left_Pixel",
    meshName: "Eye_Left_Pixel_Block",
    material: 2,
    geometry: createBox([-0.27, 0.1, 0.61], [0.13, 0.13, 0.05])
  },
  {
    nodeName: "Eye_Right_Pixel",
    meshName: "Eye_Right_Pixel_Block",
    material: 2,
    geometry: createBox([0.23, 0.09, 0.61], [0.13, 0.13, 0.05])
  },
  {
    nodeName: "Antenna_Left",
    meshName: "Antenna_Left_BentClay",
    material: 1,
    geometry: createBox([-0.32, 0.66, 0.02], [0.08, 0.42, 0.08], -0.28)
  },
  {
    nodeName: "Antenna_Right",
    meshName: "Antenna_Right_BentClay",
    material: 1,
    geometry: createBox([0.3, 0.68, 0.02], [0.08, 0.38, 0.08], 0.24)
  },
  {
    nodeName: "Skill_ArticleXray_Lens",
    meshName: "Skill_ArticleXray_LensRing",
    material: 3,
    geometry: createTorus({
      center: [-0.49, 0.02, 0.6],
      majorRadius: 0.16,
      minorRadius: 0.035,
      radialSegments: 12,
      tubeSegments: 6
    })
  },
  {
    nodeName: "Skill_RepoReader_Gear",
    meshName: "Skill_RepoReader_SideGear",
    material: 4,
    geometry: createGear({
      center: [0.66, -0.03, 0.28],
      radius: 0.16,
      depth: 0.08,
      teeth: 8
    })
  },
  {
    nodeName: "Clay_Fingerprint_Highlight",
    meshName: "Clay_Fingerprint_Highlight",
    material: 5,
    geometry: createBox([-0.2, 0.29, 0.61], [0.28, 0.045, 0.018], -0.22)
  }
];

mkdirSync(outputDir, { recursive: true });

const { glb, stats } = buildGlb(parts, materials);
writeFileSync(outputGlbPath, glb);

const report = {
  generatedAt: new Date().toISOString(),
  manifestVersion: manifest.version,
  assetId: "mobile-clawd-gremlin",
  output: "assets/bots/mobile-3d/generated/mobile-clawd-gremlin.glb",
  fileBytes: glb.byteLength,
  triangleCount: stats.triangleCount,
  nodeCount: parts.length,
  materialCount: materials.length,
  requiredNodeNames: manifest.requiredNodeNames,
  budget: manifest.budgets,
  passed: glb.byteLength <= manifest.budgets.maxGlbBytes &&
    stats.triangleCount <= manifest.budgets.maxTriangles &&
    parts.length <= manifest.budgets.maxNodes &&
    materials.length <= manifest.budgets.maxMaterials,
  checks: {
    glbMagic: "glTF",
    format: "glTF 2.0 binary",
    externalTextures: 0,
    namedNodes: parts.map((part) => part.nodeName),
    coordinateSystem: manifest.coordinateSystem
  }
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Generated ${report.output}`);
console.log(`Mobile 3D asset report: ${report.triangleCount} triangles, ${report.fileBytes} bytes`);

function clayMaterial(name, baseColorFactor) {
  return {
    name,
    pbrMetallicRoughness: {
      baseColorFactor,
      metallicFactor: 0,
      roughnessFactor: 0.96
    }
  };
}

function buildGlb(modelParts, modelMaterials) {
  const chunks = [];
  const accessors = [];
  const bufferViews = [];
  const meshes = [];
  const nodes = [];
  let byteOffset = 0;
  let triangleCount = 0;

  for (const part of modelParts) {
    const meshIndex = meshes.length;
    const positionAccessor = addBufferData(part.geometry.positions, "VEC3", 5126);
    const normalAccessor = addBufferData(part.geometry.normals, "VEC3", 5126);
    const indexAccessor = addBufferData(part.geometry.indices, "SCALAR", 5123);
    triangleCount += part.geometry.indices.length / 3;
    meshes.push({
      name: part.meshName,
      primitives: [
        {
          attributes: {
            POSITION: positionAccessor,
            NORMAL: normalAccessor
          },
          indices: indexAccessor,
          material: part.material,
          mode: 4
        }
      ]
    });
    nodes.push({ name: part.nodeName, mesh: meshIndex });
  }

  const binBuffer = Buffer.concat(chunks);
  const json = {
    asset: {
      version: "2.0",
      generator: "SUPERIOR mobile clay GLB generator"
    },
    scene: 0,
    scenes: [{ name: "Mobile_Clawd_Gremlin_Scene", nodes: nodes.map((_, index) => index) }],
    nodes,
    meshes,
    materials: modelMaterials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binBuffer.byteLength }],
    extras: {
      superiorAssetShelf: "assets/bots/mobile-3d",
      identity: manifest.sourceIdentity,
      budget: manifest.budgets
    }
  };

  const jsonChunk = padBuffer(Buffer.from(JSON.stringify(json), "utf8"), 0x20);
  const binChunk = padBuffer(binBuffer, 0x00);
  const totalLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const glb = Buffer.alloc(totalLength);
  let offset = 0;
  glb.writeUInt32LE(0x46546c67, offset);
  offset += 4;
  glb.writeUInt32LE(2, offset);
  offset += 4;
  glb.writeUInt32LE(totalLength, offset);
  offset += 4;
  glb.writeUInt32LE(jsonChunk.length, offset);
  offset += 4;
  glb.writeUInt32LE(0x4e4f534a, offset);
  offset += 4;
  jsonChunk.copy(glb, offset);
  offset += jsonChunk.length;
  glb.writeUInt32LE(binChunk.length, offset);
  offset += 4;
  glb.writeUInt32LE(0x004e4942, offset);
  offset += 4;
  binChunk.copy(glb, offset);

  return { glb, stats: { triangleCount } };

  function addBufferData(array, type, componentType) {
    const data = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const padded = padBuffer(data, 0x00);
    const viewIndex = bufferViews.length;
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: data.byteLength
    });
    chunks.push(padded);
    byteOffset += padded.length;

    const accessor = {
      bufferView: viewIndex,
      componentType,
      count: type === "SCALAR" ? array.length : array.length / 3,
      type
    };

    if (type === "VEC3") {
      const bounds = computeBounds(array);
      accessor.min = bounds.min;
      accessor.max = bounds.max;
    }

    const accessorIndex = accessors.length;
    accessors.push(accessor);
    return accessorIndex;
  }
}

function createEllipsoid({ center, radius, latSegments, lonSegments, wobble }) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let lat = 0; lat <= latSegments; lat += 1) {
    const theta = (lat / latSegments) * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= lonSegments; lon += 1) {
      const phi = (lon / lonSegments) * Math.PI * 2;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const handmade = 1 + Math.sin(lon * 1.7 + lat * 0.9) * wobble;
      const nx = cosPhi * sinTheta;
      const ny = cosTheta;
      const nz = sinPhi * sinTheta;
      positions.push(
        center[0] + nx * radius[0] * handmade,
        center[1] + ny * radius[1] * (1 + Math.sin(lon * 0.6) * wobble * 0.4),
        center[2] + nz * radius[2] * handmade
      );
      normals.push(...normalize([nx / radius[0], ny / radius[1], nz / radius[2]]));
    }
  }

  const stride = lonSegments + 1;
  for (let lat = 0; lat < latSegments; lat += 1) {
    for (let lon = 0; lon < lonSegments; lon += 1) {
      const a = lat * stride + lon;
      const b = a + stride;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return toTypedGeometry(positions, normals, indices);
}

function createBox(center, size, zRotation = 0) {
  const [sx, sy, sz] = size.map((value) => value / 2);
  const vertices = [
    [-sx, -sy, sz], [sx, -sy, sz], [sx, sy, sz], [-sx, sy, sz],
    [sx, -sy, -sz], [-sx, -sy, -sz], [-sx, sy, -sz], [sx, sy, -sz],
    [-sx, sy, sz], [sx, sy, sz], [sx, sy, -sz], [-sx, sy, -sz],
    [-sx, -sy, -sz], [sx, -sy, -sz], [sx, -sy, sz], [-sx, -sy, sz],
    [sx, -sy, sz], [sx, -sy, -sz], [sx, sy, -sz], [sx, sy, sz],
    [-sx, -sy, -sz], [-sx, -sy, sz], [-sx, sy, sz], [-sx, sy, -sz]
  ];
  const normalsByFace = [
    [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]
  ];
  const positions = [];
  const normals = [];
  const indices = [];

  for (let face = 0; face < 6; face += 1) {
    for (let point = 0; point < 4; point += 1) {
      const rotated = rotateZ(vertices[face * 4 + point], zRotation);
      positions.push(rotated[0] + center[0], rotated[1] + center[1], rotated[2] + center[2]);
      normals.push(...rotateZ(normalsByFace[face], zRotation));
    }
    const base = face * 4;
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  return toTypedGeometry(positions, normals, indices);
}

function createTorus({ center, majorRadius, minorRadius, radialSegments, tubeSegments }) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let radial = 0; radial <= radialSegments; radial += 1) {
    const u = (radial / radialSegments) * Math.PI * 2;
    for (let tube = 0; tube <= tubeSegments; tube += 1) {
      const v = (tube / tubeSegments) * Math.PI * 2;
      const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u);
      const y = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u);
      const z = minorRadius * Math.sin(v);
      positions.push(center[0] + x, center[1] + y, center[2] + z);
      normals.push(...normalize([Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)]));
    }
  }

  const stride = tubeSegments + 1;
  for (let radial = 0; radial < radialSegments; radial += 1) {
    for (let tube = 0; tube < tubeSegments; tube += 1) {
      const a = radial * stride + tube;
      const b = a + stride;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  return toTypedGeometry(positions, normals, indices);
}

function createGear({ center, radius, depth, teeth }) {
  const positions = [];
  const normals = [];
  const indices = [];
  const frontZ = center[2] + depth / 2;
  const backZ = center[2] - depth / 2;

  positions.push(center[0], center[1], frontZ, center[0], center[1], backZ);
  normals.push(0, 0, 1, 0, 0, -1);

  for (let i = 0; i < teeth * 2; i += 1) {
    const angle = (i / (teeth * 2)) * Math.PI * 2;
    const toothRadius = radius * (i % 2 === 0 ? 1.18 : 0.88);
    const x = center[0] + Math.cos(angle) * toothRadius;
    const y = center[1] + Math.sin(angle) * toothRadius;
    positions.push(x, y, frontZ, x, y, backZ);
    normals.push(0, 0, 1, 0, 0, -1);
  }

  for (let i = 0; i < teeth * 2; i += 1) {
    const next = (i + 1) % (teeth * 2);
    const front = 2 + i * 2;
    const back = front + 1;
    const nextFront = 2 + next * 2;
    const nextBack = nextFront + 1;
    indices.push(0, front, nextFront);
    indices.push(1, nextBack, back);
    indices.push(front, back, nextBack, front, nextBack, nextFront);
  }

  return toTypedGeometry(positions, normals, indices);
}

function toTypedGeometry(positions, normals, indices) {
  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices)
  };
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return vector.map((value) => value / length);
}

function rotateZ(point, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [
    point[0] * cos - point[1] * sin,
    point[0] * sin + point[1] * cos,
    point[2]
  ];
}

function computeBounds(array) {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let i = 0; i < array.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], array[i + axis]);
      max[axis] = Math.max(max[axis], array[i + axis]);
    }
  }
  return { min, max };
}

function padBuffer(buffer, byte) {
  const remainder = buffer.length % 4;
  if (remainder === 0) {
    return buffer;
  }
  return Buffer.concat([buffer, Buffer.alloc(4 - remainder, byte)]);
}
