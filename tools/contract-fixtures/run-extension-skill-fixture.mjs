#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const host = normalizeHost(readArg("--host") ?? process.env.SUPERIOR_FIXTURE_HOST ?? "http://127.0.0.1:5317");
const keepPairing = hasArg("--keep-pairing");
const startedAt = new Date().toISOString();
const checks = [];
let pairingToken = "";
let botIdentity = null;
let functionRunRequestId = "";

await runCheck("health", async () => {
  const health = await getJson("/health");

  assert(health.service === "superior-daemon", "Expected SUPERIOR daemon health.");

  return {
    status: health.status,
    openaiConfigured: Boolean(health.openaiConfigured)
  };
});

await runCheck("pair-extension", async () => {
  const started = await postJson("/browser-link/start");

  assert(typeof started.pairingToken === "string" && started.pairingToken.length > 0, "Expected pairing token.");
  pairingToken = started.pairingToken;

  const completed = await postJson("/browser-link/complete", {
    type: "browser-pairing-complete",
    requestId: createFixtureId("pair"),
    pairingToken,
    extensionId: "contract-fixture-extension",
    createdAt: new Date().toISOString()
  });

  assert(completed.type === "browser-pairing-complete-result", "Expected browser pairing completion.");
  assert(completed.browserLinkState?.status === "paired", "Expected paired browser state.");

  return {
    browserLinkState: completed.browserLinkState.status
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

await runCheck("function-catalog", async () => {
  const catalog = await getJson("/functions");
  const ids = catalog.items?.map((item) => item.id) ?? [];

  assert(catalog.type === "superior-function-catalog", "Expected function catalog.");
  assert(ids.includes("article-xray"), "Expected Article X-Ray function.");
  assert(ids.includes("page-explainer"), "Expected Page Explainer function.");

  return {
    count: ids.length,
    ids
  };
});

await runCheck("extension-style-skill-call", async () => {
  assert(pairingToken, "Pairing token was not created.");
  assert(botIdentity, "Bot identity was not loaded.");

  const createdAt = new Date().toISOString();
  const articleRequest = {
    type: "article-xray",
    requestId: createFixtureId("xray"),
    pairingToken,
    bot: botIdentity,
    page: {
      url: "https://example.com/superior-fixture",
      title: "SUPERIOR Extension Fixture",
      selectedText:
        "SUPERIOR extension-style skill calls should run through the function kernel. This fixture proves a paired extension token, captured page context, daemon proof events, and physical bot reaction payload all travel through one contract.",
      bodyText:
        "SUPERIOR extension-style skill calls should run through the function kernel. This fixture proves a paired extension token, captured page context, daemon proof events, and physical bot reaction payload all travel through one contract.",
      capturedAt: createdAt
    },
    createdAt
  };
  const functionRun = {
    type: "superior-function-run",
    requestId: createFixtureId("function"),
    functionId: "article-xray",
    input: articleRequest,
    bot: botIdentity,
    createdAt
  };
  functionRunRequestId = functionRun.requestId;

  const result = await postJson("/functions/run", functionRun, {
    "X-Clawdbot-Pairing-Token": pairingToken
  });

  assert(result.type === "superior-function-run-result", "Expected function run result.");
  assert(result.result?.type === "article-xray-result", "Expected Article X-Ray payload.");
  assert(result.botReaction?.state === "success", "Expected success bot reaction.");
  assert(result.botReaction?.slot === "eye", "Expected eye slot bot reaction.");
  assert(result.events?.some((event) => event.kind === "browser_context_received"), "Expected browser context proof event.");
  assert(result.events?.some((event) => event.kind === "result_saved"), "Expected result saved proof event.");

  return {
    runId: result.runId,
    resultType: result.result.type,
    reaction: result.botReaction.label,
    slot: result.botReaction.slot,
    eventKinds: result.events.map((event) => event.kind)
  };
});

await runCheck("invalid-token-blocks-skill-call", async () => {
  assert(botIdentity, "Bot identity was not loaded.");

  const createdAt = new Date().toISOString();
  const badToken = "pair_fixture_invalid";
  const result = await postJson(
    "/functions/run",
    {
      type: "superior-function-run",
      requestId: createFixtureId("function_bad"),
      functionId: "article-xray",
      input: {
        type: "article-xray",
        requestId: createFixtureId("xray_bad"),
        pairingToken: badToken,
        bot: botIdentity,
        page: {
          url: "https://example.com/bad-token",
          title: "Bad Token",
          selectedText: "This should not run because the extension token is invalid.",
          capturedAt: createdAt
        },
        createdAt
      },
      bot: botIdentity,
      createdAt
    },
    {
      "X-Clawdbot-Pairing-Token": badToken
    },
    401
  );

  assert(result.type === "superior-function-error", "Expected typed function error.");
  assert(result.code === "unauthorized", "Expected unauthorized for invalid token.");

  return {
    code: result.code,
    reaction: result.botReaction?.state ?? "none"
  };
});

await runCheck("recent-function-proof", async () => {
  const recent = await getJson("/function-runs/recent");
  const matching = recent.items?.find((item) => item.requestId === functionRunRequestId);

  assert(recent.type === "superior-function-runs", "Expected recent function runs.");
  assert(matching, "Expected recent proof for extension-style skill call.");
  assert(matching.botReaction?.slot === "eye", "Expected recent proof reaction slot.");

  return {
    matchedRunId: matching.runId,
    label: matching.label,
    reaction: matching.botReaction.label
  };
});

if (!keepPairing) {
  await runCheck("cleanup-pairing", async () => {
    const reset = await postJson("/browser-link/reset");

    assert(reset.type === "browser-pairing-reset-result", "Expected pairing reset result.");
    assert(reset.browserLinkState?.status === "unpaired", "Expected unpaired browser state.");

    return {
      browserLinkState: reset.browserLinkState.status
    };
  });
}

const failedChecks = checks.filter((check) => check.status === "failed");
const report = {
  type: "superior-extension-skill-fixture-report",
  host,
  keepPairing,
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
  const reportPath = join(outputDirectory, `extension-skill-fixture-${Date.now()}.json`);

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

function hasArg(name) {
  return process.argv.includes(name);
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
