#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const host = normalizeHost(readArg("--host") ?? process.env.SUPERIOR_FIXTURE_HOST ?? "http://127.0.0.1:5317");
const startedAt = new Date().toISOString();
const checks = [];
let botIdentity = null;

await runCheck("health", async () => {
  const health = await getJson("/health");

  assert(health.service === "superior-daemon", "Expected SUPERIOR daemon health.");
  assert(typeof health.status === "string", "Expected health status.");

  return {
    status: health.status,
    openaiConfigured: Boolean(health.openaiConfigured),
    browserLinkState: health.browserLinkState?.status ?? "unknown"
  };
});

await runCheck("bot-identity-read", async () => {
  botIdentity = await getJson("/bot-identity");

  assert(typeof botIdentity.id === "string", "Expected bot id.");
  assert(typeof botIdentity.name === "string", "Expected bot name.");
  assert(Array.isArray(botIdentity.skills), "Expected bot skills.");

  return {
    id: botIdentity.id,
    name: botIdentity.name,
    body: botIdentity.body,
    color: botIdentity.color,
    eye: botIdentity.eye
  };
});

await runCheck("bot-presets", async () => {
  const presets = await getJson("/bot-presets");
  const ids = presets.items?.map((item) => item.id) ?? [];
  const runnableIds = new Set(["page-explainer", "article-xray", "repo-reader"]);

  assert(presets.type === "bot-starter-presets", "Expected bot starter presets response.");
  assert(ids.includes("clawd"), "Expected Clawd preset.");
  assert(ids.includes("hermes"), "Expected Hermes preset.");
  assert(ids.includes("mote"), "Expected Mote preset.");
  assert(
    presets.items.every((item) => item.skills?.every((skillId) => runnableIds.has(skillId))),
    "Expected presets to use runnable skills only."
  );

  return {
    ids,
    count: ids.length
  };
});

await runCheck("bot-creation-options", async () => {
  const options = await getJson("/bot-creation-options");
  const shapeIds = options.shapes?.map((item) => item.id) ?? [];
  const skillIds = options.skills?.map((item) => item.skillId) ?? [];

  assert(options.type === "bot-creation-options", "Expected bot creation options response.");
  assert(shapeIds.join(",") === "orb,gremlin,scanner,sentinel,core", "Expected setup shape order.");
  assert(skillIds.includes("page-explainer"), "Expected Page Explainer loadout option.");
  assert(skillIds.includes("article-xray"), "Expected Article X-Ray loadout option.");
  assert(skillIds.includes("repo-reader"), "Expected Repo Reader loadout option.");

  return {
    shapes: shapeIds,
    skills: skillIds
  };
});

await runCheck("setup-state", async () => {
  const setup = await getJson("/setup-state");
  const steps = setup.steps?.map((item) => item.step) ?? [];
  const expectedSteps = ["account", "daemon", "key", "model", "browser", "starter", "skills", "assembly", "finish"];

  assert(setup.type === "superior-setup-state", "Expected setup state response.");
  assert(typeof setup.activeBotSaved === "boolean", "Expected activeBotSaved flag.");
  assert(typeof setup.requiresSetup === "boolean", "Expected requiresSetup flag.");
  assert(steps.join(",") === expectedSteps.join(","), "Expected setup step order.");
  assert(setup.bot?.identity?.id === botIdentity.id, "Expected setup state active bot.");

  return {
    requiresSetup: setup.requiresSetup,
    steps,
    key: setup.key?.status,
    browser: setup.browser?.status
  };
});

await runCheck("mobile-companion", async () => {
  const companion = await getJson("/mobile-companion");
  const serialized = JSON.stringify(companion);

  assert(companion.type === "superior-mobile-companion", "Expected mobile companion response.");
  assert(companion.bot?.id === botIdentity.id, "Expected mobile companion active bot.");
  assert(companion.asset?.format === "glb", "Expected mobile companion GLB asset.");
  assert(Array.isArray(companion.bot?.equippedSkills), "Expected equipped skill summaries.");
  assert(Array.isArray(companion.recentProof), "Expected recent proof list.");
  assert(!serialized.includes("pair_"), "Mobile companion must not expose raw pairing tokens.");
  assert(!serialized.includes("OPENAI_API_KEY"), "Mobile companion must not expose model keys.");
  assert(!serialized.includes("browser-profiles"), "Mobile companion must not expose browser profile paths.");
  assert(!serialized.includes("debugPort"), "Mobile companion must not expose debug ports.");
  assert(!serialized.includes("cleanText"), "Mobile companion must not expose page text.");

  return {
    bot: companion.bot.name,
    asset: companion.asset.id,
    proofCount: companion.recentProof.length,
    browser: companion.device?.browser?.status ?? "unknown"
  };
});

await runCheck("bot-identity-roundtrip", async () => {
  assert(botIdentity, "Bot identity was not loaded.");

  const saved = await postJson("/bot-identity", botIdentity);

  assert(saved.id === botIdentity.id, "Expected saved bot id to match.");
  assert(saved.name === botIdentity.name, "Expected saved bot name to match.");
  assert(Array.isArray(saved.skills), "Expected saved bot skills.");

  return {
    id: saved.id,
    name: saved.name,
    browserLinkState: saved.browserLinkState?.status ?? "unknown"
  };
});

await runCheck("function-catalog", async () => {
  const catalog = await getJson("/functions");
  const ids = catalog.items?.map((item) => item.id) ?? [];

  assert(catalog.type === "superior-function-catalog", "Expected function catalog type.");
  assert(ids.includes("article-xray"), "Expected Article X-Ray function.");
  assert(ids.includes("repo-reader"), "Expected Repo Reader function.");

  return {
    count: ids.length,
    ids
  };
});

await runCheck("unknown-function-error", async () => {
  const result = await postJson(
    "/functions/run",
    {
      type: "superior-function-run",
      requestId: createFixtureId("unknown"),
      functionId: "missing-native-part",
      input: {},
      createdAt: new Date().toISOString()
    },
    400
  );

  assert(result.type === "superior-function-error", "Expected typed function error.");
  assert(result.code === "unknown_function", "Expected unknown_function code.");

  return {
    code: result.code,
    events: result.events?.map((event) => event.kind) ?? []
  };
});

await runCheck("workshop-function-validation", async () => {
  const result = await postJson(
    "/functions/run",
    {
      type: "superior-function-run",
      requestId: createFixtureId("repo_bad"),
      functionId: "repo-reader",
      input: {
        type: "repo-reader",
        requestId: createFixtureId("repo_input")
      },
      bot: botIdentity,
      createdAt: new Date().toISOString()
    },
    400
  );

  assert(result.type === "superior-function-error", "Expected typed function error.");
  assert(result.code === "bad_request", "Expected bad_request for malformed Repo Reader input.");
  assert(result.botReaction?.state === "failure", "Expected physical failure reaction.");

  return {
    code: result.code,
    reaction: result.botReaction.label
  };
});

await runCheck("runtime-state-shapes", async () => {
  const [recentRuns, runtimeState, runtimeEvents] = await Promise.all([
    getJson("/function-runs/recent"),
    getJson("/browser-runtime"),
    getJson("/browser-runtime/events")
  ]);

  assert(recentRuns.type === "superior-function-runs", "Expected recent function runs response.");
  assert(typeof runtimeState.status === "string", "Expected browser runtime status.");
  assert(Array.isArray(runtimeEvents.items), "Expected browser runtime events.");

  return {
    recentRunCount: recentRuns.items.length,
    browserStatus: runtimeState.status,
    browserEventCount: runtimeEvents.items.length
  };
});

const failedChecks = checks.filter((check) => check.status === "failed");
const report = {
  type: "superior-host-contract-fixture-report",
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
  const reportPath = join(outputDirectory, `host-contract-fixture-${Date.now()}.json`);

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
