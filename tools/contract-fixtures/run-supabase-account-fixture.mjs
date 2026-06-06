#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path, { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_BOT_IDENTITY,
  createBotSporeFromIdentity,
  updateBotIdentity
} from "../../packages/shared/dist/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const startedAt = new Date().toISOString();
const checks = [];
const tempRoot = await mkdtemp(join(tmpdir(), "superior-account-continuity-"));
const stateDirectory = join(tempRoot, "state");
const daemonCwd = join(tempRoot, "cwd");
const port = Number.parseInt(readArg("--port") ?? String(25000 + Math.floor(Math.random() * 1000)), 10);
const host = normalizeHost(`http://127.0.0.1:${port}`);
const supabaseUrl = "https://account-continuity-fixture.supabase.co";
const supabasePublishableKey = "sb_publishable_fixture_should_not_leak";
const accessToken = `supabase_access_token_fixture_${Date.now()}_must_not_leak`;
const providerSecret = "provider_refresh_token_should_not_exist";
const now = new Date().toISOString();
let daemonProcess = null;
let localBot = null;

try {
  await runCheck("supabase-source-boundary", async () => {
    const migrationPath = join(repoRoot, "supabase", "migrations", "202605300012_superior_account_spores.sql");
    const discordMigrationPath = join(repoRoot, "supabase", "migrations", "202606030720_account_avatar_discord.sql");
    const functionPath = join(repoRoot, "supabase", "functions", "account", "index.ts");

    for (const filePath of [migrationPath, discordMigrationPath, functionPath]) {
      assert(existsSync(filePath), `Missing Supabase account file: ${filePath}`);
    }

    const migration = readFileSync(migrationPath, "utf8");
    const discordMigration = readFileSync(discordMigrationPath, "utf8");
    const edgeFunction = readFileSync(functionPath, "utf8");

    for (const token of [
      "create table if not exists public.profiles",
      "create table if not exists public.bot_spores",
      "create table if not exists public.account_connections",
      "auth_providers text[]",
      "active_spore_id text",
      "enable row level security",
      "auth.uid() = user_id",
      "grant select, insert, update"
    ]) {
      assert(migration.includes(token), `Supabase migration missing expected account/RLS token: ${token}`);
    }

    for (const token of [
      "avatar_url text",
      "check (provider in ('google', 'x', 'discord'))"
    ]) {
      assert(discordMigration.includes(token), `Discord/avatar migration missing expected token: ${token}`);
    }

    for (const token of [
      "/start-email-code",
      "/start-oauth",
      "/verify-email-code",
      "/profile",
      "/spore",
      "SUPABASE_PUBLISHABLE_KEY",
      "signInWithOtp",
      "signInWithOAuth",
      "verifyOtp",
      "provider: oauthProvider",
      "\"google\"",
      "\"x\"",
      "\"discord\"",
      "avatar_url",
      "active_spore_id",
      "account_connections"
    ]) {
      assert(edgeFunction.includes(token), `Supabase Edge Function missing expected route/auth token: ${token}`);
    }

    assert(!/SERVICE_ROLE|service_role/.test(edgeFunction), "Account Edge Function must not require or expose service role keys.");

    return {
      providers: ["google", "x", "discord"],
      rls: "auth.uid() = user_id",
      serviceRole: "not-used"
    };
  });

  await runCheck("seed-local-account-and-spore", async () => {
    await mkdir(stateDirectory, { recursive: true });
    await mkdir(daemonCwd, { recursive: true });

    localBot = updateBotIdentity(
      {
        ...DEFAULT_BOT_IDENTITY,
        id: "local-spore-account-continuity",
        name: "Account Clawd",
        starterPresetId: "clawd",
        createdAt: now,
        updatedAt: now,
        browserLinkState: {
          status: "paired",
          pairingToken: "raw_pairing_token_fixture_must_not_leak",
          extensionId: "account-continuity-extension",
          lastSeenAt: now
        }
      },
      {
        body: "gremlin",
        color: "mossGreen",
        eye: "pixel",
        name: "Account Clawd",
        skills: ["article-xray", "repo-reader"]
      }
    );

    await writeFile(join(stateDirectory, "bot-identity.json"), `${JSON.stringify(localBot, null, 2)}\n`, "utf8");
    await writeFile(
      join(stateDirectory, "account-state.json"),
      `${JSON.stringify(
        {
          session: {
            type: "superior-account-session",
            userId: "00000000-0000-4000-8000-000000000019",
            email: "account-clawd@example.com",
            provider: "discord",
            accessToken,
            expiresAt: Math.floor(Date.now() / 1000) + 3600,
            createdAt: now
          },
          profile: {
            type: "superior-account-profile",
            userId: "00000000-0000-4000-8000-000000000019",
            email: "account-clawd@example.com",
            handle: "account-clawd",
            avatarUrl: "https://example.com/account-clawd.png",
            connectedProviders: ["google", "x", "discord"],
            activeSporeId: localBot.id,
            createdAt: now,
            updatedAt: now
          },
          pendingProvider: null,
          refreshToken: providerSecret
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    return {
      stateDirectory: "isolated",
      bot: `${localBot.id}/${localBot.body}/${localBot.color}/${localBot.eye}`,
      account: "discord plus google/x connection metadata"
    };
  });

  daemonProcess = await startDaemon();

  await runCheck("daemon-ready", async () => {
    const health = await getJson("/health");

    assert(health.service === "superior-daemon", "Expected SUPERIOR daemon health.");
    assert(health.localConfig?.stateDirectory === stateDirectory, "Expected isolated account fixture state directory.");

    return {
      status: health.status,
      openaiConfigured: health.openaiConfigured,
      stateDirectory: "isolated"
    };
  });

  await runCheck("setup-state-keeps-account-and-local-spore", async () => {
    const setup = await getJson("/setup-state");
    const serialized = JSON.stringify(setup);

    assert(setup.type === "superior-setup-state", "Expected setup state.");
    assert(setup.account?.status === "signed-in", "Expected signed-in account state.");
    assert(setup.account.handle === "account-clawd", "Expected local account handle.");
    assert(setup.account.avatarUrl === "https://example.com/account-clawd.png", "Expected account avatar.");
    assert(setup.account.connectedProviders?.join(",") === "google,x,discord", "Expected Google/X/Discord provider state.");
    assert(setup.activeBotSaved === true, "Expected local bot identity to remain saved.");
    assert(setup.bot?.identity?.id === localBot.id, "Expected setup state to use the local active spore.");
    assert(setup.bot.identity.body === "gremlin", "Expected local body to survive account state.");
    assert(setup.bot.identity.color === "mossGreen", "Expected local color to survive account state.");
    assert(setup.bot.identity.eye === "pixel", "Expected local eye to survive account state.");
    assert(!serialized.includes(accessToken), "Setup state must not expose Supabase access tokens.");
    assert(!serialized.includes(supabasePublishableKey), "Setup state must not expose publishable keys.");
    assert(!serialized.includes(providerSecret), "Setup state must not expose refresh/provider tokens.");

    return {
      account: setup.account.status,
      providers: setup.account.connectedProviders,
      bot: `${setup.bot.identity.body}/${setup.bot.identity.color}/${setup.bot.identity.eye}`,
      requiresSetup: setup.requiresSetup
    };
  });

  await runCheck("bot-identity-remains-local-authority", async () => {
    const bot = await getJson("/bot-identity");

    assert(bot.id === localBot.id, "Expected bot identity route to return local spore id.");
    assert(bot.name === "Account Clawd", "Expected local spore name.");
    assert(bot.body === "gremlin", "Expected local spore body.");
    assert(bot.color === "mossGreen", "Expected local spore color.");
    assert(bot.eye === "pixel", "Expected local spore eye.");
    assert(bot.skills.join(",") === "article-xray,repo-reader", "Expected local skill loadout.");

    return {
      id: bot.id,
      name: bot.name,
      skills: bot.skills
    };
  });

  await runCheck("portable-spore-export-stays-secret-free", async () => {
    const spore = createBotSporeFromIdentity(localBot);
    const serialized = JSON.stringify(spore);

    assert(spore.id === localBot.id, "Expected exported spore id to match local bot.");
    assert(spore.appearance.body === "gremlin", "Expected exported body to match.");
    assert(spore.pairings.chromeExtension?.safePairingId === "account-continuity-extension", "Expected safe extension id only.");
    assert(!serialized.includes("raw_pairing_token_fixture_must_not_leak"), "Portable spore must not include raw pairing token.");
    assert(!serialized.includes(accessToken), "Portable spore must not include account token.");
    assert(!serialized.includes(supabaseUrl), "Portable spore must not include Supabase URL.");
    assert(!serialized.includes(supabasePublishableKey), "Portable spore must not include publishable key.");
    assert(!serialized.includes("account-clawd@example.com"), "Portable spore must not include account email.");

    return {
      sporeId: spore.id,
      browserPairing: spore.pairings.chromeExtension?.status,
      skills: spore.skills.map((skill) => skill.id)
    };
  });

  await runCheck("mobile-companion-shows-account-without-secrets", async () => {
    const companion = await getJson("/mobile-companion");
    const serialized = JSON.stringify(companion);

    assert(companion.type === "superior-mobile-companion", "Expected mobile companion envelope.");
    assert(companion.bot?.id === localBot.id, "Expected mobile companion to use local active bot.");
    assert(companion.account?.status === "signed-in", "Expected mobile account status.");
    assert(companion.account.handle === "account-clawd", "Expected mobile account handle.");
    assert(companion.account.avatarUrl === "https://example.com/account-clawd.png", "Expected mobile avatar.");
    assert(companion.account.connectedProviders?.join(",") === "google,x,discord", "Expected mobile provider summary.");
    assert(!serialized.includes(accessToken), "Mobile companion must not expose Supabase access token.");
    assert(!serialized.includes(supabaseUrl), "Mobile companion must not expose Supabase URL.");
    assert(!serialized.includes(supabasePublishableKey), "Mobile companion must not expose publishable key.");
    assert(!serialized.includes(providerSecret), "Mobile companion must not expose provider refresh tokens.");
    assert(!serialized.includes(stateDirectory), "Mobile companion must not expose local state path.");
    assert(!serialized.includes("account-state.json"), "Mobile companion must not expose account file names.");
    assert(!serialized.includes("raw_pairing_token_fixture_must_not_leak"), "Mobile companion must not expose pairing token.");
    assert(!serialized.includes("OPENAI_API_KEY"), "Mobile companion must not expose model key names.");

    return {
      bot: companion.bot.name,
      account: companion.account.status,
      providers: companion.account.connectedProviders,
      sanitized: true
    };
  });

  await runCheck("sign-out-keeps-local-spore", async () => {
    const signedOutSetup = await postJson("/account/sign-out");
    const bot = await getJson("/bot-identity");
    const serialized = JSON.stringify(signedOutSetup);

    assert(signedOutSetup.type === "superior-setup-state", "Expected setup state after sign-out.");
    assert(signedOutSetup.account?.status === "signed-out", "Expected account to sign out locally.");
    assert(signedOutSetup.activeBotSaved === true, "Expected local spore file to remain saved after sign-out.");
    assert(signedOutSetup.bot?.identity?.id === localBot.id, "Expected setup state to keep local spore after sign-out.");
    assert(bot.id === localBot.id, "Expected bot identity route to keep local spore after sign-out.");
    assert(bot.body === "gremlin", "Expected local spore shape after sign-out.");
    assert(!serialized.includes(accessToken), "Signed-out setup state must not retain account token.");

    return {
      account: signedOutSetup.account.status,
      bot: bot.id,
      localSporeStillSaved: signedOutSetup.activeBotSaved
    };
  });
} finally {
  if (daemonProcess) {
    daemonProcess.kill("SIGTERM");
    await waitForExit(daemonProcess, 5_000);
  }

  await rmWithRetry(tempRoot);
}

const failedChecks = checks.filter((check) => check.status === "failed");
const report = {
  type: "superior-supabase-account-continuity-fixture-report",
  host,
  boundary: "account-state-local-session-plus-local-spore",
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

  assert(existsSync(daemonPath), "Missing daemon build output. Run corepack pnpm --filter @clawdbot/daemon build first.");

  const child = spawn(process.execPath, [daemonPath], {
    cwd: daemonCwd,
    env: {
      ...process.env,
      CLAWDBOT_STATE_DIR: stateDirectory,
      CLAWDBOT_DAEMON_PORT: String(port),
      CLAWDBOT_DAEMON_HOST: "127.0.0.1",
      SUPERIOR_ENV_PATH: join(tempRoot, "missing-env.local"),
      OPENAI_API_KEY: "",
      SUPABASE_URL: supabaseUrl,
      SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey
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

async function getJson(routePath) {
  const response = await fetch(`${host}${routePath}`);

  return readExpectedJson(response, 200);
}

async function postJson(routePath, payload, headers = {}, expectedStatus = 200) {
  const response = await fetch(`${host}${routePath}`, {
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
  const verificationDir = join(repoRoot, ".clawdbot", "verification");
  const reportPath = join(verificationDir, `supabase-account-continuity-fixture-${Date.now()}.json`);

  await mkdir(verificationDir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return reportPath;
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

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);

    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function rmWithRetry(targetPath) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await rm(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 7 || error?.code !== "EBUSY") {
        throw error;
      }

      await sleep(250);
    }
  }
}
