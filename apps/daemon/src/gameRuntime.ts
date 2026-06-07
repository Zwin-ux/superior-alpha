import { ChildProcess } from "node:child_process";
import {
  GameAction,
  GameBrainMode,
  GameEvent,
  GameEventKind,
  GameGoal,
  GameRuntimeError as GameRuntimeErrorContract,
  GameRuntimeEventsResponse,
  GameRuntimeGoalRequest,
  GameRuntimeGoalResult,
  GameRuntimeNudgeRequest,
  GameRuntimeNudgeResult,
  GameRuntimePauseRequest,
  GameRuntimePauseResult,
  GameRuntimeResumeRequest,
  GameRuntimeResumeResult,
  GameRuntimeStartRequest,
  GameRuntimeStartResult,
  GameRuntimeState,
  GameRuntimeStatus,
  GameRuntimeStopResult,
  GameServerRoute,
  GameSession,
  GameTarget,
  createLocalId
} from "@clawdbot/shared";
import { readGameTarget } from "./gameTargetStore.js";
import { buildGmodConnectArgs, readGameServerRoute } from "./gameServerRouteStore.js";
import {
  GameRigSidecarError,
  executeOwnedGameAction,
  launchOwnedGameProcess,
  observeOwnedGame,
  stopOwnedGameProcess,
  validateBoundedAction
} from "./gameRigSidecar.js";
import {
  GameRuntimeBudgetError,
  assertGameRuntimeBudgetAvailable,
  consumeGameRuntimeBudgetSeconds,
  readGameRuntimeBudget
} from "./gameRuntimeBudgetStore.js";

interface ActiveGameRuntime {
  session: GameSession;
  target: GameTarget;
  route: GameServerRoute | null;
  child: ChildProcess;
  loopTimeout?: NodeJS.Timeout;
  lastBudgetChargedAtMs?: number;
  lastNudge?: string;
}

const maxGameEvents = 80;
let activeRuntime: ActiveGameRuntime | null = null;
let lastSessionId: string | undefined;
let gameEvents: GameEvent[] = [];

export class GameRuntimeError extends Error {
  constructor(
    readonly code: GameRuntimeErrorContract["code"],
    message: string
  ) {
    super(message);
  }
}

export function getGameRuntimeState(): GameRuntimeState {
  return {
    type: "game-runtime-state",
    status: activeRuntime ? activeRuntime.session.status : "closed",
    ...(activeRuntime ? { activeSession: activeRuntime.session } : {}),
    budget: readGameRuntimeBudget(activeRuntime?.session.brainMode),
    safety: {
      localOnly: true,
      foregroundOnly: true,
      emergencyStop: true,
      processOwnership: true,
      noStealthControl: true
    },
    createdAt: new Date().toISOString()
  };
}

export function getGameRuntimeEvents(): GameRuntimeEventsResponse {
  const sessionId = activeRuntime?.session.sessionId ?? lastSessionId;
  const items = sessionId ? gameEvents.filter((event) => event.sessionId === sessionId) : gameEvents;

  return {
    type: "game-runtime-events",
    ...(sessionId ? { sessionId } : {}),
    items,
    createdAt: new Date().toISOString()
  };
}

export async function startGameRuntime(request: GameRuntimeStartRequest): Promise<GameRuntimeStartResult> {
  if (request.type !== "game-runtime-start" || !request.targetId || !request.goal.trim()) {
    throw new GameRuntimeError("bad_request", "Choose a game and give Clawd a goal.");
  }

  const target = readGameTarget(request.targetId);

  if (!target) {
    throw new GameRuntimeError("not_found", "Game target not found.");
  }

  if (target.status !== "ready") {
    throw new GameRuntimeError("missing_exe", target.detail || "Locate EXE before launch.");
  }

  await stopGameRuntime();

  const route = readGameServerRoute(request.serverRouteId);
  const routedTarget = applyServerRouteToTarget(target, route);
  const brainMode = request.brainMode ?? getDefaultBrainMode(routedTarget);

  try {
    assertGameRuntimeBudgetAvailable(brainMode);
  } catch (error) {
    if (error instanceof GameRuntimeBudgetError) {
      throw new GameRuntimeError("budget_exhausted", error.message);
    }

    throw error;
  }

  const startedAt = new Date().toISOString();
  const launched = await launchOwnedGameProcess(routedTarget);
  const session: GameSession = {
    type: "game-session",
    sessionId: createLocalId("game_session"),
    targetId: target.id,
    targetLabel: routedTarget.label,
    ...(route ? { serverRoute: route } : {}),
    status: "launching",
    brainMode,
    ...(launched.processId ? { processId: launched.processId } : {}),
    ownedProcess: true,
    foregroundOnly: true,
    emergencyStop: true,
    safetyState: "foreground-required",
    goal: createGoal(request.goal),
    confidence: routedTarget.kind === "fixture" ? 0.86 : route ? 0.58 : 0.42,
    startedAt,
    updatedAt: startedAt
  };

  activeRuntime = {
    session,
    target: routedTarget,
    route,
    child: launched.child,
    lastBudgetChargedAtMs: Date.now()
  };
  recordGameEvent(session, "started", "Started", launched.launchLabel);
  if (route) {
    recordGameEvent(session, "route_selected", "Server route", `${route.label} / ${route.address}`);
    recordGameEvent(session, "talkback", "Clawd", `I'm routing into ${route.label}. You watch the window; I'll call out what I try.`);
  }
  bindChildLifecycle(session.sessionId, launched.child);

  await waitForSpawnTick();

  if (session.status === "failed") {
    throw new GameRuntimeError("launch_failed", session.error ?? "Game Rig could not launch this target.");
  }

  session.status = "observing";
  session.safetyState = target.kind === "fixture" ? "foreground-owned" : "foreground-required";
  touchSession(session);
  scheduleAutonomyLoop(session.sessionId, 120);

  return {
    type: "game-runtime-start-result",
    requestId: request.requestId,
    state: getGameRuntimeState(),
    createdAt: new Date().toISOString()
  };
}

export function updateGameRuntimeGoal(request: GameRuntimeGoalRequest): GameRuntimeGoalResult {
  const runtime = requireActiveRuntime();

  if (request.type !== "game-runtime-goal" || !request.goal.trim()) {
    throw new GameRuntimeError("bad_request", "Game goal cannot be empty.");
  }

  runtime.session.goal = createGoal(request.goal);
  runtime.session.status = runtime.session.status === "paused" ? "paused" : "observing";
  touchSession(runtime.session);
  recordGameEvent(runtime.session, "goal_updated", "Goal changed", request.goal.trim());
  scheduleAutonomyLoop(runtime.session.sessionId, 50);

  return {
    type: "game-runtime-goal-result",
    requestId: request.requestId,
    state: getGameRuntimeState(),
    createdAt: new Date().toISOString()
  };
}

export function nudgeGameRuntime(request: GameRuntimeNudgeRequest): GameRuntimeNudgeResult {
  const runtime = requireActiveRuntime();

  if (request.type !== "game-runtime-nudge" || !request.nudge.trim()) {
    throw new GameRuntimeError("bad_request", "Game nudge cannot be empty.");
  }

  runtime.lastNudge = request.nudge.trim().slice(0, 180);
  recordGameEvent(runtime.session, "nudged", "Goat It", runtime.lastNudge);
  scheduleAutonomyLoop(runtime.session.sessionId, 50);

  return {
    type: "game-runtime-nudge-result",
    requestId: request.requestId,
    state: getGameRuntimeState(),
    createdAt: new Date().toISOString()
  };
}

export function pauseGameRuntime(request: GameRuntimePauseRequest): GameRuntimePauseResult {
  const runtime = requireActiveRuntime();

  clearRuntimeLoop(runtime);
  runtime.session.status = "paused";
  runtime.session.safetyState = "paused-user";
  touchSession(runtime.session);
  recordGameEvent(runtime.session, "paused", "Pause Brain", request.reason ?? "user paused control");

  return {
    type: "game-runtime-pause-result",
    requestId: request.requestId,
    state: getGameRuntimeState(),
    createdAt: new Date().toISOString()
  };
}

export function resumeGameRuntime(request: GameRuntimeResumeRequest): GameRuntimeResumeResult {
  const runtime = requireActiveRuntime();

  runtime.session.status = "observing";
  runtime.session.safetyState = runtime.target.kind === "fixture" ? "foreground-owned" : "foreground-required";
  touchSession(runtime.session);
  recordGameEvent(runtime.session, "resumed", "Brain resumed", "bounded action loop armed");
  scheduleAutonomyLoop(runtime.session.sessionId, 50);

  return {
    type: "game-runtime-resume-result",
    requestId: request.requestId,
    state: getGameRuntimeState(),
    createdAt: new Date().toISOString()
  };
}

export async function stopGameRuntime(requestId?: string): Promise<GameRuntimeStopResult> {
  if (!activeRuntime) {
    return {
      type: "game-runtime-stop-result",
      ...(requestId ? { requestId } : {}),
      state: getGameRuntimeState(),
      createdAt: new Date().toISOString()
    };
  }

  const runtime = activeRuntime;

  clearRuntimeLoop(runtime);
  runtime.session.status = "stopped";
  runtime.session.safetyState = "stopped";
  touchSession(runtime.session);
  recordGameEvent(runtime.session, "stopped", "Stopped", "owned process stopped");
  lastSessionId = runtime.session.sessionId;
  activeRuntime = null;
  stopOwnedGameProcess(runtime.child);

  return {
    type: "game-runtime-stop-result",
    ...(requestId ? { requestId } : {}),
    state: getGameRuntimeState(),
    createdAt: new Date().toISOString()
  };
}

function bindChildLifecycle(sessionId: string, child: ChildProcess): void {
  child.once("error", (error) => {
    const runtime = getRuntimeForSession(sessionId);

    if (!runtime) {
      return;
    }

    runtime.session.status = "failed";
    runtime.session.error = error.message;
    runtime.session.safetyState = "stopped";
    touchSession(runtime.session);
    recordGameEvent(runtime.session, "failed", "Launch failed", error.message);
  });
  child.once("exit", () => {
    const runtime = getRuntimeForSession(sessionId);

    if (!runtime) {
      return;
    }

    clearRuntimeLoop(runtime);
    runtime.session.status = "stopped";
    runtime.session.safetyState = "stopped";
    touchSession(runtime.session);
    recordGameEvent(runtime.session, "stopped", "Stopped", "game process closed");
    lastSessionId = runtime.session.sessionId;
    activeRuntime = null;
  });
}

function scheduleAutonomyLoop(sessionId: string, delayMs: number): void {
  const runtime = getRuntimeForSession(sessionId);

  if (!runtime || runtime.session.status === "paused" || runtime.session.status === "stopped") {
    return;
  }

  clearRuntimeLoop(runtime);
  runtime.loopTimeout = setTimeout(() => {
    void runAutonomyLoop(sessionId).catch((error) => failRuntime(sessionId, error));
  }, delayMs);
  runtime.loopTimeout.unref?.();
}

async function runAutonomyLoop(sessionId: string): Promise<void> {
  const runtime = getRuntimeForSession(sessionId);

  if (!runtime || runtime.session.status === "paused" || runtime.session.status === "stopped") {
    return;
  }

  runtime.session.status = "observing";
  runtime.session.observation = await observeOwnedGame(runtime.target, runtime.session.processId);
  runtime.session.safetyState = runtime.session.observation.foregroundOwned ? "foreground-owned" : "foreground-required";
  touchSession(runtime.session);
  recordGameEvent(runtime.session, "observed", "Observed", runtime.session.observation.summary);

  runtime.session.status = "thinking";
  touchSession(runtime.session);
  recordGameEvent(runtime.session, "thinking", "Thinking", formatBrainDetail(runtime));

  if (!chargeRuntimeBudget(runtime)) {
    return;
  }

  const action = planBoundedAction(runtime);

  validateBoundedAction(action);
  runtime.session.lastAction = action;
  recordGameEvent(runtime.session, "action_planned", action.label, action.reason);

  runtime.session.status = "acting";
  touchSession(runtime.session);

  try {
    await executeOwnedGameAction(runtime.target, action);
    recordGameEvent(runtime.session, "action_sent", action.label, action.reason);
  } catch (error) {
    if (error instanceof GameRigSidecarError && error.code === "focus_lost") {
      runtime.session.status = "paused";
      runtime.session.safetyState = "paused-focus-lost";
      runtime.session.error = error.message;
      touchSession(runtime.session);
      recordGameEvent(runtime.session, "paused", "Focus guard", error.message);
      return;
    }

    throw error;
  }

  runtime.session.status = "observing";
  runtime.session.confidence = Math.min(0.95, runtime.session.confidence + 0.01);
  touchSession(runtime.session);
  scheduleAutonomyLoop(sessionId, runtime.target.kind === "fixture" ? 2_000 : 2_500);
}

function planBoundedAction(runtime: ActiveGameRuntime): GameAction {
  const now = new Date().toISOString();
  const nudge = runtime.lastNudge;
  delete runtime.lastNudge;

  if (runtime.target.kind !== "fixture") {
    return {
      type: "game-action",
      id: createLocalId("game_action"),
      kind: "note",
      label: runtime.route ? "Think route" : "Hold input",
      reason: nudge ?? (runtime.route ? `watching ${runtime.route.address} before first move` : "waiting for owned foreground window before input"),
      durationMs: 120,
      createdAt: now
    };
  }

  const goal = [runtime.session.goal.text, nudge].filter(Boolean).join(" / ").toLowerCase();

  if (goal.includes("spawn") || goal.includes("menu")) {
    return {
      type: "game-action",
      id: createLocalId("game_action"),
      kind: "key",
      label: "Tap Q",
      reason: nudge ?? "open fixture spawn tray",
      durationMs: 120,
      key: "Q",
      createdAt: now
    };
  }

  if (goal.includes("car") || goal.includes("drive")) {
    return {
      type: "game-action",
      id: createLocalId("game_action"),
      kind: "key",
      label: "Tap W",
      reason: nudge ?? "move fixture cart forward",
      durationMs: 160,
      key: "W",
      createdAt: now
    };
  }

  return {
    type: "game-action",
    id: createLocalId("game_action"),
    kind: "mouse",
    label: "Click clay target",
    reason: nudge ?? "probe deterministic fixture",
    durationMs: 180,
    button: "left",
    x: 320,
    y: 180,
    createdAt: now
  };
}

function failRuntime(sessionId: string, error: unknown): void {
  const runtime = getRuntimeForSession(sessionId);

  if (!runtime) {
    return;
  }

  runtime.session.status = "failed";
  runtime.session.safetyState = "stopped";
  runtime.session.error = error instanceof Error ? error.message : "Game Rig action loop failed.";
  touchSession(runtime.session);
  recordGameEvent(runtime.session, "failed", "Failed", runtime.session.error);
}

function chargeRuntimeBudget(runtime: ActiveGameRuntime): boolean {
  const now = Date.now();
  const elapsedSeconds = Math.max(1, Math.ceil((now - (runtime.lastBudgetChargedAtMs ?? now)) / 1000));

  runtime.lastBudgetChargedAtMs = now;

  const budget = consumeGameRuntimeBudgetSeconds(runtime.session.brainMode, elapsedSeconds);

  if (budget.status !== "exhausted") {
    return true;
  }

  runtime.session.status = "paused";
  runtime.session.safetyState = "paused-budget";
  runtime.session.error = budget.upgradePrompt;
  touchSession(runtime.session);
  recordGameEvent(runtime.session, "paused", "Budget paused", budget.upgradePrompt);

  return false;
}

function requireActiveRuntime(): ActiveGameRuntime {
  if (!activeRuntime) {
    throw new GameRuntimeError("not_running", "Start a Game Rig session first.");
  }

  return activeRuntime;
}

function getRuntimeForSession(sessionId: string): ActiveGameRuntime | null {
  return activeRuntime?.session.sessionId === sessionId ? activeRuntime : null;
}

function clearRuntimeLoop(runtime: ActiveGameRuntime): void {
  if (!runtime.loopTimeout) {
    return;
  }

  clearTimeout(runtime.loopTimeout);
  delete runtime.loopTimeout;
}

function recordGameEvent(session: GameSession, kind: GameEventKind, label: string, detail?: string): void {
  const event: GameEvent = {
    type: "game-event",
    id: createLocalId("game_event"),
    sessionId: session.sessionId,
    targetId: session.targetId,
    kind,
    label,
    ...(detail ? { detail } : {}),
    createdAt: new Date().toISOString()
  };

  gameEvents = [...gameEvents, event].slice(-maxGameEvents);
  lastSessionId = session.sessionId;
}

function applyServerRouteToTarget(target: GameTarget, route: GameServerRoute | null): GameTarget {
  if (!route || target.id !== "gmod-sandbox") {
    return target;
  }

  return {
    ...target,
    label: `${target.label} -> ${route.label}`,
    launchArgs: [...(target.launchArgs ?? ["-applaunch", "4000"]), ...buildGmodConnectArgs(route)]
  };
}

function createGoal(text: string): GameGoal {
  return {
    type: "game-goal",
    text: text.trim().slice(0, 240),
    createdAt: new Date().toISOString()
  };
}

function getDefaultBrainMode(target: GameTarget): GameBrainMode {
  return target.kind === "fixture" ? "local-fixture" : "openai-default";
}

function formatBrainDetail(runtime: ActiveGameRuntime): string {
  return runtime.session.brainMode === "openai-default"
    ? "OpenAI vision/action lane armed; foreground guard active"
    : "deterministic fixture brain";
}

function touchSession(session: GameSession): void {
  session.updatedAt = new Date().toISOString();
}

function waitForSpawnTick(): Promise<void> {
  return new Promise((resolveTick) => {
    setTimeout(resolveTick, 80);
  });
}
