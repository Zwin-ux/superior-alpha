#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DEFAULT_BOT_IDENTITY,
  createArticleXrayRequest,
  createBotIconSvg,
  createBotSporeFromIdentity,
  createSuperiorFunctionRunRequest,
  getEquippedSkillSlots,
  updateBotIdentity
} from "../../packages/shared/dist/index.js";

const host = normalizeHost(readArg("--host") ?? process.env.SUPERIOR_FIXTURE_HOST ?? "http://127.0.0.1:5317");
const restoreOriginal = hasArg("--restore-original");
const resetPairing = hasArg("--reset-pairing");
const startedAt = new Date().toISOString();
const checks = [];
const loop = [
  "SUPERIOR boot",
  "register account",
  "hatch bot",
  "choose shape",
  "equip skill",
  "connect Chrome",
  "extension icon becomes exact bot",
  "run skill",
  "bot physically reacts"
];

let originalBot = null;
let demoBot = null;
let pairedBot = null;
let pairingToken = "";
let functionRunRequestId = "";
let lastIconHash = "";

await runCheck("daemon-ready", async () => {
  const health = await getJson("/health");

  assert(health.service === "superior-daemon", "Expected SUPERIOR daemon health.");

  return {
    status: health.status,
    stateDirectory: health.localConfig?.stateDirectory,
    browser: health.browserLinkState?.status
  };
});

await runCheck("capture-original-spore", async () => {
  originalBot = await getJson("/bot-identity");

  assert(typeof originalBot.name === "string", "Expected current bot identity.");

  return {
    name: originalBot.name,
    body: originalBot.body,
    color: originalBot.color,
    eye: originalBot.eye,
    skills: originalBot.skills
  };
});

await runCheck("clear-browser-hand", async () => {
  const reset = await postJson("/browser-link/reset");

  assert(reset.type === "browser-pairing-reset-result", "Expected browser reset result.");
  assert(reset.browserLinkState?.status === "unpaired", "Expected clean unpaired browser hand.");

  return {
    browser: reset.browserLinkState.status
  };
});

await runCheck("save-one-active-spore", async () => {
  const now = new Date().toISOString();
  demoBot = updateBotIdentity(
    {
      ...DEFAULT_BOT_IDENTITY,
      id: "superior-spore-clawd-alpha",
      name: "Clawd",
      starterPresetId: "clawd",
      createdAt: now,
      updatedAt: now,
      browserLinkState: {
        status: "unpaired"
      }
    },
    {
      name: "Clawd",
      body: "gremlin",
      color: "mossGreen",
      eye: "pixel",
      skills: ["article-xray"]
    }
  );

  const saved = await putJson("/bot-identity", demoBot);

  assert(saved.name === "Clawd", "Expected Clawd to be the active spore.");
  assert(saved.body === "gremlin", "Expected Gremlin shape.");
  assert(saved.color === "mossGreen", "Expected Moss Green pigment.");
  assert(saved.eye === "pixel", "Expected Pixel Eye.");
  assert(saved.skills.length === 1 && saved.skills[0] === "article-xray", "Expected one equipped skill.");
  assert(getEquippedSkillSlots(saved).join(",") === "eye", "Expected Article X-Ray in the Eye slot.");

  return {
    id: saved.id,
    name: saved.name,
    appearance: {
      body: saved.body,
      color: saved.color,
      eye: saved.eye
    },
    skills: saved.skills,
    slots: getEquippedSkillSlots(saved)
  };
});

await runCheck("setup-state-sees-spore", async () => {
  const setup = await getJson("/setup-state");

  assert(setup.type === "superior-setup-state", "Expected setup state.");
  assert(setup.activeBotSaved === true, "Expected active bot saved.");
  assert(setup.bot?.identity?.id === "superior-spore-clawd-alpha", "Expected setup state to point at Clawd.");
  assert(setup.bot.identity.body === "gremlin", "Expected setup state shape to match Clawd.");

  return {
    requiresSetup: setup.requiresSetup,
    botStatus: setup.bot.status,
    browser: setup.browser.status,
    model: setup.model.modelProvider
  };
});

await runCheck("spore-export-is-safe", async () => {
  const spore = createBotSporeFromIdentity(demoBot);
  const serialized = JSON.stringify(spore);

  assert(spore.schemaVersion === "0.1", "Expected portable spore schema.");
  assert(spore.name === "Clawd", "Expected Clawd spore export.");
  assert(spore.appearance.body === "gremlin", "Expected spore body to match active bot.");
  assert(spore.appearance.color === "mossGreen", "Expected spore pigment to match active bot.");
  assert(spore.appearance.eye === "pixel", "Expected spore eye to match active bot.");
  assert(spore.skills.length === 1 && spore.skills[0].id === "article-xray", "Expected one exported skill.");
  assert(!serialized.includes("pairingToken"), "Spore export must not include raw pairing token fields.");
  assert(!serialized.includes("OPENAI_API_KEY"), "Spore export must not include local model secrets.");

  return {
    sporeId: spore.id,
    species: spore.species,
    hash: hashString(serialized),
    skills: spore.skills.map((skill) => skill.id)
  };
});

await runCheck("extension-icon-is-exact-spore", async () => {
  const defaultIcon = createBotIconSvg(DEFAULT_BOT_IDENTITY);
  const clawdIcon = createBotIconSvg(demoBot);
  const defaultIconHash = hashString(defaultIcon);
  lastIconHash = hashString(clawdIcon);

  assert(defaultIconHash !== lastIconHash, "Expected custom Clawd icon to differ from default.");
  assert(clawdIcon.includes("#7f9b64"), "Expected Moss Green clay pigment in the generated icon.");
  assert(clawdIcon.includes("M24 15 L16 4"), "Expected Gremlin antenna silhouette in the generated icon.");
  assert(clawdIcon.includes("#7cc8d8"), "Expected Article X-Ray lens attachment in the generated icon.");

  return {
    iconSizes: [16, 32, 48, 128, 256],
    iconHash: lastIconHash,
    proof: "extension action icon renderer receives the same body/color/eye/skill identity"
  };
});

await runCheck("connect-chrome-hand", async () => {
  const started = await postJson("/browser-link/start");

  assert(typeof started.pairingToken === "string" && started.pairingToken.length > 0, "Expected pairing token.");
  pairingToken = started.pairingToken;

  const completed = await postJson("/browser-link/complete", {
    type: "browser-pairing-complete",
    requestId: createFixtureId("spore_pair"),
    pairingToken,
    extensionId: "spore-ownership-demo-extension",
    createdAt: new Date().toISOString()
  });

  assert(completed.type === "browser-pairing-complete-result", "Expected pairing completion.");
  assert(completed.browserLinkState?.status === "paired", "Expected browser hand paired.");

  pairedBot = await getJson("/bot-identity");

  assert(pairedBot.browserLinkState?.status === "paired", "Expected bot identity to carry paired browser hand.");
  assert(pairedBot.body === demoBot.body, "Expected paired identity body to stay exact.");
  assert(pairedBot.color === demoBot.color, "Expected paired identity color to stay exact.");
  assert(pairedBot.eye === demoBot.eye, "Expected paired identity eye to stay exact.");

  return {
    browser: completed.browserLinkState.status,
    extensionId: completed.browserLinkState.extensionId,
    bot: `${pairedBot.body}/${pairedBot.color}/${pairedBot.eye}`
  };
});

await runCheck("paired-spore-stays-safe", async () => {
  const spore = createBotSporeFromIdentity(pairedBot);
  const serialized = JSON.stringify(spore);

  assert(spore.pairings.chromeExtension?.status === "ready", "Expected Chrome extension pairing to export as ready.");
  assert(spore.pairings.chromeExtension?.safePairingId === "spore-ownership-demo-extension", "Expected safe extension id.");
  assert(!serialized.includes(pairingToken), "Portable spore must not export the raw pairing token.");

  return {
    chromeExtension: spore.pairings.chromeExtension,
    hash: hashString(serialized)
  };
});

await runCheck("run-equipped-skill", async () => {
  assert(pairingToken, "Pairing token was not created.");
  assert(pairedBot, "Paired bot was not loaded.");

  const articleRequest = createArticleXrayRequest({
    pairingToken,
    bot: pairedBot,
    page: {
      url: "https://example.com/superior-spore-proof",
      title: "SUPERIOR Spore Ownership Proof",
      selectedText:
        "SUPERIOR proves ownership when a created creature becomes the browser icon, runs a skill from Chrome, and reacts back in the workshop. This fixture keeps that loop narrow and fundable.",
      bodyText:
        "SUPERIOR proves ownership when a created creature becomes the browser icon, runs a skill from Chrome, and reacts back in the workshop. This fixture keeps that loop narrow and fundable.",
      capturedAt: new Date().toISOString()
    }
  });
  const functionRun = createSuperiorFunctionRunRequest({
    functionId: "article-xray",
    input: articleRequest,
    bot: pairedBot
  });
  functionRunRequestId = functionRun.requestId;

  const result = await postJson("/functions/run", functionRun, {
    "X-Clawdbot-Pairing-Token": pairingToken
  });

  assert(result.type === "superior-function-run-result", "Expected function runner result.");
  assert(result.status === "completed", "Expected completed function run.");
  assert(result.result?.type === "article-xray-result", "Expected Article X-Ray result.");
  assert(result.botReaction?.state === "success", "Expected success bot reaction.");
  assert(result.botReaction?.slot === "eye", "Expected Eye slot reaction.");

  return {
    runId: result.runId,
    reaction: result.botReaction.label,
    slot: result.botReaction.slot,
    events: result.events.map((event) => event.kind)
  };
});

await runCheck("recent-proof-shows-reaction", async () => {
  const recent = await getJson("/function-runs/recent");
  const matching = recent.items?.find((item) => item.requestId === functionRunRequestId);

  assert(recent.type === "superior-function-runs", "Expected recent function runs response.");
  assert(matching, "Expected recent proof for the spore-owned skill run.");
  assert(matching.botReaction?.state === "success", "Expected recent proof to carry success reaction.");
  assert(matching.botReaction?.slot === "eye", "Expected recent proof to carry Eye slot.");

  return {
    runId: matching.runId,
    summary: matching.summary,
    reaction: matching.botReaction.label,
    slot: matching.botReaction.slot
  };
});

if (resetPairing) {
  await runCheck("reset-browser-hand", async () => {
    const reset = await postJson("/browser-link/reset");

    assert(reset.type === "browser-pairing-reset-result", "Expected pairing reset result.");

    return {
      browser: reset.browserLinkState.status
    };
  });
}

if (restoreOriginal && originalBot) {
  await runCheck("restore-original-spore", async () => {
    const restored = await putJson("/bot-identity", originalBot);

    assert(restored.id === originalBot.id, "Expected original bot restored.");

    return {
      name: restored.name,
      body: restored.body,
      color: restored.color,
      eye: restored.eye
    };
  });
}

const failedChecks = checks.filter((check) => check.status === "failed");
const report = {
  type: "superior-spore-ownership-fixture-report",
  host,
  loop,
  demoSpore: demoBot
    ? {
        id: demoBot.id,
        name: demoBot.name,
        body: demoBot.body,
        color: demoBot.color,
        eye: demoBot.eye,
        skills: demoBot.skills,
        iconHash: lastIconHash
      }
    : undefined,
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

async function putJson(path, payload, headers = {}, expectedStatus = 200) {
  const response = await fetch(`${host}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(payload)
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
  const reportPath = join(outputDirectory, `spore-ownership-fixture-${Date.now()}.json`);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

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

function hashString(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
