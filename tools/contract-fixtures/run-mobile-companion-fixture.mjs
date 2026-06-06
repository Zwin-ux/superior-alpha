#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_BOT_IDENTITY,
  createArticleXrayRequest,
  createSuperiorFunctionRunRequest,
  updateBotIdentity
} from "../../packages/shared/dist/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const startedAt = new Date().toISOString();
const checks = [];
const requestedHost = readArg("--host");
const tempRoot = await mkdtemp(join(tmpdir(), "superior-mobile-companion-"));
const stateDirectory = join(tempRoot, "state");
const daemonCwd = join(tempRoot, "cwd");
const port = Number.parseInt(readArg("--port") ?? String(24000 + Math.floor(Math.random() * 1000)), 10);
const host = normalizeHost(requestedHost ?? `http://127.0.0.1:${port}`);
const secretPageText = `MOBILE_SECRET_PAGE_TEXT_${Date.now()} should stay inside the desktop daemon result history.`;
let daemonProcess = null;
let pairingToken = "";
let functionRequestId = "";
let botIdentity = null;

try {
  if (!requestedHost) {
    await mkdir(stateDirectory, { recursive: true });
    await mkdir(daemonCwd, { recursive: true });
    daemonProcess = await startDaemon();
  }

  await runCheck("daemon-ready", async () => {
    const health = await getJson("/health");

    assert(health.service === "superior-daemon", "Expected SUPERIOR daemon health.");

    return {
      status: health.status,
      stateDirectory: health.localConfig?.stateDirectory,
      browser: health.browserLinkState?.status
    };
  });

  await runCheck("save-mobile-proof-bot", async () => {
    const now = new Date().toISOString();
    const mobileBot = updateBotIdentity(
      {
        ...DEFAULT_BOT_IDENTITY,
        id: "mobile-companion-fixture-clawd",
        name: "Mobile Clawd",
        starterPresetId: "clawd",
        createdAt: now,
        updatedAt: now,
        browserLinkState: {
          status: "unpaired"
        }
      },
      {
        body: "gremlin",
        color: "mossGreen",
        eye: "pixel",
        name: "Mobile Clawd",
        skills: ["article-xray", "repo-reader"]
      }
    );
    botIdentity = await putJson("/bot-identity", mobileBot);

    assert(botIdentity.name === "Mobile Clawd", "Expected fixture bot saved.");
    assert(botIdentity.body === "gremlin", "Expected mobile fixture Gremlin body.");
    assert(botIdentity.color === "mossGreen", "Expected mobile fixture Moss Green pigment.");
    assert(botIdentity.eye === "pixel", "Expected mobile fixture Pixel eye.");

    return {
      id: botIdentity.id,
      body: botIdentity.body,
      color: botIdentity.color,
      eye: botIdentity.eye,
      skills: botIdentity.skills
    };
  });

  await runCheck("pair-browser-hand", async () => {
    const started = await postJson("/browser-link/start");

    assert(typeof started.pairingToken === "string", "Expected raw pairing token.");
    pairingToken = started.pairingToken;

    const completed = await postJson("/browser-link/complete", {
      type: "browser-pairing-complete",
      requestId: createFixtureId("mobile_pair"),
      pairingToken,
      extensionId: "mobile-companion-fixture-extension",
      createdAt: new Date().toISOString()
    });

    assert(completed.browserLinkState?.status === "paired", "Expected paired browser state.");

    return {
      browser: completed.browserLinkState.status,
      extensionId: completed.browserLinkState.extensionId
    };
  });

  await runCheck("run-secret-page-proof", async () => {
    const articleRequest = createArticleXrayRequest({
      pairingToken,
      bot: botIdentity,
      page: {
        url: "https://example.com/mobile-companion?secret-token=raw-url-query-must-not-leak",
        title: "Mobile Companion Privacy Fixture",
        selectedText: `${secretPageText} The fixture proves the mobile companion surface can show proof without carrying article body text.`,
        bodyText: `${secretPageText} Duplicate body text should also remain out of the mobile companion response.`,
        capturedAt: new Date().toISOString()
      }
    });
    const functionRun = createSuperiorFunctionRunRequest({
      functionId: "article-xray",
      input: articleRequest,
      bot: botIdentity
    });
    functionRequestId = functionRun.requestId;

    const result = await postJson(
      "/functions/run",
      functionRun,
      {
        "X-Clawdbot-Pairing-Token": pairingToken
      }
    );

    assert(result.type === "superior-function-run-result", "Expected function result.");
    assert(result.result?.type === "article-xray-result", "Expected Article X-Ray payload.");
    assert(JSON.stringify(result).includes(secretPageText), "Expected daemon result to contain sentinel page text.");

    return {
      runId: result.runId,
      requestId: functionRequestId,
      resultContainsSentinel: true
    };
  });

  await runCheck("mobile-companion-is-sanitized", async () => {
    const companion = await getJson("/mobile-companion");
    const serialized = JSON.stringify(companion);

    assert(companion.type === "superior-mobile-companion", "Expected mobile companion envelope.");
    assert(companion.bot?.id === botIdentity.id, "Expected companion to use active bot.");
    assert(companion.asset?.id === "mobile-clawd-gremlin", "Expected mobile GLB asset reference.");
    assert(companion.recentProof?.some((item) => item.functionId === "article-xray"), "Expected recent proof item.");
    assert(!serialized.includes(pairingToken), "Mobile companion must not expose raw pairing token.");
    assert(!serialized.includes(secretPageText), "Mobile companion must not expose page text.");
    assert(!serialized.includes("raw-url-query-must-not-leak"), "Mobile companion must not expose full captured URL.");
    assert(!serialized.includes(stateDirectory), "Mobile companion must not expose local state paths.");
    assert(!serialized.includes("browser-profiles"), "Mobile companion must not expose browser profile paths.");
    assert(!serialized.includes("debugPort"), "Mobile companion must not expose debug ports.");
    assert(!serialized.includes(".env.local"), "Mobile companion must not expose key file paths.");
    assert(!serialized.includes("OPENAI_API_KEY"), "Mobile companion must not expose model key names.");
    assert(!serialized.includes("cleanText"), "Mobile companion must not expose Article X-Ray raw output fields.");

    return {
      proofCount: companion.recentProof.length,
      asset: companion.asset.id,
      browser: companion.device.browser.status,
      sanitized: true
    };
  });
} finally {
  if (daemonProcess) {
    daemonProcess.kill("SIGTERM");
  }

  await rm(tempRoot, { recursive: true, force: true });
}

const failedChecks = checks.filter((check) => check.status === "failed");
const report = {
  type: "superior-mobile-companion-fixture-report",
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

async function startDaemon() {
  const daemonPath = join(repoRoot, "apps", "daemon", "dist", "server.js");
  const child = spawn(process.execPath, [daemonPath], {
    cwd: daemonCwd,
    env: {
      ...process.env,
      CLAWDBOT_STATE_DIR: stateDirectory,
      CLAWDBOT_DAEMON_PORT: String(port),
      CLAWDBOT_DAEMON_HOST: "127.0.0.1",
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
      const health = await getJson("/health");

      if (health.service === "superior-daemon") {
        return child;
      }
    } catch {
      await sleep(250);
    }
  }

  child.kill("SIGTERM");
  throw new Error("Timed out waiting for temporary SUPERIOR daemon.");
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

async function putJson(path, payload, expectedStatus = 200) {
  const response = await fetch(`${host}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
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
  const verificationDir = join(repoRoot, ".clawdbot", "verification");
  const reportPath = join(verificationDir, `mobile-companion-fixture-${Date.now()}.json`);

  await mkdir(verificationDir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return reportPath;
}

function createFixtureId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readArg(name) {
  const index = process.argv.indexOf(name);

  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizeHost(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
