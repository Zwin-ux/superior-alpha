import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { GameBrainMode, GameRuntimeBudget, GameRuntimePlan } from "@clawdbot/shared";
import { getSuperiorStateDirectory } from "./localPaths.js";

interface GameRuntimeBudgetFile {
  type: "game-runtime-budget-store";
  highQualityUsedSeconds: number;
  updatedAt: string;
}

const defaultFreeHighQualitySeconds = 15 * 60;
const lowBudgetThresholdSeconds = 2 * 60;

export class GameRuntimeBudgetError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function readGameRuntimeBudget(brainMode?: GameBrainMode): GameRuntimeBudget {
  const plan = readRuntimePlan();
  const freeSeconds = readFreeHighQualitySeconds();
  const usedSeconds = Math.min(readBudgetFile().highQualityUsedSeconds, freeSeconds);
  const remainingSeconds = Math.max(0, freeSeconds - usedSeconds);
  const unmetered = plan !== "free" || brainMode === "local-fixture";
  const status = unmetered
    ? "unmetered"
    : remainingSeconds <= 0
      ? "exhausted"
      : remainingSeconds <= lowBudgetThresholdSeconds
        ? "low"
        : "available";

  return {
    type: "game-runtime-budget",
    plan,
    status,
    highQualityFreeSeconds: freeSeconds,
    highQualityUsedSeconds: usedSeconds,
    highQualityRemainingSeconds: unmetered ? freeSeconds : remainingSeconds,
    meteredBrainModes: ["openai-default"],
    localFixtureUnmetered: true,
    localHostAvailable: true,
    detail: formatBudgetDetail(plan, unmetered, remainingSeconds, freeSeconds),
    upgradePrompt: "Free includes 15 minutes of high-quality OpenAI gameplay. Upgrade to Pro or switch to local-host mode to continue.",
    updatedAt: readBudgetFile().updatedAt
  };
}

export function assertGameRuntimeBudgetAvailable(brainMode: GameBrainMode): void {
  const budget = readGameRuntimeBudget(brainMode);

  if (budget.status === "exhausted") {
    throw new GameRuntimeBudgetError(budget.upgradePrompt);
  }
}

export function consumeGameRuntimeBudgetSeconds(brainMode: GameBrainMode, seconds: number): GameRuntimeBudget {
  if (seconds <= 0 || !Number.isFinite(seconds)) {
    return readGameRuntimeBudget(brainMode);
  }

  const plan = readRuntimePlan();

  if (plan !== "free" || brainMode === "local-fixture") {
    return readGameRuntimeBudget(brainMode);
  }

  const budget = readBudgetFile();
  const nextBudget: GameRuntimeBudgetFile = {
    type: "game-runtime-budget-store",
    highQualityUsedSeconds: Math.min(readFreeHighQualitySeconds(), budget.highQualityUsedSeconds + seconds),
    updatedAt: new Date().toISOString()
  };

  writeBudgetFile(nextBudget);

  return readGameRuntimeBudget(brainMode);
}

export function getGameRuntimeBudgetStoragePath(): string {
  return join(getSuperiorStateDirectory(), "game-runtime", "budget.json");
}

function readRuntimePlan(): GameRuntimePlan {
  const value = process.env.SUPERIOR_GAME_RIG_PLAN?.trim().toLowerCase();

  if (value === "pro" || value === "local-host") {
    return value;
  }

  if (process.env.SUPERIOR_GAME_RIG_LOCAL_HOSTED === "1") {
    return "local-host";
  }

  return "free";
}

function readFreeHighQualitySeconds(): number {
  const configured = Number.parseInt(process.env.SUPERIOR_GAME_RIG_FREE_SECONDS ?? "", 10);

  if (!Number.isFinite(configured) || configured <= 0) {
    return defaultFreeHighQualitySeconds;
  }

  return Math.min(Math.max(configured, 60), 60 * 60);
}

function readBudgetFile(): GameRuntimeBudgetFile {
  const storagePath = getGameRuntimeBudgetStoragePath();

  if (!existsSync(storagePath)) {
    return {
      type: "game-runtime-budget-store",
      highQualityUsedSeconds: 0,
      updatedAt: new Date().toISOString()
    };
  }

  try {
    const payload = JSON.parse(readFileSync(storagePath, "utf8")) as Partial<GameRuntimeBudgetFile>;

    return {
      type: "game-runtime-budget-store",
      highQualityUsedSeconds:
        typeof payload.highQualityUsedSeconds === "number" && Number.isFinite(payload.highQualityUsedSeconds)
          ? Math.max(0, payload.highQualityUsedSeconds)
          : 0,
      updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString()
    };
  } catch {
    return {
      type: "game-runtime-budget-store",
      highQualityUsedSeconds: 0,
      updatedAt: new Date().toISOString()
    };
  }
}

function writeBudgetFile(budget: GameRuntimeBudgetFile): void {
  const storagePath = getGameRuntimeBudgetStoragePath();

  mkdirSync(dirname(storagePath), {
    recursive: true
  });
  writeFileSync(storagePath, JSON.stringify(budget, null, 2), "utf8");
}

function formatBudgetDetail(
  plan: GameRuntimePlan,
  unmetered: boolean,
  remainingSeconds: number,
  freeSeconds: number
): string {
  if (plan === "pro") {
    return "Pro gameplay budget active.";
  }

  if (plan === "local-host") {
    return "Local-host mode active; OpenAI gameplay budget is not consumed.";
  }

  if (unmetered) {
    return "Fixture/local proof is unmetered.";
  }

  return `${Math.ceil(remainingSeconds / 60)} of ${Math.ceil(freeSeconds / 60)} free high-quality minutes left.`;
}
