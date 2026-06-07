import { ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { GameAction, GameObservation, GameTarget } from "@clawdbot/shared";
import { findUpDirectory } from "./localPaths.js";

export interface OwnedGameProcess {
  child: ChildProcess;
  processId?: number;
  launchLabel: string;
}

export class GameRigSidecarError extends Error {
  constructor(
    readonly code: "missing_exe" | "launch_failed" | "capture_blocked" | "focus_lost" | "invalid_action",
    message: string
  ) {
    super(message);
  }
}

export async function launchOwnedGameProcess(target: GameTarget): Promise<OwnedGameProcess> {
  if (target.kind === "fixture") {
    return launchFixtureGame();
  }

  if (process.platform !== "win32") {
    throw new GameRigSidecarError("launch_failed", "Game Rig EXE control is Windows-only.");
  }

  if (!target.executablePath || !existsSync(target.executablePath)) {
    throw new GameRigSidecarError("missing_exe", "Locate this EXE before starting Game Rig.");
  }

  const child = spawn(target.executablePath, target.launchArgs ?? [], {
    cwd: target.workingDirectory,
    stdio: "ignore",
    detached: false,
    windowsHide: false
  });

  child.unref();

  return {
    child,
    ...(child.pid ? { processId: child.pid } : {}),
    launchLabel: `${target.label} launched`
  };
}

export async function observeOwnedGame(target: GameTarget, processId: number | undefined): Promise<GameObservation> {
  const now = new Date().toISOString();

  if (target.kind === "fixture") {
    return {
      type: "game-observation",
      observedAt: now,
      source: "fixture",
      foregroundOwned: true,
      framePersisted: false,
      summary: processId ? "fixture window alive; clay cursor waiting" : "fixture running without pid",
      width: 640,
      height: 360
    };
  }

  return {
    type: "game-observation",
    observedAt: now,
    source: process.platform === "win32" ? "window-capture" : "unavailable",
    foregroundOwned: false,
    framePersisted: false,
    summary: "foreground-owned capture/input sidecar pending native window handle",
    width: 0,
    height: 0
  };
}

export async function executeOwnedGameAction(target: GameTarget, action: GameAction): Promise<void> {
  validateBoundedAction(action);

  if (target.kind !== "fixture" && action.kind !== "note") {
    throw new GameRigSidecarError("focus_lost", "Pause Brain: Game Rig only sends input to an owned foreground window.");
  }

  await new Promise((resolve) => setTimeout(resolve, Math.min(action.durationMs, 300)));
}

export function stopOwnedGameProcess(child: ChildProcess): void {
  if (child.killed || child.exitCode !== null) {
    return;
  }

  child.kill();
}

export function validateBoundedAction(action: GameAction): void {
  if (!Number.isFinite(action.durationMs) || action.durationMs < 0 || action.durationMs > 800) {
    throw new GameRigSidecarError("invalid_action", "Game Rig action bursts must be under 800ms.");
  }

  if (action.kind === "key" && (!action.key || action.key.length > 24)) {
    throw new GameRigSidecarError("invalid_action", "Keyboard actions need a short key name.");
  }

  if (action.kind === "mouse") {
    const hasPoint = Number.isFinite(action.x) && Number.isFinite(action.y);

    if (!action.button || !hasPoint) {
      throw new GameRigSidecarError("invalid_action", "Mouse actions need a button and target point.");
    }
  }
}

function launchFixtureGame(): OwnedGameProcess {
  const workspaceRoot = findUpDirectory("pnpm-workspace.yaml", process.cwd());
  const fixtureScriptPath = workspaceRoot ? join(workspaceRoot, "tools", "game-runtime", "superior-fixture-game.mjs") : "";
  const scriptArgs = existsSync(fixtureScriptPath)
    ? [fixtureScriptPath]
    : ["-e", "setInterval(() => process.stdout.write('fixture-game\\n'), 1000)"];
  const child = spawn(process.execPath, scriptArgs, {
    stdio: "ignore",
    detached: false,
    windowsHide: false
  });

  child.unref();

  return {
    child,
    ...(child.pid ? { processId: child.pid } : {}),
    launchLabel: "Fixture Cartridge launched"
  };
}
