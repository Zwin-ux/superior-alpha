#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const host = normalizeHost(readArg("--host") ?? process.env.SUPERIOR_FIXTURE_HOST ?? "http://127.0.0.1:5317");
const repoUrl = readArg("--repo") ?? "https://github.com/openai/openai-node";
const startedAt = new Date().toISOString();
const checks = [];
let botIdentity = null;
let repoResult = null;
let repoWorkspace = null;
let pairingToken = "";
let functionRunRequestId = "";

try {
  await runCheck("health", async () => {
    const health = await getJson("/health");

    assert(health.service === "superior-daemon", "Expected SUPERIOR daemon health.");

    return {
      status: health.status,
      openaiConfigured: Boolean(health.openaiConfigured)
    };
  });

  await runCheck("bot-identity", async () => {
    botIdentity = await getJson("/bot-identity");

    assert(typeof botIdentity.name === "string", "Expected bot identity name.");
    assert(Array.isArray(botIdentity.skills), "Expected bot skills.");

    return {
      name: botIdentity.name,
      body: botIdentity.body,
      color: botIdentity.color,
      eye: botIdentity.eye
    };
  });

  await runCheck("native-repo-read", async () => {
    assert(botIdentity, "Bot identity was not loaded.");
    repoResult = await postJson("/skills/repo-reader", {
      type: "repo-reader",
      requestId: createFixtureId("repo"),
      repoUrl,
      bot: botIdentity,
      createdAt: new Date().toISOString()
    });

    assert(repoResult.type === "repo-reader-result", "Expected Repo Reader result.");
    assert(repoResult.repository?.owner === "openai", "Expected openai owner.");
    assert(repoResult.repository?.name === "openai-node", "Expected openai-node repo.");

    return {
      repo: `${repoResult.repository.owner}/${repoResult.repository.name}`,
      surface: repoResult.presentation.primary,
      playpen: repoResult.playground.label,
      role: repoResult.playground.robotRole
    };
  });

  await runCheck("workspace-saved", async () => {
    const workspaces = await getJson("/repo-workspaces");
    repoWorkspace = workspaces.items?.find(
      (item) =>
        item.repository?.owner === repoResult?.repository?.owner &&
        item.repository?.name === repoResult?.repository?.name
    );

    assert(repoWorkspace, "Expected saved repo workspace.");

    return {
      id: repoWorkspace.id,
      profilePath: repoWorkspace.profilePath ?? "pending",
      nextMove: repoWorkspace.nextMove ?? "none"
    };
  });

  await runCheck("start-playpen", async () => {
    assert(repoWorkspace, "Repo workspace was not saved.");
    assert(botIdentity, "Bot identity was not loaded.");

    const start = await postJson("/browser-runtime/start", {
      type: "superior-browser-start",
      requestId: createFixtureId("browser"),
      repoWorkspaceId: repoWorkspace.id,
      bot: botIdentity,
      createdAt: new Date().toISOString()
    });

    assert(start.type === "superior-browser-start-result", "Expected browser start result.");
    assert(start.state?.activeSession, "Expected active browser session.");

    return {
      status: start.state.status,
      sessionId: start.state.activeSession.sessionId,
      browserKind: start.state.activeSession.browserKind,
      profilePath: start.state.activeSession.profilePath
    };
  });

  await runCheck("controlled-profile-paired", async () => {
    let state = await getJson("/browser-runtime");
    const session = state.activeSession;

    assert(session, "Expected active browser session.");

    pairingToken = await attachFromRobotHome(session);
    state = await waitForRuntimeState(["paired"], 20_000);

    assert(state.status === "paired", "Expected controlled profile to pair.");

    return {
      status: state.status,
      repoTitle: state.activeSession?.repoTitle ?? "unknown",
      pairedAt: state.activeSession?.pairedAt ?? "unknown",
      tokenSource: pairingToken ? "session-attach" : "extension-auto-attach"
    };
  });

  await runCheck("article-xray-after-pairing", async () => {
    assert(botIdentity, "Bot identity was not loaded.");

    if (!pairingToken) {
      pairingToken = await pairFixtureExtension();
    }

    const createdAt = new Date().toISOString();
    const functionRun = {
      type: "superior-function-run",
      requestId: createFixtureId("native_loop_xray"),
      functionId: "article-xray",
      input: {
        type: "article-xray",
        requestId: createFixtureId("xray"),
        pairingToken,
        bot: botIdentity,
        page: {
          url: repoUrl,
          title: "openai/openai-node native loop proof",
          selectedText:
            "SUPERIOR native loop proof runs Article X-Ray after a robot-owned playpen pairs. The proof should create a recent function run and a skill_ran browser event.",
          bodyText:
            "SUPERIOR native loop proof runs Article X-Ray after a robot-owned playpen pairs. The proof should create a recent function run and a skill_ran browser event.",
          capturedAt: createdAt
        },
        createdAt
      },
      bot: botIdentity,
      createdAt
    };
    functionRunRequestId = functionRun.requestId;

    const result = await postJson(
      "/functions/run",
      functionRun,
      {
        "X-Clawdbot-Pairing-Token": pairingToken
      }
    );

    assert(result.type === "superior-function-run-result", "Expected function run result.");
    assert(result.result?.type === "article-xray-result", "Expected Article X-Ray result.");
    assert(result.botReaction?.state === "success", "Expected physical success reaction.");

    return {
      runId: result.runId,
      reaction: result.botReaction.label,
      slot: result.botReaction.slot
    };
  });

  await runCheck("native-loop-proof-recorded", async () => {
    const [recentRuns, events] = await Promise.all([getJson("/function-runs/recent"), getJson("/browser-runtime/events")]);
    const matchingRun = recentRuns.items?.find((item) => item.requestId === functionRunRequestId);
    const skillEvent = events.items?.find((item) => item.kind === "skill_ran");

    assert(matchingRun, "Expected recent function proof for native loop Article X-Ray.");
    assert(skillEvent, "Expected skill_ran browser event.");

    return {
      recentReaction: matchingRun.botReaction?.label ?? "none",
      event: skillEvent.label,
      eventDetail: skillEvent.detail ?? "none"
    };
  });

  await runCheck("stop-playpen", async () => {
    const stopped = await postJson("/browser-runtime/stop");
    const state = await waitForRuntimeState(["closed"], 5_000);

    assert(stopped.state?.status === "closed" || state.status === "closed", "Expected browser runtime to close.");

    return {
      status: state.status
    };
  });
} finally {
  await postJson("/browser-runtime/stop").catch(() => undefined);
  await postJson("/browser-link/reset").catch(() => undefined);
}

const failedChecks = checks.filter((check) => check.status === "failed");
const report = {
  type: "superior-native-loop-fixture-report",
  host,
  repoUrl,
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

async function attachFromRobotHome(session) {
  const homeResponse = await fetch(session.homeUrl);
  const html = await homeResponse.text();
  const match = html.match(/<script id="superior-session-data" type="application\/json">([^<]+)<\/script>/);

  if (!match) {
    return "";
  }

  const sessionData = JSON.parse(match[1]);
  try {
    const attach = await postJson(`/browser-session/${encodeURIComponent(session.sessionId)}/attach`, {
      type: "superior-browser-attach",
      requestId: createFixtureId("attach"),
      sessionToken: sessionData.sessionToken,
      extensionId: "native-loop-fixture",
      createdAt: new Date().toISOString()
    });

    return attach.pairingToken ?? "";
  } catch {
    return "";
  }
}

async function pairFixtureExtension() {
  const started = await postJson("/browser-link/start");
  const token = started.pairingToken;

  await postJson("/browser-link/complete", {
    type: "browser-pairing-complete",
    requestId: createFixtureId("pair"),
    pairingToken: token,
    extensionId: "native-loop-fixture-fallback",
    createdAt: new Date().toISOString()
  });

  return token;
}

async function waitForRuntimeState(statuses, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;

  while (Date.now() < deadline) {
    latest = await getJson("/browser-runtime");

    if (statuses.includes(latest.status)) {
      return latest;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return latest ?? (await getJson("/browser-runtime"));
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

async function postJson(path, payload, headers = {}, expectedStatus = 200) {
  const response = await fetch(`${host}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
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
  const reportPath = join(outputDirectory, `native-loop-fixture-${Date.now()}.json`);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  return reportPath;
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
