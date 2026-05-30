import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import {
  CustomSkillFileSignal,
  CustomSkillImportError,
  CustomSkillImportLanguage,
  CustomSkillImportProposal,
  CustomSkillImportRequest,
  CustomSkillScript,
  SkillCategory,
  SkillSlot
} from "@clawdbot/shared";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out"
]);
const jsTsExtensions = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const maxFileSignals = 96;
const maxDepth = 5;

interface PackageJsonShape {
  name?: string;
  main?: string;
  module?: string;
  bin?: string | Record<string, string>;
  scripts?: Record<string, string>;
}

interface SkillHeuristic {
  slot: SkillSlot;
  category: SkillCategory;
  attachment: string;
  effect: string;
}

export class CustomSkillImportScanError extends Error {
  constructor(
    readonly code: CustomSkillImportError["code"],
    message: string
  ) {
    super(message);
  }
}

export async function proposeCustomSkillImport(request: CustomSkillImportRequest): Promise<CustomSkillImportProposal> {
  const folderPath = request.folderPath.trim();

  if (!folderPath) {
    throw new CustomSkillImportScanError("bad_request", "Drop a JS/TS project folder, not an empty path.");
  }

  const sourceFolder = resolve(folderPath);
  const folderStat = await stat(sourceFolder).catch(() => undefined);

  if (!folderStat) {
    throw new CustomSkillImportScanError("not_found", "That folder does not exist on this machine.");
  }

  if (!folderStat.isDirectory()) {
    throw new CustomSkillImportScanError("bad_request", "Custom skill import expects a folder.");
  }

  const packageJson = await readPackageJson(sourceFolder);
  const fileSignals = await scanFileSignals(sourceFolder);
  const sourceSignals = fileSignals.filter((signal) => signal.kind === "source" || signal.kind === "script");

  if (!packageJson && sourceSignals.length === 0 && !fileSignals.some((signal) => signal.kind === "tsconfig")) {
    throw new CustomSkillImportScanError(
      "unsupported_folder",
      "First custom skill import only accepts JS/TS project folders."
    );
  }

  const language = detectLanguage(fileSignals, packageJson);
  const projectName = readableName(packageJson?.name ?? basename(sourceFolder));
  const suggestedId = slugify(packageJson?.name ?? basename(sourceFolder));
  const heuristic = pickSkillHeuristic(`${projectName} ${sourceSignals.map((signal) => signal.path).join(" ")}`);
  const scripts = packageJson?.scripts ? normalizeScripts(packageJson.scripts) : [];
  const entrypoints = collectEntrypoints(packageJson, sourceSignals);
  const warnings = collectWarnings(packageJson, fileSignals, scripts);

  return {
    type: "custom-skill-import-proposal",
    requestId: request.requestId,
    sourceFolder,
    projectName,
    ...(packageJson?.name ? { packageName: packageJson.name } : {}),
    language,
    suggestedSkill: {
      id: suggestedId,
      label: projectName,
      slot: heuristic.slot,
      category: heuristic.category,
      attachment: heuristic.attachment,
      effect: heuristic.effect
    },
    scripts,
    entrypoints,
    fileSignals,
    warnings,
    nextSteps: [
      "Review the proposed slot and effect.",
      "Choose one smoke command from package scripts.",
      "Run the adapter locally before the part appears in the loadout."
    ],
    createdAt: new Date().toISOString()
  };
}

async function readPackageJson(sourceFolder: string): Promise<PackageJsonShape | null> {
  try {
    const rawPackage = await readFile(join(sourceFolder, "package.json"), "utf8");
    return JSON.parse(rawPackage) as PackageJsonShape;
  } catch {
    return null;
  }
}

async function scanFileSignals(sourceFolder: string): Promise<CustomSkillFileSignal[]> {
  const signals: CustomSkillFileSignal[] = [];

  async function walk(currentFolder: string, depth: number): Promise<void> {
    if (depth > maxDepth || signals.length >= maxFileSignals) {
      return;
    }

    const entries = await readdir(currentFolder, {
      withFileTypes: true
    });

    for (const entry of entries) {
      if (signals.length >= maxFileSignals) {
        return;
      }

      if (entry.isSymbolicLink()) {
        continue;
      }

      const fullPath = join(currentFolder, entry.name);
      const relativePath = toPortablePath(relative(sourceFolder, fullPath));

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) {
          await walk(fullPath, depth + 1);
        }

        continue;
      }

      const signal = classifyFile(relativePath);

      if (signal) {
        signals.push(signal);
      }
    }
  }

  await walk(sourceFolder, 0);

  return sortSignals(signals);
}

function classifyFile(path: string): CustomSkillFileSignal | null {
  const fileName = basename(path);
  const extension = extname(fileName);

  if (fileName === "package.json") {
    return {
      path,
      kind: "package-json"
    };
  }

  if (/^tsconfig.*\.json$/i.test(fileName)) {
    return {
      path,
      kind: "tsconfig",
      language: "typescript"
    };
  }

  if (/^(vite|vitest|jest|playwright|eslint|prettier)\.config\.[cm]?[jt]s$/i.test(fileName)) {
    return {
      path,
      kind: fileName.includes("test") || fileName.includes("playwright") || fileName.includes("jest") ? "test" : "config",
      language: languageFromExtension(extension)
    };
  }

  if (!jsTsExtensions.has(extension)) {
    return null;
  }

  if (path.includes("/scripts/") || path.startsWith("scripts/")) {
    return {
      path,
      kind: "script",
      language: languageFromExtension(extension)
    };
  }

  if (/\.(test|spec)\.[cm]?[jt]sx?$/i.test(fileName) || path.includes("/__tests__/")) {
    return {
      path,
      kind: "test",
      language: languageFromExtension(extension)
    };
  }

  return {
    path,
    kind: "source",
    language: languageFromExtension(extension)
  };
}

function detectLanguage(
  fileSignals: CustomSkillFileSignal[],
  packageJson: PackageJsonShape | null
): CustomSkillImportLanguage {
  const languages = new Set(fileSignals.map((signal) => signal.language).filter(Boolean));

  if (languages.has("typescript") && languages.has("javascript")) {
    return "mixed-js-ts";
  }

  if (languages.has("typescript")) {
    return "typescript";
  }

  if (packageJson?.scripts && Object.values(packageJson.scripts).some((script) => /\btsx\b|\bts-node\b/.test(script))) {
    return "typescript";
  }

  return "javascript";
}

function normalizeScripts(scripts: Record<string, string>): CustomSkillScript[] {
  return Object.entries(scripts)
    .slice(0, 12)
    .map(([name, command]) => ({
      name,
      command
    }));
}

function collectEntrypoints(
  packageJson: PackageJsonShape | null,
  sourceSignals: CustomSkillFileSignal[]
): string[] {
  const entrypoints = new Set<string>();

  if (packageJson?.main) {
    entrypoints.add(packageJson.main);
  }

  if (packageJson?.module) {
    entrypoints.add(packageJson.module);
  }

  if (typeof packageJson?.bin === "string") {
    entrypoints.add(packageJson.bin);
  } else if (packageJson?.bin) {
    Object.values(packageJson.bin).forEach((entrypoint) => entrypoints.add(entrypoint));
  }

  sourceSignals
    .filter((signal) => /(^|\/)(index|main|server|app|cli)\.[cm]?[jt]sx?$/.test(signal.path))
    .slice(0, 6)
    .forEach((signal) => entrypoints.add(signal.path));

  return [...entrypoints].slice(0, 8);
}

function collectWarnings(
  packageJson: PackageJsonShape | null,
  fileSignals: CustomSkillFileSignal[],
  scripts: CustomSkillScript[]
): string[] {
  const warnings: string[] = [];

  if (!packageJson) {
    warnings.push("No package.json found; adapter setup will need a manual command.");
  }

  if (scripts.length === 0) {
    warnings.push("No package scripts found; smoke testing needs a manual command.");
  }

  if (!fileSignals.some((signal) => signal.kind === "test")) {
    warnings.push("No test files or test config found in the first scan.");
  }

  if (fileSignals.length >= maxFileSignals) {
    warnings.push("Scan hit the file signal cap; adapter review should inspect the folder manually.");
  }

  return warnings;
}

function pickSkillHeuristic(text: string): SkillHeuristic {
  const haystack = text.toLowerCase();

  if (/(scrape|crawler|crawl|article|extract|readability|defuddle|feed)/.test(haystack)) {
    return {
      slot: "eye",
      category: "extract",
      attachment: "Custom clay lens",
      effect: "Extracts page signal."
    };
  }

  if (/(detect|scan|pattern|risk|dark|guard|audit)/.test(haystack)) {
    return {
      slot: "badge",
      category: "detect",
      attachment: "Custom clay stamp",
      effect: "Marks page risk."
    };
  }

  if (/(watch|monitor|alert|change|sentinel)/.test(haystack)) {
    return {
      slot: "charm",
      category: "monitor",
      attachment: "Custom clay alarm bead",
      effect: "Watches for changes."
    };
  }

  if (/(predict|forecast|pulse|market|lane|sup)/.test(haystack)) {
    return {
      slot: "side",
      category: "predict",
      attachment: "Custom clay side coin",
      effect: "Reads the lane."
    };
  }

  if (/(explain|summary|summarize|brief)/.test(haystack)) {
    return {
      slot: "badge",
      category: "explain",
      attachment: "Custom clay paper tab",
      effect: "Explains the page."
    };
  }

  return {
    slot: "side",
    category: "work",
    attachment: "Custom clay gear",
    effect: "Runs a local tool."
  };
}

function languageFromExtension(extension: string): CustomSkillImportLanguage {
  return extension.includes("ts") ? "typescript" : "javascript";
}

function readableName(name: string): string {
  const scopedName = name.split("/").pop() ?? name;

  return scopedName
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function slugify(name: string): string {
  const scopedName = name.split("/").pop() ?? name;
  const slug = scopedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || "custom-js-ts-skill";
}

function sortSignals(signals: CustomSkillFileSignal[]): CustomSkillFileSignal[] {
  const kindWeight: Record<CustomSkillFileSignal["kind"], number> = {
    "package-json": 0,
    tsconfig: 1,
    config: 2,
    script: 3,
    source: 4,
    test: 5
  };

  return signals.sort((left, right) => kindWeight[left.kind] - kindWeight[right.kind] || left.path.localeCompare(right.path));
}

function toPortablePath(path: string): string {
  return sep === "/" ? path : path.replaceAll(sep, "/");
}
