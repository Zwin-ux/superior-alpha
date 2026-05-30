import {
  BotIdentity,
  BrowserPairingStartResult,
  BrowserPairingResetResult,
  CustomSkillImportError,
  CustomSkillImportProposal,
  DaemonHealth,
  RecentSkillResultsResponse,
  RepoWorkspaceRecordsResponse,
  RepoReaderError,
  RepoReaderResult,
  SuperiorBrowserError,
  SuperiorBrowserEventsResponse,
  SuperiorBrowserStartResult,
  SuperiorBrowserState,
  SuperiorBrowserStopResult,
  createCustomSkillImportRequest,
  createRepoReaderRequest,
  createSuperiorBrowserStartRequest
} from "@clawdbot/shared";

const daemonUrl = "http://127.0.0.1:5317";

export interface DaemonLaunchResult {
  status: "already-running" | "started" | "starting" | "missing-node" | "missing-entry" | "failed";
  detail: string;
  entry: string | null;
}

export interface OpenLocalFolderResult {
  status: "opened" | "blocked" | "failed" | "missing";
  path: string;
}

export async function ensureLocalDaemon(): Promise<DaemonLaunchResult | null> {
  if (!("__TAURI_INTERNALS__" in window)) {
    return null;
  }

  const { invoke } = await import("@tauri-apps/api/core");

  return invoke<DaemonLaunchResult>("ensure_daemon");
}

export async function openLocalFolder(path: string): Promise<OpenLocalFolderResult | null> {
  if (!("__TAURI_INTERNALS__" in window)) {
    return null;
  }

  const { invoke } = await import("@tauri-apps/api/core");

  return invoke<OpenLocalFolderResult>("open_local_folder", { path });
}

export async function openExtensionFolder(): Promise<OpenLocalFolderResult | null> {
  if (!("__TAURI_INTERNALS__" in window)) {
    return null;
  }

  const { invoke } = await import("@tauri-apps/api/core");

  return invoke<OpenLocalFolderResult>("open_extension_folder");
}

export async function fetchDaemonHealth(): Promise<DaemonHealth> {
  const response = await fetch(`${daemonUrl}/health`);

  if (!response.ok) {
    throw new Error("Daemon health check failed.");
  }

  return (await response.json()) as DaemonHealth;
}

export async function fetchDaemonBotIdentity(): Promise<BotIdentity> {
  const response = await fetch(`${daemonUrl}/bot-identity`);

  if (!response.ok) {
    throw new Error("Daemon bot identity check failed.");
  }

  return (await response.json()) as BotIdentity;
}

export async function fetchRecentSkillResults(): Promise<RecentSkillResultsResponse> {
  const response = await fetch(`${daemonUrl}/recent-results`);

  if (!response.ok) {
    throw new Error("Recent results check failed.");
  }

  return (await response.json()) as RecentSkillResultsResponse;
}

export async function fetchRepoWorkspaceRecords(): Promise<RepoWorkspaceRecordsResponse> {
  const response = await fetch(`${daemonUrl}/repo-workspaces`);

  if (!response.ok) {
    throw new Error("Repo workspace check failed.");
  }

  return (await response.json()) as RepoWorkspaceRecordsResponse;
}

export async function fetchSuperiorBrowserState(): Promise<SuperiorBrowserState> {
  const response = await fetch(`${daemonUrl}/browser-runtime`);

  if (!response.ok) {
    throw new Error("SUPERIOR Browser state check failed.");
  }

  return (await response.json()) as SuperiorBrowserState;
}

export async function fetchSuperiorBrowserEvents(): Promise<SuperiorBrowserEventsResponse> {
  const response = await fetch(`${daemonUrl}/browser-runtime/events`);

  if (!response.ok) {
    throw new Error("SUPERIOR Browser event check failed.");
  }

  return (await response.json()) as SuperiorBrowserEventsResponse;
}

export async function saveDaemonBotIdentity(bot: BotIdentity): Promise<BotIdentity> {
  const response = await fetch(`${daemonUrl}/bot-identity`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(bot)
  });

  if (!response.ok) {
    throw new Error("Daemon bot identity save failed.");
  }

  return (await response.json()) as BotIdentity;
}

export async function startBrowserPairing(): Promise<BrowserPairingStartResult> {
  const response = await fetch(`${daemonUrl}/browser-link/start`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Browser pairing start failed.");
  }

  return (await response.json()) as BrowserPairingStartResult;
}

export async function resetBrowserPairing(): Promise<BrowserPairingResetResult> {
  const response = await fetch(`${daemonUrl}/browser-link/reset`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error("Browser pairing reset failed.");
  }

  return (await response.json()) as BrowserPairingResetResult;
}

export async function requestCustomSkillImportProposal(folderPath: string): Promise<CustomSkillImportProposal> {
  const response = await fetch(`${daemonUrl}/custom-skills/import-proposal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(createCustomSkillImportRequest({ folderPath }))
  });

  if (!response.ok) {
    throw new Error(await readDaemonError(response, "Custom skill import proposal failed."));
  }

  return (await response.json()) as CustomSkillImportProposal;
}

export async function requestRepoReader(repoUrl: string, bot: BotIdentity): Promise<RepoReaderResult> {
  const response = await fetch(`${daemonUrl}/skills/repo-reader`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(createRepoReaderRequest({ repoUrl, bot }))
  });

  if (!response.ok) {
    throw new Error(await readDaemonError(response, "Repo Reader failed."));
  }

  return (await response.json()) as RepoReaderResult;
}

export async function startSuperiorBrowser(repoWorkspaceId: string, bot: BotIdentity): Promise<SuperiorBrowserStartResult> {
  const response = await fetch(`${daemonUrl}/browser-runtime/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(createSuperiorBrowserStartRequest({ repoWorkspaceId, bot }))
  });

  if (!response.ok) {
    throw new Error(await readDaemonError(response, "SUPERIOR Browser could not start."));
  }

  return (await response.json()) as SuperiorBrowserStartResult;
}

export async function stopSuperiorBrowser(): Promise<SuperiorBrowserStopResult> {
  const response = await fetch(`${daemonUrl}/browser-runtime/stop`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await readDaemonError(response, "SUPERIOR Browser could not stop."));
  }

  return (await response.json()) as SuperiorBrowserStopResult;
}

async function readDaemonError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as Partial<
    CustomSkillImportError | RepoReaderError | SuperiorBrowserError
  > | null;

  return payload?.message ?? fallback;
}
