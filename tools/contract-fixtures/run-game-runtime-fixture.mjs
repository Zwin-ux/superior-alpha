#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const requestedHost = readArg("--host") ?? process.env.SUPERIOR_FIXTURE_HOST;
const tempRoot = await mkdtemp(join(tmpdir(), "superior-game-runtime-"));
const stateDirectory = join(tempRoot, "state");
const daemonCwd = join(tempRoot, "cwd");
const port = Number.parseInt(readArg("--port") ?? String(27000 + Math.floor(Math.random() * 1000)), 10);
const host = normalizeHost(requestedHost ?? `http://127.0.0.1:${port}`);
const startedAt = new Date().toISOString();
const checks = [];
let daemonProcess = null;
let sessionProcessId = 0;
let savedRoute = null;

try {
  if (!requestedHost) {
    await mkdir(stateDirectory, { recursive: true });
    await mkdir(daemonCwd, { recursive: true });
    daemonProcess = await startDaemon();
  }

  await runCheck("targets", async () => {
    const targets = await getJson("/game-targets");
    const fixture = targets.items?.find((target) => target.id === "superior-fixture-game");
    const gmod = targets.items?.find((target) => target.id === "gmod-sandbox");

    assert(fixture?.status === "ready", "Expected ready fixture target.");
    assert(gmod, "Expected GMOD profile target.");
    assert(targets.storage?.localOnly === true, "Expected local-only game target storage.");

    return {
      fixture: fixture.label,
      gmodStatus: gmod.status,
      storage: targets.storage.statePath
    };
  });

  await runCheck("gmod-route-save", async () => {
    const saved = await postJson("/game-server-routes/save", {
      type: "game-server-route-save",
      requestId: createFixtureId("game_route"),
      game: "gmod",
      label: "Fixture BattleMetrics route",
      addressOrUrl: "https://www.battlemetrics.com/servers/gmod/123456?server=203.0.113.20:27015",
      password: "fixture",
      playerName: "Clawd",
      createdAt: new Date().toISOString()
    });
    const routes = await getJson("/game-server-routes");

    savedRoute = saved.route;
    assert(saved.route?.address === "203.0.113.20:27015", "Expected parsed GMOD server address.");
    assert(routes.items?.some((route) => route.id === saved.route.id), "Expected saved GMOD route.");

    return {
      route: saved.route.label,
      address: saved.route.address,
      source: saved.route.source
    };
  });

  await runCheck("start-fixture", async () => {
    const started = await postJson("/game-runtime/start", {
      type: "game-runtime-start",
      requestId: createFixtureId("game_start"),
      targetId: "superior-fixture-game",
      goal: "open spawn menu",
      createdAt: new Date().toISOString()
    });
    const session = started.state?.activeSession;

    assert(started.type === "game-runtime-start-result", "Expected Game Rig start result.");
    assert(session?.ownedProcess === true, "Expected owned process session.");
    assert(session.foregroundOnly === true, "Expected foreground-only session.");
    assert(started.state?.budget?.plan === "free", "Expected free Game Rig budget by default.");
    assert(started.state?.budget?.highQualityFreeSeconds >= 900, "Expected at least 15 free high-quality minutes.");
    assert(started.state?.budget?.localFixtureUnmetered === true, "Expected fixture gameplay to be unmetered.");
    sessionProcessId = Number(session.processId ?? 0);

    return {
      status: started.state.status,
      sessionId: session.sessionId,
      processId: session.processId ?? "none",
      brainMode: session.brainMode,
      budget: `${started.state.budget.plan}/${started.state.budget.status}`,
      freeMinutes: Math.floor(started.state.budget.highQualityFreeSeconds / 60)
    };
  });

  await runCheck("action-event", async () => {
    const events = await waitForGameEvent("action_sent", 8_000);
    const action = events.items?.find((event) => event.kind === "action_sent");

    assert(action, "Expected at least one action_sent event.");

    return {
      event: action.label,
      detail: action.detail ?? "none",
      eventCount: events.items.length
    };
  });

  await runCheck("goal-and-nudge", async () => {
    const goal = await postJson("/game-runtime/goal", {
      type: "game-runtime-goal",
      requestId: createFixtureId("game_goal"),
      goal: "build a car",
      createdAt: new Date().toISOString()
    });
    const nudge = await postJson("/game-runtime/nudge", {
      type: "game-runtime-nudge",
      requestId: createFixtureId("game_nudge"),
      nudge: "fight back",
      createdAt: new Date().toISOString()
    });

    assert(goal.state?.activeSession?.goal?.text === "build a car", "Expected updated game goal.");
    assert(nudge.state?.activeSession, "Expected active session after nudge.");

    return {
      goal: goal.state.activeSession.goal.text,
      status: nudge.state.activeSession.status
    };
  });

  await runCheck("pause", async () => {
    const paused = await postJson("/game-runtime/pause", {
      type: "game-runtime-pause",
      requestId: createFixtureId("game_pause"),
      reason: "fixture gate",
      createdAt: new Date().toISOString()
    });

    assert(paused.state?.activeSession?.status === "paused", "Expected paused Game Rig session.");

    return {
      status: paused.state.activeSession.status,
      safetyState: paused.state.activeSession.safetyState
    };
  });

  await runCheck("stop-and-process", async () => {
    const stopped = await postJson("/game-runtime/stop", {
      type: "game-runtime-stop",
      requestId: createFixtureId("game_stop"),
      createdAt: new Date().toISOString()
    });

    assert(stopped.state?.status === "closed", "Expected Game Rig state to close.");

    if (sessionProcessId && process.platform === "win32") {
      await waitForProcessExit(sessionProcessId, 4_000);
      assert(!(await isWindowsProcessAlive(sessionProcessId)), "Fixture process was not stopped.");
    }

    return {
      status: stopped.state.status,
      processId: sessionProcessId || "none"
    };
  });
} finally {
  await postJson("/game-runtime/stop").catch(() => undefined);

  if (daemonProcess) {
    await stopDaemonProcess(daemonProcess);
  }

  if (!requestedHost) {
    await removeTempRoot();
  }
}

const failedChecks = checks.filter((check) => check.status === "failed");
const report = {
  type: "superior-game-runtime-fixture-report",
  host,
  startedAt,
  finishedAt: new Date().toISOString(),
  status: failedChecks.length === 0 ? "passed" : "failed",
  checks
};
const reportPath = await writeReport(report);

console.log(JSON.stringify({ ...report, reportPath }, null, 2));

if (failedChecks.length > 0) {
  process.exitCode = 1;
}

async function waitForGameEvent(kind, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let events = await getJson("/game-runtime/events");

  while (Date.now() < deadline) {
    events = await getJson("/game-runtime/events");

    if (events.items?.some((event) => event.kind === kind)) {
      return events;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return events;
}

async function runCheck(name, callback) {
  const checkStartedAt = new Date().toISOString();

  try {
    const details = await callback();

    checks.push({
      name,
      status: "passed",
      startedAt: checkStartedAt,
      finishedAt: new Date().toISOString(),
      details
    });
  } catch (error) {
    checks.push({
      name,
      status: "failed",
      startedAt: checkStartedAt,
      finishedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function getJson(path) {
  const response = await fetch(`${host}${path}`);

  return readExpectedJson(response, 200);
}

async function postJson(path, payload, expectedStatus = 200) {
  const response = await fetch(`${host}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    ...(payload ? { body: JSON.stringify(payload) } : {})
  });

  return readExpectedJson(response, expectedStatus);
}

async function readExpectedJson(response, expectedStatus) {
  const payload = await response.json().catch(() => null);

  if (response.status !== expectedStatus) {
    throw new Error(`Expected HTTP ${expectedStatus}, got ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function writeReport(report) {
  const outputDirectory = join(process.cwd(), ".clawdbot", "verification");
  const reportPath = join(outputDirectory, `game-runtime-fixture-${Date.now()}.json`);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  return reportPath;
}

async function startDaemon() {
  const daemonPath = join(repoRoot, "apps", "daemon", "dist", "server.js");
  const child = spawn(process.execPath, [daemonPath], {
    cwd: daemonCwd,
    env: {
      ...process.env,
      CLAWDBOT_STATE_DIR: stateDirectory,
      CLAWDBOT_DAEMON_PORT: String(port),
      CLAWDBOT_DAEMON_HOST: "127.0.0.1",
      SUPERIOR_STEAM_PATH: join(tempRoot, "missing-steam"),
      SUPERIOR_ENV_PATH: join(tempRoot, "missing-env.local"),
      OPENAI_API_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_PUBLISHABLE_KEY: ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", () => undefined);
  child.stderr.on("data", () => undefined);

  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Temporary daemon exited before becoming ready with code ${child.exitCode}.`);
    }

    try {
      const response = await fetch(`${host}/health`);
      if (response.ok) {
        return child;
      }
    } catch {
      // Retry until the temporary daemon binds the loopback port.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  child.kill("SIGTERM");
  throw new Error("Timed out waiting for temporary Game Rig daemon.");
}

async function stopDaemonProcess(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000))
  ]);

  if (child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 1_000))
    ]);
  }
}

async function waitForProcessExit(processId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!(await isWindowsProcessAlive(processId))) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

async function isWindowsProcessAlive(processId) {
  if (process.platform !== "win32") {
    return false;
  }

  const child = spawn("powershell", ["-NoProfile", "-Command", `Get-Process -Id ${Number(processId)} -ErrorAction SilentlyContinue`], {
    stdio: "ignore",
    windowsHide: true
  });

  return new Promise((resolve) => {
    child.once("exit", (code) => resolve(code === 0));
  });
}

async function removeTempRoot() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rm(tempRoot, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 5) {
        console.warn(`Could not remove temporary Game Rig folder: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
}

function readArg(name) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function normalizeHost(value) {
  return value.replace(/\/+$/, "");
}

function createFixtureId(prefix) {
  return `${prefix}_fixture_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
