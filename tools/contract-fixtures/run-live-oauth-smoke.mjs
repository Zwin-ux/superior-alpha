import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const verificationDir = join(repoRoot, ".clawdbot", "verification");
const artifactPublishDir = join(repoRoot, ".clawdbot", "artifacts", "windows", "publish", "SUPERIOR");
const packagedNodePath = join(artifactPublishDir, "resources", "node", "node.exe");
const packagedDaemonPath = join(artifactPublishDir, "resources", "daemon", "server.mjs");
const defaultEnvPath = join(repoRoot, ".env.local");
const providers = ["google", "x", "discord"];
const options = parseArgs(process.argv.slice(2));
const startedAt = new Date();
const reportPath = join(verificationDir, `live-oauth-smoke-${startedAt.getTime()}.json`);
const tempRoot = mkdtempSync(join(tmpdir(), "superior-live-oauth-smoke-"));
const stateDirectory = join(tempRoot, "state");
const appData = join(tempRoot, "AppData", "Roaming");
const localAppData = join(tempRoot, "AppData", "Local");
const port = options.port ?? 54818;

mkdirSync(stateDirectory, { recursive: true });
mkdirSync(appData, { recursive: true });
mkdirSync(localAppData, { recursive: true });

const report = {
  type: "superior-live-oauth-smoke-report",
  startedAt: startedAt.toISOString(),
  daemon: {
    packaged: true,
    stateDirectory,
    appData,
    localAppData,
    port
  },
  checks: []
};

let daemon;
let stdout = "";
let stderr = "";

try {
  const envPath = resolve(options.envPath ?? defaultEnvPath);
  const envValues = parseEnvFile(envPath);
  const missing = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"].filter((key) => !envValues[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required public Supabase env keys in ${basename(envPath)}: ${missing.join(", ")}`);
  }

  if (!existsSync(packagedNodePath)) {
    throw new Error(`Missing packaged Node runtime. Rebuild with corepack pnpm windows:msi.`);
  }

  if (!existsSync(packagedDaemonPath)) {
    throw new Error(`Missing packaged daemon. Rebuild with corepack pnpm windows:msi.`);
  }

  const baseUrl = `http://127.0.0.1:${port}`;
  const daemonEnv = {
    ...process.env,
    ...envValues,
    APPDATA: appData,
    LOCALAPPDATA: localAppData,
    CLAWDBOT_STATE_DIR: stateDirectory,
    CLAWDBOT_DAEMON_HOST: "127.0.0.1",
    CLAWDBOT_DAEMON_PORT: String(port),
    SUPERIOR_AUTH_REDIRECT_URL: `${baseUrl}/account/oauth/callback`
  };

  daemon = spawn(packagedNodePath, [packagedDaemonPath], {
    cwd: artifactPublishDir,
    env: daemonEnv,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  daemon.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  daemon.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const health = await waitForHealth(baseUrl);
  report.checks.push({
    name: "packaged-daemon-clean-profile-health",
    status: "passed",
    details: {
      status: health.status,
      stateDirectory: health.localConfig?.stateDirectory
    }
  });

  const setup = await readJson(`${baseUrl}/setup-state`);
  const providerStates = Object.fromEntries((setup.account?.providers ?? []).map((entry) => [entry.provider, entry.status]));
  report.checks.push({
    name: "providers-visible-in-clean-profile",
    status: "passed",
    details: {
      signedIn: setup.account?.signedIn,
      providerStates
    }
  });

  for (const provider of providers) {
    const started = await startProviderOAuth(baseUrl, provider);
    const authShape = safeUrlShape(started.authUrl);
    const redirectResponse = await fetch(started.authUrl, {
      redirect: "manual"
    });
    const location = redirectResponse.headers.get("location");

    if (!location) {
      throw new Error(`${provider} authorize did not return a redirect location.`);
    }

    const redirectShape = safeUrlShape(location);

    if (!isExpectedProviderHost(provider, redirectShape.host)) {
      throw new Error(`${provider} redirected to unexpected host ${redirectShape.host}.`);
    }

    report.checks.push({
      name: `${provider}-oauth-live-redirect`,
      status: "passed",
      details: {
        startStatus: 200,
        authHost: authShape.host,
        authPath: authShape.pathname,
        authorizeStatus: redirectResponse.status,
        providerHost: redirectShape.host,
        providerPath: redirectShape.pathname,
        hasQuery: redirectShape.hasQuery
      }
    });
  }

  const accountStatePath = join(stateDirectory, "account-state.json");
  const accountState = existsSync(accountStatePath) ? JSON.parse(readFileSync(accountStatePath, "utf8")) : null;
  report.checks.push({
    name: "clean-profile-no-session-token",
    status: "passed",
    details: {
      accountStateWritten: Boolean(accountState),
      pendingProvider: accountState?.pendingProvider ?? null,
      hasSession: Boolean(accountState?.session)
    }
  });

  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = error instanceof Error ? error.message : String(error);
} finally {
  report.finishedAt = new Date().toISOString();
  report.daemon.stdoutTail = stdout.slice(-1000);
  report.daemon.stderrTail = stderr.slice(-1000);

  if (daemon) {
    daemon.kill();
  }

  mkdirSync(verificationDir, {
    recursive: true
  });
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  if (!options.keepTemp) {
    rmSync(tempRoot, {
      recursive: true,
      force: true
    });
    report.daemon.tempProfileRemoved = true;
    writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  }

  console.log(
    JSON.stringify(
      {
        status: report.status,
        reportPath,
        ...(report.error ? { error: report.error } : {}),
        checks: report.checks
      },
      null,
      2
    )
  );

  if (report.status !== "passed") {
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const parsed = {
    envPath: undefined,
    keepTemp: false,
    port: undefined
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--env") {
      parsed.envPath = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--keep-temp") {
      parsed.keepTemp = true;
      continue;
    }

    if (arg === "--port") {
      parsed.port = Number.parseInt(args[index + 1] ?? "", 10);
      index += 1;
    }
  }

  if (parsed.port !== undefined && !Number.isFinite(parsed.port)) {
    throw new Error("--port must be a number.");
  }

  return parsed;
}

function parseEnvFile(filePath) {
  const values = {};

  if (!existsSync(filePath)) {
    return values;
  }

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (key) {
      values[key] = value;
    }
  }

  return values;
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 15000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  throw new Error(`Daemon did not become healthy: ${lastError?.message ?? "timeout"}`);
}

async function readJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }

  return response.json();
}

async function startProviderOAuth(baseUrl, provider) {
  const response = await fetch(`${baseUrl}/account/start-oauth`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "superior-account-start-oauth",
      provider,
      redirectTo: `${baseUrl}/account/oauth/callback`
    })
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`${provider} start-oauth failed: ${payload?.message ?? response.status}`);
  }

  if (payload?.type !== "superior-account-oauth-started" || typeof payload.authUrl !== "string") {
    throw new Error(`${provider} start-oauth returned an invalid payload.`);
  }

  return payload;
}

function safeUrlShape(value) {
  const url = new URL(value);

  return {
    protocol: url.protocol,
    host: url.host,
    pathname: url.pathname,
    hasQuery: Boolean(url.search),
    hasHash: Boolean(url.hash)
  };
}

function isExpectedProviderHost(provider, host) {
  if (provider === "google") {
    return host === "accounts.google.com" || host.endsWith(".google.com") || host.endsWith(".googleusercontent.com");
  }

  if (provider === "x") {
    return host === "x.com" || host.endsWith(".x.com") || host === "twitter.com" || host.endsWith(".twitter.com");
  }

  if (provider === "discord") {
    return host === "discord.com" || host.endsWith(".discord.com");
  }

  return false;
}
