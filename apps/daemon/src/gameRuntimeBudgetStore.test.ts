import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GameRuntimeBudgetError,
  assertGameRuntimeBudgetAvailable,
  consumeGameRuntimeBudgetSeconds,
  readGameRuntimeBudget
} from "./gameRuntimeBudgetStore.js";

let testRoot = "";
const previousStateDirectory = process.env.CLAWDBOT_STATE_DIR;
const previousPlan = process.env.SUPERIOR_GAME_RIG_PLAN;
const previousFreeSeconds = process.env.SUPERIOR_GAME_RIG_FREE_SECONDS;
const previousLocalHosted = process.env.SUPERIOR_GAME_RIG_LOCAL_HOSTED;

beforeEach(() => {
  testRoot = join(tmpdir(), `superior-game-budget-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(testRoot, {
    recursive: true
  });
  process.env.CLAWDBOT_STATE_DIR = join(testRoot, "state");
  process.env.SUPERIOR_GAME_RIG_FREE_SECONDS = "180";
  delete process.env.SUPERIOR_GAME_RIG_PLAN;
  delete process.env.SUPERIOR_GAME_RIG_LOCAL_HOSTED;
});

afterEach(() => {
  rmSync(testRoot, {
    recursive: true,
    force: true
  });
  restoreEnv("CLAWDBOT_STATE_DIR", previousStateDirectory);
  restoreEnv("SUPERIOR_GAME_RIG_PLAN", previousPlan);
  restoreEnv("SUPERIOR_GAME_RIG_FREE_SECONDS", previousFreeSeconds);
  restoreEnv("SUPERIOR_GAME_RIG_LOCAL_HOSTED", previousLocalHosted);
});

describe("Game Rig runtime budget", () => {
  it("starts free high-quality gameplay with a finite budget", () => {
    const budget = readGameRuntimeBudget("openai-default");

    expect(budget.plan).toBe("free");
    expect(budget.status).toBe("available");
    expect(budget.highQualityFreeSeconds).toBe(180);
    expect(budget.highQualityRemainingSeconds).toBe(180);
    expect(budget.upgradePrompt).toContain("Upgrade to Pro");
  });

  it("exhausts free OpenAI gameplay while leaving fixture local proof unmetered", () => {
    consumeGameRuntimeBudgetSeconds("openai-default", 180);

    expect(readGameRuntimeBudget("openai-default").status).toBe("exhausted");
    expect(() => assertGameRuntimeBudgetAvailable("openai-default")).toThrow(GameRuntimeBudgetError);
    expect(readGameRuntimeBudget("local-fixture").status).toBe("unmetered");
  });

  it("treats Pro and local-host modes as unmetered", () => {
    process.env.SUPERIOR_GAME_RIG_PLAN = "pro";
    consumeGameRuntimeBudgetSeconds("openai-default", 180);

    expect(readGameRuntimeBudget("openai-default").status).toBe("unmetered");

    process.env.SUPERIOR_GAME_RIG_PLAN = "local-host";

    expect(readGameRuntimeBudget("openai-default").plan).toBe("local-host");
    expect(readGameRuntimeBudget("openai-default").status).toBe("unmetered");
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
