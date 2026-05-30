import { ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, parse, resolve } from "node:path";
import {
  BotIdentity,
  RepoWorkspaceRecord,
  SuperiorBrowserAttachRequest,
  SuperiorBrowserAttachResult,
  SuperiorBrowserError,
  SuperiorBrowserEvent,
  SuperiorBrowserEventsResponse,
  SuperiorBrowserEventKind,
  SuperiorBrowserKind,
  SuperiorBrowserSession,
  SuperiorBrowserSessionMode,
  SuperiorBrowserStartRequest,
  SuperiorBrowserStartResult,
  SuperiorBrowserState,
  SuperiorBrowserStatus,
  createBotIconSvg,
  createLocalId
} from "@clawdbot/shared";
import { completeBrowserPairing, resetBrowserPairing, startBrowserPairing } from "./browserLinkStore.js";
import { getSuperiorStateDirectory, findUpDirectory } from "./localPaths.js";
import { readRepoWorkspaceRecord, rememberRepoWorkspaceBrowserSession } from "./repoWorkspaceStore.js";

interface BrowserExecutable {
  kind: SuperiorBrowserKind;
  path: string;
}

interface InternalBrowserSession extends SuperiorBrowserSession {
  bot: BotIdentity;
  sessionToken: string;
  sessionTokenExpiresAt: number;
  pairingToken: string;
  attached: boolean;
}

interface ActiveBrowserRuntime {
  session: InternalBrowserSession;
  child: ChildProcess;
}

const sessionTokenTtlMs = 5 * 60 * 1000;
const maxBrowserEvents = 60;
let activeRuntime: ActiveBrowserRuntime | null = null;
let lastSessionId: string | undefined;
let browserEvents: SuperiorBrowserEvent[] = [];

export class BrowserRuntimeError extends Error {
  constructor(
    readonly code: SuperiorBrowserError["code"],
    message: string
  ) {
    super(message);
  }
}

export function getSuperiorBrowserState(): SuperiorBrowserState {
  const status: SuperiorBrowserStatus = activeRuntime
    ? activeRuntime.session.status
    : findBrowserExecutable()
      ? "closed"
      : "missing-browser";

  return {
    type: "superior-browser-state",
    status,
    ...(activeRuntime ? { activeSession: toPublicSession(activeRuntime.session) } : {}),
    createdAt: new Date().toISOString()
  };
}

export function getSuperiorBrowserEvents(): SuperiorBrowserEventsResponse {
  const sessionId = activeRuntime?.session.sessionId ?? lastSessionId;
  const items = sessionId ? browserEvents.filter((event) => event.sessionId === sessionId) : browserEvents;

  return {
    type: "superior-browser-events",
    ...(sessionId ? { sessionId } : {}),
    items,
    createdAt: new Date().toISOString()
  };
}

export async function startSuperiorBrowser(request: SuperiorBrowserStartRequest): Promise<SuperiorBrowserStartResult> {
  const repoWorkspace = readRepoWorkspaceRecord(request.repoWorkspaceId);

  if (!repoWorkspace) {
    throw new BrowserRuntimeError("unknown_repo", "Read this repo before starting a playpen.");
  }

  const browser = findBrowserExecutable();

  if (!browser) {
    activeRuntime = null;
    throw new BrowserRuntimeError("missing_browser", "Install Chrome or Edge, or set SUPERIOR_BROWSER_PATH.");
  }

  const extensionPath = findExtensionFolder();

  if (!extensionPath) {
    throw new BrowserRuntimeError("missing_extension", "Build the SUPERIOR extension before starting a playpen.");
  }

  await stopSuperiorBrowser();

  const profilePath = getProfilePath(repoWorkspace.id);
  const debugPort = await allocateLocalPort();
  const sessionId = createLocalId("browser_session");
  const sessionToken = createLocalId("browser_token");
  const pairing = startBrowserPairing();
  const startedAt = new Date().toISOString();
  const mode = getSessionMode(repoWorkspace);
  const homeUrl = `http://127.0.0.1:${getDaemonPort()}/browser-session/${encodeURIComponent(sessionId)}/home`;
  const session: InternalBrowserSession = {
    sessionId,
    repoWorkspaceId: repoWorkspace.id,
    repoTitle: repoWorkspace.source.title,
    mode,
    status: "starting",
    browserKind: browser.kind,
    browserPath: browser.path,
    profilePath,
    debugPort,
    homeUrl,
    repoUrl: repoWorkspace.source.url,
    playpenLabel: repoWorkspace.playground.label,
    startedAt,
    bot: request.bot,
    sessionToken,
    sessionTokenExpiresAt: Date.now() + sessionTokenTtlMs,
    pairingToken: pairing.pairingToken,
    attached: false
  };

  mkdirSync(profilePath, {
    recursive: true
  });

  const args = [
    `--user-data-dir=${profilePath}`,
    `--remote-debugging-port=${debugPort}`,
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    "--no-first-run",
    "--disable-default-apps",
    homeUrl,
    repoWorkspace.source.url
  ];
  const child = spawn(browser.path, args, {
    stdio: "ignore",
    detached: false,
    windowsHide: false
  });

  if (child.pid) {
    session.processId = child.pid;
  }
  activeRuntime = {
    session,
    child
  };
  recordBrowserEvent(session, "started", "Started", `${browser.kind} profile opened`);
  recordBrowserEvent(session, "repo_opened", "Repo opened", repoWorkspace.source.url);

  child.once("spawn", () => {
    if (activeRuntime?.session.sessionId === sessionId) {
      activeRuntime.session.status = "ready";
    }
  });
  child.once("error", (error) => {
    if (activeRuntime?.session.sessionId === sessionId) {
      activeRuntime.session.status = "failed";
      activeRuntime.session.error = error.message;
      recordBrowserEvent(activeRuntime.session, "failed", "Failed", error.message);
    }
  });
  child.once("exit", () => {
    if (activeRuntime?.session.sessionId === sessionId) {
      recordBrowserEvent(activeRuntime.session, "stopped", "Stopped", "Browser process closed");
      lastSessionId = sessionId;
      activeRuntime = null;
    }
  });
  child.unref();

  await waitForSpawnTick();

  if (session.status === "failed") {
    await stopSuperiorBrowser();
    throw new BrowserRuntimeError("launch_failed", session.error ?? "SUPERIOR Browser could not start.");
  }

  if (session.status === "starting") {
    session.status = "ready";
  }

  return {
    type: "superior-browser-start-result",
    requestId: request.requestId,
    state: getSuperiorBrowserState(),
    createdAt: new Date().toISOString()
  };
}

export async function stopSuperiorBrowser(): Promise<SuperiorBrowserState> {
  if (!activeRuntime) {
    return getSuperiorBrowserState();
  }

  const runtime = activeRuntime;
  const shouldResetPairing = !runtime.session.attached;

  recordBrowserEvent(runtime.session, "stopped", "Stopped", "Browser process stopped");
  lastSessionId = runtime.session.sessionId;
  activeRuntime = null;

  if (!runtime.child.killed) {
    runtime.child.kill();
  }

  if (shouldResetPairing) {
    resetBrowserPairing();
  }

  return getSuperiorBrowserState();
}

export function renderSuperiorBrowserHome(sessionId: string): string | null {
  const session = activeRuntime?.session;

  if (!session || session.sessionId !== sessionId) {
    return null;
  }

  const iconSvg = createBotIconSvg(session.bot, 128);
  recordBrowserEvent(session, "home_loaded", "Home loaded", "Robot room opened");
  const data = {
    sessionId: session.sessionId,
    sessionToken: session.sessionToken,
    sessionTokenExpiresAt: new Date(session.sessionTokenExpiresAt).toISOString(),
    repoWorkspaceId: session.repoWorkspaceId,
    repoTitle: session.repoTitle,
    playpenLabel: session.playpenLabel,
    mode: session.mode
  };
  const safeDataJson = JSON.stringify(data).replace(/</g, "\\u003c");
  const favicon = `data:image/svg+xml,${encodeURIComponent(iconSvg)}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SUPERIOR Browser</title>
  <link rel="icon" href="${favicon}" />
  <style>
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #d9b88f;
      color: #2d211a;
    }

    body {
      min-height: 100vh;
      margin: 0;
      display: grid;
      place-items: center;
      background:
        radial-gradient(circle at 48% 22%, rgba(255, 246, 224, 0.44), transparent 28%),
        linear-gradient(180deg, #ecd2aa 0%, #c99a6c 100%);
    }

    main {
      width: min(720px, calc(100vw - 40px));
      display: grid;
      grid-template-columns: 150px minmax(0, 1fr);
      gap: 22px;
      align-items: center;
      padding: 28px;
      border-radius: 22px 20px 24px 19px;
      background: rgba(255, 243, 219, 0.66);
      box-shadow:
        inset 0 2px 0 rgba(255, 248, 229, 0.8),
        inset 0 -7px 0 rgba(96, 62, 37, 0.12),
        0 22px 48px rgba(74, 49, 32, 0.26);
    }

    .bot {
      display: grid;
      place-items: center;
      aspect-ratio: 1;
      border-radius: 26px 24px 28px 22px;
      background: rgba(111, 78, 53, 0.14);
      box-shadow: inset 0 0 0 1px rgba(91, 57, 36, 0.16);
    }

    .bot svg {
      width: 112px;
      height: 112px;
      filter: drop-shadow(0 12px 10px rgba(75, 45, 24, 0.22));
    }

    .plate {
      display: grid;
      gap: 12px;
    }

    h1 {
      margin: 0;
      font-size: clamp(32px, 6vw, 56px);
      line-height: .92;
      letter-spacing: 0;
    }

    p {
      margin: 0;
      color: #594331;
      font-size: 15px;
      line-height: 1.45;
    }

    dl {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin: 8px 0 0;
    }

    div.stat {
      min-width: 0;
      padding: 10px;
      border-radius: 12px 13px 11px 14px;
      background: rgba(255, 248, 229, 0.56);
      box-shadow: inset 0 0 0 1px rgba(111, 70, 34, 0.12);
    }

    dt {
      color: #724f38;
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
    }

    dd {
      margin: 4px 0 0;
      overflow-wrap: anywhere;
      font-size: 13px;
      font-weight: 900;
    }

    @media (max-width: 620px) {
      main {
        grid-template-columns: 1fr;
      }

      .bot {
        max-width: 180px;
      }

      dl {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <div class="bot" aria-hidden="true">${iconSvg}</div>
    <section class="plate" aria-label="SUPERIOR Browser session">
      <h1>${escapeHtml(session.bot.name)}</h1>
      <p>SUPERIOR Browser is attached to this repo playpen.</p>
      <dl>
        <div class="stat"><dt>Repo</dt><dd>${escapeHtml(session.repoTitle)}</dd></div>
        <div class="stat"><dt>Playpen</dt><dd>${escapeHtml(session.playpenLabel)}</dd></div>
        <div class="stat"><dt>Status</dt><dd id="superior-attach-status">attaching</dd></div>
      </dl>
    </section>
  </main>
  <script id="superior-session-data" type="application/json">${safeDataJson}</script>
</body>
</html>`;
}

export function attachSuperiorBrowserSession(
  sessionId: string,
  request: SuperiorBrowserAttachRequest
): SuperiorBrowserAttachResult {
  const session = activeRuntime?.session;
  const now = new Date().toISOString();

  if (!session || session.sessionId !== sessionId) {
    throw new BrowserRuntimeError("not_running", "SUPERIOR Browser session is not running.");
  }

  if (session.attached || Date.now() > session.sessionTokenExpiresAt || request.sessionToken !== session.sessionToken) {
    throw new BrowserRuntimeError("unauthorized", "SUPERIOR Browser session token expired.");
  }

  const browserLinkState = completeBrowserPairing(session.pairingToken, request.extensionId);

  if (!browserLinkState || browserLinkState.status !== "paired" || !browserLinkState.lastSeenAt) {
    throw new BrowserRuntimeError("unauthorized", "SUPERIOR Browser could not pair this extension.");
  }

  session.attached = true;
  session.status = "paired";
  session.pairedAt = now;
  recordBrowserEvent(session, "extension_paired", "Extension paired", request.extensionId ?? "controlled profile");

  return {
    type: "superior-browser-attach-result",
    requestId: request.requestId,
    pairingToken: session.pairingToken,
    bot: session.bot,
    browserLinkState: {
      status: "paired",
      ...(browserLinkState.extensionId ? { extensionId: browserLinkState.extensionId } : {}),
      lastSeenAt: browserLinkState.lastSeenAt
    },
    createdAt: now
  };
}

export function rememberSuperiorBrowserSkillRun(skillLabel: string, pageTitle: string, pageUrl: string): void {
  const session = activeRuntime?.session;

  if (!session || session.status !== "paired") {
    return;
  }

  recordBrowserEvent(session, "skill_ran", skillLabel, pageTitle || pageUrl);
}

export function findBrowserExecutable(): BrowserExecutable | null {
  const envPath = process.env.SUPERIOR_BROWSER_PATH?.trim();

  if (envPath && existsSync(envPath)) {
    return {
      kind: getBrowserKindFromPath(envPath),
      path: envPath
    };
  }

  for (const candidate of getBrowserCandidates()) {
    if (existsSync(candidate.path) && isBrowserCandidateUsable(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function getProfilePath(repoWorkspaceId: string): string {
  const safeId = repoWorkspaceId.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");

  return join(getSuperiorStateDirectory(), "browser-profiles", safeId || "repo");
}

export function findExtensionFolder(startDirectory = process.cwd()): string | null {
  const envPath = process.env.SUPERIOR_EXTENSION_PATH?.trim();

  if (envPath && hasManifest(envPath)) {
    return resolve(envPath);
  }

  const workspaceRoot = findUpDirectory("pnpm-workspace.yaml", startDirectory);

  if (workspaceRoot) {
    const extensionDist = join(workspaceRoot, "apps", "extension", "dist");

    if (hasManifest(extensionDist)) {
      return extensionDist;
    }
  }

  for (const resourceRoot of getResourceRoots(startDirectory)) {
    const extensionFolder = join(resourceRoot, "extension");

    if (hasManifest(extensionFolder)) {
      return extensionFolder;
    }
  }

  return null;
}

function toPublicSession(session: InternalBrowserSession): SuperiorBrowserSession {
  return {
    sessionId: session.sessionId,
    repoWorkspaceId: session.repoWorkspaceId,
    repoTitle: session.repoTitle,
    mode: session.mode,
    status: session.status,
    ...(session.browserKind ? { browserKind: session.browserKind } : {}),
    ...(session.browserPath ? { browserPath: session.browserPath } : {}),
    profilePath: session.profilePath,
    ...(session.debugPort ? { debugPort: session.debugPort } : {}),
    ...(session.processId ? { processId: session.processId } : {}),
    homeUrl: session.homeUrl,
    repoUrl: session.repoUrl,
    playpenLabel: session.playpenLabel,
    startedAt: session.startedAt,
    ...(session.pairedAt ? { pairedAt: session.pairedAt } : {}),
    ...(session.error ? { error: session.error } : {})
  };
}

function getSessionMode(repoWorkspace: RepoWorkspaceRecord): SuperiorBrowserSessionMode {
  if (repoWorkspace.playground.kind === "extension-lab") {
    return "extension-lab";
  }

  if (repoWorkspace.playground.kind === "repo-map") {
    return "repo-map";
  }

  return "superior-browser";
}

function getBrowserCandidates(): BrowserExecutable[] {
  const candidates: BrowserExecutable[] = [];

  if (process.platform === "win32") {
    const programFiles = process.env.ProgramFiles;
    const programFilesX86 = process.env["ProgramFiles(x86)"];
    const localAppData = process.env.LOCALAPPDATA;

    pushCandidate(candidates, "chrome", programFiles, "Google", "Chrome", "Application", "chrome.exe");
    pushCandidate(candidates, "chrome", programFilesX86, "Google", "Chrome", "Application", "chrome.exe");
    pushCandidate(candidates, "chrome", localAppData, "Google", "Chrome", "Application", "chrome.exe");
    pushCandidate(candidates, "edge", programFiles, "Microsoft", "Edge", "Application", "msedge.exe");
    pushCandidate(candidates, "edge", programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe");
    pushCandidate(candidates, "edge", localAppData, "Microsoft", "Edge", "Application", "msedge.exe");
    return candidates;
  }

  if (process.platform === "darwin") {
    candidates.push(
      {
        kind: "chrome",
        path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      },
      {
        kind: "edge",
        path: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
      }
    );
    return candidates;
  }

  candidates.push(
    {
      kind: "chrome",
      path: "/usr/bin/google-chrome"
    },
    {
      kind: "chrome",
      path: "/usr/bin/chromium"
    },
    {
      kind: "edge",
      path: "/usr/bin/microsoft-edge"
    }
  );

  return candidates;
}

function pushCandidate(
  candidates: BrowserExecutable[],
  kind: SuperiorBrowserKind,
  root: string | undefined,
  ...parts: string[]
): void {
  if (root) {
    candidates.push({
      kind,
      path: join(root, ...parts)
    });
  }
}

function getBrowserKindFromPath(path: string): SuperiorBrowserKind {
  return path.toLowerCase().includes("edge") || path.toLowerCase().includes("msedge") ? "edge" : "chrome";
}

function isBrowserCandidateUsable(browser: BrowserExecutable): boolean {
  if (browser.kind !== "chrome") {
    return true;
  }

  const majorVersion = getInstalledBrowserMajorVersion(browser.path);

  if (!majorVersion) {
    return true;
  }

  return majorVersion < 137;
}

function getInstalledBrowserMajorVersion(browserPath: string): number | null {
  const applicationFolder = dirname(browserPath);

  try {
    const majorVersions = readdirSync(applicationFolder, {
      withFileTypes: true
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => /^(\d+)\./.exec(entry.name)?.[1])
      .filter((majorVersion): majorVersion is string => Boolean(majorVersion))
      .map((majorVersion) => Number.parseInt(majorVersion, 10))
      .filter(Number.isFinite);

    return majorVersions.length > 0 ? Math.max(...majorVersions) : null;
  } catch {
    return null;
  }
}

function getResourceRoots(startDirectory: string): string[] {
  const roots = new Set<string>();
  const resolvedStart = resolve(startDirectory);

  roots.add(resolvedStart);
  roots.add(join(resolvedStart, "resources"));
  roots.add(dirname(resolvedStart));

  const parsed = parse(resolvedStart);

  if (parsed.dir) {
    roots.add(parsed.dir);
  }

  return [...roots];
}

function hasManifest(folder: string): boolean {
  return existsSync(join(folder, "manifest.json"));
}

function recordBrowserEvent(
  session: InternalBrowserSession,
  kind: SuperiorBrowserEventKind,
  label: string,
  detail?: string
): void {
  const event: SuperiorBrowserEvent = {
    type: "superior-browser-event",
    id: createLocalId("browser_event"),
    sessionId: session.sessionId,
    repoWorkspaceId: session.repoWorkspaceId,
    kind,
    label,
    ...(detail ? { detail } : {}),
    createdAt: new Date().toISOString()
  };

  browserEvents = [...browserEvents, event].slice(-maxBrowserEvents);
  lastSessionId = session.sessionId;
  rememberRepoWorkspaceBrowserSession(session.repoWorkspaceId, {
    sessionId: session.sessionId,
    profilePath: session.profilePath,
    lastBrowserEventSummary: label
  });
}

function getDaemonPort(): number {
  const port = Number.parseInt(process.env.CLAWDBOT_DAEMON_PORT ?? "5317", 10);

  return Number.isFinite(port) ? port : 5317;
}

async function allocateLocalPort(): Promise<number> {
  return new Promise((resolvePort, rejectPort) => {
    const server = createServer();

    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;

      server.close(() => {
        resolvePort(port);
      });
    });
  });
}

function waitForSpawnTick(): Promise<void> {
  return new Promise((resolveTick) => {
    setTimeout(resolveTick, 80);
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
