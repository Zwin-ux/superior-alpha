import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import {
  GameTarget,
  GameTargetImportRequest,
  GameTargetImportResult,
  GameTargetsResponse,
  createLocalId
} from "@clawdbot/shared";
import { getSuperiorStateDirectory } from "./localPaths.js";
import { findDefaultSteamRoot, findSteamAppInstall } from "./steamLibrary.js";

interface StoredGameTargetsFile {
  type: "game-targets-store";
  items: GameTarget[];
  updatedAt: string;
}

const gameTargetFolderName = "game-targets";
const gameTargetFileName = "targets.json";
const fixtureGameTargetId = "superior-fixture-game";
const gmodGameTargetId = "gmod-sandbox";

export class GameTargetStoreError extends Error {
  constructor(
    readonly code: "bad_request" | "missing_exe",
    message: string
  ) {
    super(message);
  }
}

export function readGameTargets(): GameTargetsResponse {
  const builtinTargets = [createFixtureTarget(), createGmodTarget()];
  const importedTargets = readImportedGameTargets();
  const deduped = [...builtinTargets, ...importedTargets.filter((target) => !builtinTargets.some((item) => item.id === target.id))];

  return {
    type: "game-targets",
    items: deduped,
    storage: {
      localOnly: true,
      statePath: getGameTargetsStoragePath(),
      excludes: ["Supabase sync", "screenshots", "raw frames", "input logs", "OpenAI API keys"]
    },
    createdAt: new Date().toISOString()
  };
}

export function readGameTarget(targetId: string): GameTarget | null {
  return readGameTargets().items.find((target) => target.id === targetId) ?? null;
}

export function importGameTarget(request: GameTargetImportRequest): GameTargetImportResult {
  const executablePath = normalizeExecutablePath(request.executablePath);
  const now = new Date().toISOString();
  const label = sanitizeTargetLabel(request.label) ?? (basename(executablePath, extname(executablePath)) || "Local Game");
  const target: GameTarget = {
    type: "game-target",
    id: createImportedTargetId(executablePath),
    kind: "exe",
    label,
    executablePath,
    workingDirectory: dirname(executablePath),
    ...(request.launchArgs?.length ? { launchArgs: request.launchArgs.map(String).slice(0, 12) } : {}),
    status: existsSync(executablePath) ? "ready" : "missing",
    detail: existsSync(executablePath) ? "local EXE imported" : "Locate EXE before launch",
    safetyBadge: "local-only",
    importedAt: now,
    updatedAt: now
  };
  const importedTargets = readImportedGameTargets().filter((item) => item.id !== target.id);

  writeImportedGameTargets([...importedTargets, target]);

  return {
    type: "game-target-import-result",
    requestId: request.requestId,
    target,
    targets: readGameTargets(),
    createdAt: now
  };
}

export function getFixtureGameTargetId(): string {
  return fixtureGameTargetId;
}

export function getGameTargetsStoragePath(): string {
  return join(getSuperiorStateDirectory(), gameTargetFolderName, gameTargetFileName);
}

function readImportedGameTargets(): GameTarget[] {
  const storePath = getGameTargetsStoragePath();

  if (!existsSync(storePath)) {
    return [];
  }

  try {
    const payload = JSON.parse(readFileSync(storePath, "utf8")) as Partial<StoredGameTargetsFile>;
    const items = Array.isArray(payload.items) ? payload.items : [];

    return items.filter(isStoredGameTarget).map((target) => ({
      ...target,
      status: target.executablePath && existsSync(target.executablePath) ? target.status : "missing",
      detail: target.executablePath && existsSync(target.executablePath) ? target.detail : "Locate EXE before launch"
    }));
  } catch {
    return [];
  }
}

function writeImportedGameTargets(items: GameTarget[]): void {
  const storePath = getGameTargetsStoragePath();

  mkdirSync(dirname(storePath), {
    recursive: true
  });
  writeFileSync(
    storePath,
    JSON.stringify(
      {
        type: "game-targets-store",
        items,
        updatedAt: new Date().toISOString()
      } satisfies StoredGameTargetsFile,
      null,
      2
    ),
    "utf8"
  );
}

function createFixtureTarget(): GameTarget {
  const now = new Date(0).toISOString();

  return {
    type: "game-target",
    id: fixtureGameTargetId,
    kind: "fixture",
    label: "Fixture Cartridge",
    status: "ready",
    detail: "deterministic local proof game",
    safetyBadge: "private-local-proof",
    importedAt: now,
    updatedAt: now
  };
}

function createGmodTarget(): GameTarget {
  const now = new Date(0).toISOString();
  const steamRoot = findDefaultSteamRoot();
  const install = findSteamAppInstall("4000", steamRoot ?? undefined);
  const steamExePath = steamRoot ? join(steamRoot, "steam.exe") : undefined;
  const gmodExecutablePath = install ? join(install.libraryPath, "steamapps", "common", install.installDir, "hl2.exe") : undefined;

  if (install && steamRoot && steamExePath && existsSync(steamExePath)) {
    return {
      type: "game-target",
      id: gmodGameTargetId,
      kind: "steam",
      label: "GMOD Sandbox",
      executablePath: steamExePath,
      workingDirectory: steamRoot,
      launchArgs: ["-applaunch", "4000"],
      steamAppId: "4000",
      status: "ready",
      detail: gmodExecutablePath && existsSync(gmodExecutablePath) ? "Steam app 4000 detected" : "Steam manifest detected",
      safetyBadge: "private-local-proof",
      importedAt: now,
      updatedAt: now
    };
  }

  return {
    type: "game-target",
    id: gmodGameTargetId,
    kind: "steam",
    label: "GMOD Sandbox",
    steamAppId: "4000",
    status: "missing",
    detail: "Install or locate GMOD",
    safetyBadge: "private-local-proof",
    importedAt: now,
    updatedAt: now
  };
}

function normalizeExecutablePath(value: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new GameTargetStoreError("bad_request", "Choose a local EXE to import.");
  }

  const executablePath = resolve(value.trim().replace(/^"|"$/g, ""));

  if (extname(executablePath).toLowerCase() !== ".exe") {
    throw new GameTargetStoreError("bad_request", "Game Rig imports Windows .exe targets only.");
  }

  if (!existsSync(executablePath)) {
    throw new GameTargetStoreError("missing_exe", "That EXE path does not exist.");
  }

  return executablePath;
}

function sanitizeTargetLabel(value: string | undefined): string | undefined {
  const label = value?.trim();

  return label ? label.slice(0, 80) : undefined;
}

function createImportedTargetId(executablePath: string): string {
  const digest = createHash("sha256").update(executablePath.toLowerCase()).digest("hex").slice(0, 12);

  return `game_${digest || createLocalId("game")}`;
}

function isStoredGameTarget(value: unknown): value is GameTarget {
  const target = value as Partial<GameTarget>;

  return (
    typeof target === "object" &&
    target !== null &&
    target.type === "game-target" &&
    target.kind === "exe" &&
    typeof target.id === "string" &&
    typeof target.label === "string" &&
    typeof target.executablePath === "string" &&
    typeof target.importedAt === "string" &&
    typeof target.updatedAt === "string"
  );
}
