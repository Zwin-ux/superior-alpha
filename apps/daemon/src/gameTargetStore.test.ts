import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGameTargetImportRequest } from "@clawdbot/shared";
import {
  GameTargetStoreError,
  getFixtureGameTargetId,
  importGameTarget,
  readGameTargets
} from "./gameTargetStore.js";

let testRoot = "";
const previousStateDirectory = process.env.CLAWDBOT_STATE_DIR;
const previousSteamPath = process.env.SUPERIOR_STEAM_PATH;
const previousProgramFiles = process.env.ProgramFiles;
const previousProgramFilesX86 = process.env["ProgramFiles(x86)"];
const previousLocalAppData = process.env.LOCALAPPDATA;

beforeEach(() => {
  testRoot = join(tmpdir(), `superior-game-targets-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(testRoot, {
    recursive: true
  });
  process.env.CLAWDBOT_STATE_DIR = join(testRoot, "state");
  process.env.SUPERIOR_STEAM_PATH = join(testRoot, "missing-steam");
  process.env.ProgramFiles = join(testRoot, "Program Files");
  process.env["ProgramFiles(x86)"] = join(testRoot, "Program Files x86");
  process.env.LOCALAPPDATA = join(testRoot, "LocalAppData");
});

afterEach(() => {
  rmSync(testRoot, {
    recursive: true,
    force: true
  });
  restoreEnv("CLAWDBOT_STATE_DIR", previousStateDirectory);
  restoreEnv("SUPERIOR_STEAM_PATH", previousSteamPath);
  restoreEnv("ProgramFiles", previousProgramFiles);
  restoreEnv("ProgramFiles(x86)", previousProgramFilesX86);
  restoreEnv("LOCALAPPDATA", previousLocalAppData);
});

describe("Game Rig target store", () => {
  it("returns fixture and GMOD profile without syncing local paths", () => {
    const targets = readGameTargets();
    const fixture = targets.items.find((target) => target.id === getFixtureGameTargetId());
    const gmod = targets.items.find((target) => target.id === "gmod-sandbox");

    expect(fixture?.status).toBe("ready");
    expect(fixture?.safetyBadge).toBe("private-local-proof");
    expect(gmod?.status).toBe("missing");
    expect(gmod?.detail).toBe("Install or locate GMOD");
    expect(targets.storage.localOnly).toBe(true);
    expect(targets.storage.excludes).toContain("screenshots");
    expect(targets.storage.excludes).toContain("Supabase sync");
  });

  it("imports an existing local EXE under local state only", () => {
    const gamePath = join(testRoot, "games", "Clay Kart.exe");

    mkdirSync(join(testRoot, "games"), {
      recursive: true
    });
    writeFileSync(gamePath, "", "utf8");

    const result = importGameTarget(
      createGameTargetImportRequest({
        executablePath: gamePath,
        label: "Clay Kart"
      })
    );

    expect(result.target.kind).toBe("exe");
    expect(result.target.label).toBe("Clay Kart");
    expect(result.target.status).toBe("ready");
    expect(result.targets.items.some((target) => target.id === result.target.id)).toBe(true);
    expect(result.targets.storage.statePath).toContain("game-targets");
  });

  it("rejects non-EXE imports", () => {
    expect(() =>
      importGameTarget(
        createGameTargetImportRequest({
          executablePath: join(testRoot, "game.txt")
        })
      )
    ).toThrow(GameTargetStoreError);
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
