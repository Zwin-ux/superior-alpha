import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createGameRuntimeGoalRequest,
  createGameRuntimeNudgeRequest,
  createGameRuntimeStartRequest
} from "@clawdbot/shared";
import { validateBoundedAction } from "./gameRigSidecar.js";
import { getFixtureGameTargetId } from "./gameTargetStore.js";
import {
  GameRuntimeError,
  getGameRuntimeEvents,
  getGameRuntimeState,
  nudgeGameRuntime,
  pauseGameRuntime,
  resumeGameRuntime,
  startGameRuntime,
  stopGameRuntime,
  updateGameRuntimeGoal
} from "./gameRuntime.js";

let testRoot = "";
const previousStateDirectory = process.env.CLAWDBOT_STATE_DIR;
const previousSteamPath = process.env.SUPERIOR_STEAM_PATH;

beforeEach(() => {
  testRoot = join(tmpdir(), `superior-game-runtime-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(testRoot, {
    recursive: true
  });
  process.env.CLAWDBOT_STATE_DIR = join(testRoot, "state");
  process.env.SUPERIOR_STEAM_PATH = join(testRoot, "missing-steam");
});

afterEach(async () => {
  await stopGameRuntime().catch(() => undefined);
  rmSync(testRoot, {
    recursive: true,
    force: true
  });
  restoreEnv("CLAWDBOT_STATE_DIR", previousStateDirectory);
  restoreEnv("SUPERIOR_STEAM_PATH", previousSteamPath);
});

describe("Game Rig runtime", () => {
  it("starts the fixture, records an action, pauses, resumes, nudges, and stops", async () => {
    const start = await startGameRuntime(
      createGameRuntimeStartRequest({
        targetId: getFixtureGameTargetId(),
        goal: "open spawn menu"
      })
    );

    expect(start.state.activeSession?.ownedProcess).toBe(true);
    expect(start.state.activeSession?.foregroundOnly).toBe(true);

    const events = await waitForGameEvent("action_sent");

    expect(events.items.some((event) => event.kind === "observed")).toBe(true);
    expect(events.items.some((event) => event.kind === "action_sent")).toBe(true);

    const goal = updateGameRuntimeGoal(
      createGameRuntimeGoalRequest({
        goal: "build a car"
      })
    );

    expect(goal.state.activeSession?.goal.text).toBe("build a car");

    const nudge = nudgeGameRuntime(
      createGameRuntimeNudgeRequest({
        nudge: "fight back"
      })
    );

    expect(nudge.state.activeSession?.status).not.toBe("closed");

    const pause = pauseGameRuntime({
      type: "game-runtime-pause",
      requestId: "pause_test",
      createdAt: new Date().toISOString()
    });

    expect(pause.state.activeSession?.status).toBe("paused");
    expect(pause.state.activeSession?.safetyState).toBe("paused-user");

    const resume = resumeGameRuntime({
      type: "game-runtime-resume",
      requestId: "resume_test",
      createdAt: new Date().toISOString()
    });

    expect(resume.state.activeSession?.status).toBe("observing");

    const stopped = await stopGameRuntime("stop_test");

    expect(stopped.state.status).toBe("closed");
    expect(getGameRuntimeState().activeSession).toBeUndefined();
  });

  it("rejects missing game targets", async () => {
    await expect(
      startGameRuntime(
        createGameRuntimeStartRequest({
          targetId: "missing-game",
          goal: "wander"
        })
      )
    ).rejects.toMatchObject<Partial<GameRuntimeError>>({
      code: "not_found"
    });
  });

  it("validates bounded action bursts", () => {
    expect(() =>
      validateBoundedAction({
        type: "game-action",
        id: "game_action_bad",
        kind: "key",
        label: "Hold forever",
        reason: "test",
        durationMs: 1_200,
        key: "W",
        createdAt: new Date().toISOString()
      })
    ).toThrow();
  });
});

async function waitForGameEvent(kind: string) {
  const deadline = Date.now() + 5_000;
  let events = getGameRuntimeEvents();

  while (Date.now() < deadline) {
    events = getGameRuntimeEvents();

    if (events.items.some((event) => event.kind === kind)) {
      return events;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return events;
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
