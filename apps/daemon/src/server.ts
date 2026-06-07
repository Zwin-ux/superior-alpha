import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { exec } from "node:child_process";
import {
  ArticleXrayError,
  ArticleXrayRequest,
  BotCreationOptionsResponse,
  BotIdentity,
  BotStarterPresetsResponse,
  BrowserPairingCompleteRequest,
  BrowserPairingError,
  CustomSkillImportError,
  CustomSkillImportRequest,
  ExplainPageError,
  ExplainPageRequest,
  GameRuntimeError,
  GameRuntimeGoalRequest,
  GameRuntimeNudgeRequest,
  GameRuntimePauseRequest,
  GameRuntimeResumeRequest,
  GameRuntimeStartRequest,
  GameRuntimeStopRequest,
  GameServerRouteSaveRequest,
  GameTargetImportRequest,
  MobileCompanionRecentProof,
  MobileCompanionResponse,
  RecentSkillResult,
  RepoReaderError as RepoReaderContractError,
  RepoReaderRequest,
  SuperiorAccountError,
  SuperiorAccountOAuthCompleteRequest,
  SuperiorAccountOAuthCompleteResult,
  SuperiorAccountOAuthProvider,
  SuperiorAccountOAuthStartResult,
  SuperiorAccountProfile,
  SuperiorAccountSession,
  SuperiorBrowserAttachRequest,
  SuperiorBrowserActivePageReport,
  SuperiorBrowserError,
  SuperiorBrowserState,
  SuperiorBrowserStartRequest,
  SuperiorFunctionError,
  SuperiorFunctionErrorCode,
  SuperiorFunctionRunRequest,
  SuperiorFunctionRunSummary,
  SuperiorModelProviderError,
  SuperiorModelProviderSelectRequest,
  SuperiorOpenAiKeySaveRequest,
  SuperiorSetupState,
  botCreationShapes,
  botSkillLoadoutOptions,
  botStarterPresets,
  createBotSporeFromIdentity,
  createSuperiorFunctionRunRequest,
  premadeSkillPartOptions,
  skillCatalog,
  sporeRaceCatalog,
  superiorAccountOAuthProviders
} from "@clawdbot/shared";
import {
  clearStoredAccountSession,
  readStoredAccountState,
  writePendingAccountProvider,
  writeStoredAccountSession
} from "./accountStore.js";
import {
  completeBrowserPairing,
  readBrowserLinkState,
  resetBrowserPairing,
  startBrowserPairing,
  touchBrowserPairing
} from "./browserLinkStore.js";
import { hasSavedBotIdentity, readBotIdentity, writeBotIdentity } from "./botIdentityStore.js";
import { getDaemonConfig } from "./config.js";
import { readRecentSkillResults } from "./recentResultsStore.js";
import { readRepoWorkspaceRecords } from "./repoWorkspaceStore.js";
import {
  BrowserRuntimeError,
  attachSuperiorBrowserSession,
  getSuperiorBrowserEvents,
  getSuperiorBrowserState,
  inspectSuperiorBrowser,
  reportSuperiorBrowserActivePage,
  renderSuperiorBrowserHome
} from "./browserRuntime.js";
import { readSuperiorFunctionCatalog } from "./functions/catalog.js";
import { readFunctionRunEvents, readRecentFunctionRuns } from "./functions/runEventsStore.js";
import { isSuperiorFunctionError, runSuperiorFunction, SuperiorFunctionRunnerOutput } from "./functions/runner.js";
import {
  readModelProviderState,
  saveOpenAiKey,
  selectModelProvider,
  startOllamaIfAvailable
} from "./modelProviderStore.js";
import { GameTargetStoreError, importGameTarget, readGameTargets } from "./gameTargetStore.js";
import { GameServerRouteStoreError, readGameServerRoutes, saveGameServerRoute } from "./gameServerRouteStore.js";
import {
  GameRuntimeError as GameRuntimeServiceError,
  getGameRuntimeEvents,
  getGameRuntimeState,
  nudgeGameRuntime,
  pauseGameRuntime,
  resumeGameRuntime,
  startGameRuntime,
  stopGameRuntime,
  updateGameRuntimeGoal
} from "./gameRuntime.js";

const config = getDaemonConfig();

const server = createServer(async (request, response) => {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${config.host}:${config.port}`);

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, {
      service: "superior-daemon",
      status: config.openaiApiKey ? "ready" : "missing_config",
      version: config.version,
      openaiConfigured: Boolean(config.openaiApiKey),
      localConfig: {
        stateDirectory: config.localStateDirectory,
        keyFilePath: config.keyFilePath,
        keyFilePresent: config.keyFilePresent,
        openaiConfigSource: config.openaiConfigSource
      },
      browserLinkState: readBrowserLinkState()
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/bot-presets") {
    sendJson(response, 200, readBotStarterPresets());
    return;
  }

  if (request.method === "GET" && url.pathname === "/bot-creation-options") {
    sendJson(response, 200, readBotCreationOptions());
    return;
  }

  if (request.method === "GET" && url.pathname === "/setup-state") {
    sendJson(response, 200, readSetupState());
    return;
  }

  if (request.method === "GET" && url.pathname === "/mobile-companion") {
    sendJson(response, 200, readMobileCompanion());
    return;
  }

  if (request.method === "GET" && url.pathname === "/account/oauth/callback") {
    sendHtml(response, 200, renderAccountOAuthCallbackPage());
    return;
  }

  if (request.method === "GET" && url.pathname === "/model-provider") {
    sendJson(response, 200, readModelProviderState(config));
    return;
  }

  if (request.method === "GET" && url.pathname === "/bot-identity") {
    sendJson(response, 200, readServiceBotIdentity());
    return;
  }

  if (request.method === "GET" && url.pathname === "/recent-results") {
    sendJson(response, 200, readRecentSkillResults());
    return;
  }

  if (request.method === "GET" && url.pathname === "/functions") {
    sendJson(response, 200, readSuperiorFunctionCatalog());
    return;
  }

  if (request.method === "GET" && url.pathname === "/function-runs/recent") {
    sendJson(response, 200, readRecentFunctionRuns());
    return;
  }

  const functionRunEventsMatch = /^\/function-runs\/([^/]+)\/events$/.exec(url.pathname);

  if (request.method === "GET" && functionRunEventsMatch?.[1]) {
    sendJson(response, 200, readFunctionRunEvents(decodeURIComponent(functionRunEventsMatch[1])));
    return;
  }

  if (request.method === "GET" && url.pathname === "/repo-workspaces") {
    sendJson(response, 200, readRepoWorkspaceRecords());
    return;
  }

  if (request.method === "GET" && url.pathname === "/browser-runtime") {
    sendJson(response, 200, getSuperiorBrowserState());
    return;
  }

  if (request.method === "GET" && url.pathname === "/browser-runtime/events") {
    sendJson(response, 200, getSuperiorBrowserEvents());
    return;
  }

  if (request.method === "GET" && url.pathname === "/game-targets") {
    sendJson(response, 200, readGameTargets());
    return;
  }

  if (request.method === "GET" && url.pathname === "/game-server-routes") {
    sendJson(response, 200, readGameServerRoutes());
    return;
  }

  if (request.method === "GET" && url.pathname === "/game-runtime") {
    sendJson(response, 200, getGameRuntimeState());
    return;
  }

  if (request.method === "GET" && url.pathname === "/game-runtime/events") {
    sendJson(response, 200, getGameRuntimeEvents());
    return;
  }

  if (request.method === "GET" && url.pathname === "/browser-runtime/inspect") {
    await handleBrowserRuntimeInspect(response);
    return;
  }

  const browserSessionHomeMatch = /^\/browser-session\/([^/]+)\/home$/.exec(url.pathname);

  if (request.method === "GET" && browserSessionHomeMatch?.[1]) {
    handleBrowserSessionHome(browserSessionHomeMatch[1], response);
    return;
  }

  const browserSessionAttachMatch = /^\/browser-session\/([^/]+)\/attach$/.exec(url.pathname);

  if (request.method === "POST" && browserSessionAttachMatch?.[1]) {
    await handleBrowserSessionAttach(browserSessionAttachMatch[1], request, response);
    return;
  }

  if ((request.method === "POST" || request.method === "PUT") && url.pathname === "/bot-identity") {
    await handleBotIdentitySave(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/explain") {
    await handleExplain(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/functions/run") {
    await handleFunctionRun(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/skills/article-xray") {
    await handleArticleXray(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/skills/repo-reader") {
    await handleRepoReader(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/browser-link/start") {
    await handleBrowserPairingStart(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/account/start-oauth") {
    await handleAccountOAuthStart(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/account/oauth/complete") {
    await handleAccountOAuthComplete(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/account/sign-out") {
    await handleAccountSignOut(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/model-provider/select") {
    await handleModelProviderSelect(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/model-provider/openai-key") {
    await handleModelProviderOpenAiKey(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/model-provider/ollama/start") {
    await handleModelProviderOllamaStart(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/browser-link/complete") {
    await handleBrowserPairingComplete(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/browser-link/reset") {
    await handleBrowserPairingReset(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/browser-runtime/start") {
    await handleBrowserRuntimeStart(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/browser-runtime/stop") {
    await handleBrowserRuntimeStop(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/browser-runtime/active-page") {
    await handleBrowserRuntimeActivePage(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/game-targets/import") {
    await handleGameTargetImport(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/game-server-routes/save") {
    await handleGameServerRouteSave(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/game-runtime/start") {
    await handleGameRuntimeStart(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/game-runtime/goal") {
    await handleGameRuntimeGoal(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/game-runtime/nudge") {
    await handleGameRuntimeNudge(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/game-runtime/pause") {
    await handleGameRuntimePause(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/game-runtime/resume") {
    await handleGameRuntimeResume(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/game-runtime/stop") {
    await handleGameRuntimeStop(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/custom-skills/import-proposal") {
    await handleCustomSkillImport(request, response);
    return;
  }

  sendJson(response, 404, {
    type: "explain-page-error",
    code: "bad_request",
    message: "Unknown SUPERIOR daemon route."
  } satisfies ExplainPageError);
});

server.listen(config.port, config.host, () => {
  console.log(`SUPERIOR daemon listening on http://${config.host}:${config.port}`);
});

async function handleBrowserRuntimeStart(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, {
      type: "superior-browser-error",
      code: "unauthorized",
      message: "SUPERIOR Browser can only be started from the local Workshop."
    } satisfies SuperiorBrowserError);
    return;
  }

  let payload: SuperiorBrowserStartRequest;

  try {
    payload = (await readJsonBody(request)) as SuperiorBrowserStartRequest;
  } catch {
    sendJson(response, 400, {
      type: "superior-browser-error",
      code: "bad_request",
      message: "Expected a valid SUPERIOR Browser start request."
    } satisfies SuperiorBrowserError);
    return;
  }

  if (payload.type !== "superior-browser-start" || typeof payload.repoWorkspaceId !== "string") {
    sendJson(response, 400, {
      type: "superior-browser-error",
      requestId: payload.requestId,
      code: "bad_request",
      message: "Choose a saved repo playpen before starting SUPERIOR Browser."
    } satisfies SuperiorBrowserError);
    return;
  }

  try {
    const output = await runSuperiorFunction(
      createSuperiorFunctionRunRequest({
        functionId: "superior-browser-start",
        input: payload,
        bot: payload.bot
      }),
      createFunctionRunContext(request)
    );

    if (isSuperiorFunctionError(output)) {
      sendJson(response, getFunctionStatusCode(output.code), toSuperiorBrowserError(output, payload.requestId));
      return;
    }

    sendJson(response, 200, output.result);
  } catch (error) {
    sendBrowserRuntimeError(response, payload.requestId, error);
  }
}

async function handleBrowserRuntimeStop(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, {
      type: "superior-browser-error",
      code: "unauthorized",
      message: "SUPERIOR Browser can only be stopped from the local Workshop."
    } satisfies SuperiorBrowserError);
    return;
  }

  const payload = {
    type: "superior-function-run" as const,
    requestId: `function_stop_${Date.now()}`,
    functionId: "superior-browser-stop" as const,
    input: {
      type: "superior-browser-stop"
    },
    createdAt: new Date().toISOString()
  };
  const output = await runSuperiorFunction(payload, createFunctionRunContext(request));

  if (isSuperiorFunctionError(output)) {
    sendJson(response, getFunctionStatusCode(output.code), toSuperiorBrowserError(output, payload.requestId));
    return;
  }

  sendJson(response, 200, output.result);
}

async function handleBrowserRuntimeInspect(response: ServerResponse): Promise<void> {
  try {
    sendJson(response, 200, await inspectSuperiorBrowser());
  } catch (error) {
    sendBrowserRuntimeError(response, undefined, error);
  }
}

async function handleBrowserRuntimeActivePage(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let payload: SuperiorBrowserActivePageReport;

  try {
    payload = (await readJsonBody(request)) as SuperiorBrowserActivePageReport;
  } catch {
    sendJson(response, 400, {
      type: "superior-browser-error",
      code: "bad_request",
      message: "Expected a valid SUPERIOR Browser active page report."
    } satisfies SuperiorBrowserError);
    return;
  }

  if (
    payload.type !== "superior-browser-active-page" ||
    typeof payload.pairingToken !== "string" ||
    typeof payload.page?.url !== "string" ||
    typeof payload.page?.title !== "string"
  ) {
    sendJson(response, 400, {
      type: "superior-browser-error",
      requestId: payload.requestId,
      code: "bad_request",
      message: "SUPERIOR Browser active page report needs a page URL and title."
    } satisfies SuperiorBrowserError);
    return;
  }

  if (readPairingHeader(request) !== payload.pairingToken) {
    sendJson(response, 401, {
      type: "superior-browser-error",
      requestId: payload.requestId,
      code: "unauthorized",
      message: "SUPERIOR Browser active page report needs the paired token."
    } satisfies SuperiorBrowserError);
    return;
  }

  try {
    sendJson(response, 200, reportSuperiorBrowserActivePage(payload));
  } catch (error) {
    sendBrowserRuntimeError(response, payload.requestId, error);
  }
}

async function handleGameTargetImport(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, createGameRuntimeError("unauthorized", "Game targets can only be imported from the local Workshop."));
    return;
  }

  let payload: GameTargetImportRequest;

  try {
    payload = (await readJsonBody(request)) as GameTargetImportRequest;
  } catch {
    sendJson(response, 400, createGameRuntimeError("bad_request", "Expected a valid Game Rig import request."));
    return;
  }

  if (payload.type !== "game-target-import" || typeof payload.executablePath !== "string") {
    sendJson(response, 400, createGameRuntimeError("bad_request", "Choose a Windows EXE to import.", payload.requestId));
    return;
  }

  try {
    sendJson(response, 200, importGameTarget(payload));
  } catch (error) {
    sendGameRuntimeError(response, payload.requestId, error);
  }
}

async function handleGameServerRouteSave(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, createGameRuntimeError("unauthorized", "Game server routes can only be saved locally."));
    return;
  }

  let payload: GameServerRouteSaveRequest;

  try {
    payload = (await readJsonBody(request)) as GameServerRouteSaveRequest;
  } catch {
    sendJson(response, 400, createGameRuntimeError("bad_request", "Expected a valid GMOD server route request."));
    return;
  }

  try {
    sendJson(response, 200, saveGameServerRoute(payload));
  } catch (error) {
    sendGameRuntimeError(response, payload.requestId, error);
  }
}

async function handleGameRuntimeStart(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, createGameRuntimeError("unauthorized", "Game Rig can only start from the local Workshop."));
    return;
  }

  let payload: GameRuntimeStartRequest;

  try {
    payload = (await readJsonBody(request)) as GameRuntimeStartRequest;
  } catch {
    sendJson(response, 400, createGameRuntimeError("bad_request", "Expected a valid Game Rig start request."));
    return;
  }

  try {
    sendJson(response, 200, await startGameRuntime(payload));
  } catch (error) {
    sendGameRuntimeError(response, payload.requestId, error);
  }
}

async function handleGameRuntimeGoal(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, createGameRuntimeError("unauthorized", "Game Rig goals can only be set locally."));
    return;
  }

  let payload: GameRuntimeGoalRequest;

  try {
    payload = (await readJsonBody(request)) as GameRuntimeGoalRequest;
  } catch {
    sendJson(response, 400, createGameRuntimeError("bad_request", "Expected a valid Game Rig goal request."));
    return;
  }

  try {
    sendJson(response, 200, updateGameRuntimeGoal(payload));
  } catch (error) {
    sendGameRuntimeError(response, payload.requestId, error);
  }
}

async function handleGameRuntimeNudge(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, createGameRuntimeError("unauthorized", "Game Rig nudges can only be sent locally."));
    return;
  }

  let payload: GameRuntimeNudgeRequest;

  try {
    payload = (await readJsonBody(request)) as GameRuntimeNudgeRequest;
  } catch {
    sendJson(response, 400, createGameRuntimeError("bad_request", "Expected a valid Game Rig nudge request."));
    return;
  }

  try {
    sendJson(response, 200, nudgeGameRuntime(payload));
  } catch (error) {
    sendGameRuntimeError(response, payload.requestId, error);
  }
}

async function handleGameRuntimePause(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, createGameRuntimeError("unauthorized", "Game Rig can only pause from the local Workshop."));
    return;
  }

  let payload: GameRuntimePauseRequest;

  try {
    payload = ((await readOptionalJsonBody(request)) ?? {
      type: "game-runtime-pause",
      requestId: `game_pause_${Date.now()}`,
      createdAt: new Date().toISOString()
    }) as GameRuntimePauseRequest;
  } catch {
    sendJson(response, 400, createGameRuntimeError("bad_request", "Expected a valid Game Rig pause request."));
    return;
  }

  try {
    sendJson(response, 200, pauseGameRuntime(payload));
  } catch (error) {
    sendGameRuntimeError(response, payload.requestId, error);
  }
}

async function handleGameRuntimeResume(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, createGameRuntimeError("unauthorized", "Game Rig can only resume from the local Workshop."));
    return;
  }

  let payload: GameRuntimeResumeRequest;

  try {
    payload = ((await readOptionalJsonBody(request)) ?? {
      type: "game-runtime-resume",
      requestId: `game_resume_${Date.now()}`,
      createdAt: new Date().toISOString()
    }) as GameRuntimeResumeRequest;
  } catch {
    sendJson(response, 400, createGameRuntimeError("bad_request", "Expected a valid Game Rig resume request."));
    return;
  }

  try {
    sendJson(response, 200, resumeGameRuntime(payload));
  } catch (error) {
    sendGameRuntimeError(response, payload.requestId, error);
  }
}

async function handleGameRuntimeStop(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, createGameRuntimeError("unauthorized", "Game Rig can only stop from the local Workshop."));
    return;
  }

  let payload: GameRuntimeStopRequest | null = null;

  try {
    payload = (await readOptionalJsonBody(request)) as GameRuntimeStopRequest | null;
  } catch {
    sendJson(response, 400, createGameRuntimeError("bad_request", "Expected a valid Game Rig stop request."));
    return;
  }

  try {
    sendJson(response, 200, await stopGameRuntime(payload?.requestId));
  } catch (error) {
    sendGameRuntimeError(response, payload?.requestId, error);
  }
}

function handleBrowserSessionHome(sessionId: string, response: ServerResponse): void {
  const html = renderSuperiorBrowserHome(decodeURIComponent(sessionId));

  if (!html) {
    sendHtml(response, 404, "<!doctype html><title>SUPERIOR Browser</title><p>Session closed.</p>");
    return;
  }

  sendHtml(response, 200, html);
}

async function handleBrowserSessionAttach(
  sessionId: string,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  let payload: SuperiorBrowserAttachRequest;

  try {
    payload = (await readJsonBody(request)) as SuperiorBrowserAttachRequest;
  } catch {
    sendJson(response, 400, {
      type: "superior-browser-error",
      code: "bad_request",
      message: "Expected a valid SUPERIOR Browser attach request."
    } satisfies SuperiorBrowserError);
    return;
  }

  if (payload.type !== "superior-browser-attach" || typeof payload.sessionToken !== "string") {
    sendJson(response, 400, {
      type: "superior-browser-error",
      requestId: payload.requestId,
      code: "bad_request",
      message: "SUPERIOR Browser needs a session token."
    } satisfies SuperiorBrowserError);
    return;
  }

  try {
    sendJson(response, 200, attachSuperiorBrowserSession(decodeURIComponent(sessionId), payload));
  } catch (error) {
    sendBrowserRuntimeError(response, payload.requestId, error);
  }
}

async function handleAccountOAuthStart(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, {
      type: "superior-account-error",
      code: "bad_request",
      message: "Account sign-in can only start from the local Workshop."
    } satisfies SuperiorAccountError);
    return;
  }

  let payload: {
    type?: string;
    provider?: unknown;
    redirectTo?: unknown;
  };

  try {
    payload = (await readJsonBody(request)) as typeof payload;
  } catch {
    sendJson(response, 400, {
      type: "superior-account-error",
      code: "bad_request",
      message: "Expected an account OAuth start request."
    } satisfies SuperiorAccountError);
    return;
  }

  const provider = parseAccountProvider(payload.provider);

  if (payload.type !== "superior-account-start-oauth" || !provider) {
    sendJson(response, 400, {
      type: "superior-account-error",
      code: "bad_request",
      message: "Choose Google or X."
    } satisfies SuperiorAccountError);
    return;
  }

  if (!isAccountConfigured()) {
    sendJson(response, 503, {
      type: "superior-account-error",
      code: "not_configured",
      message: "Supabase account login is not configured for this build."
    } satisfies SuperiorAccountError);
    return;
  }

  const redirectTo =
    typeof payload.redirectTo === "string" && payload.redirectTo.trim()
      ? payload.redirectTo.trim()
      : config.accountRedirectUrl;

  try {
    const started = await startAccountOAuth(provider, redirectTo);

    writePendingAccountProvider(provider);
    openExternalUrl(started.authUrl);
    sendJson(response, 200, started);
  } catch (error) {
    sendJson(response, 502, {
      type: "superior-account-error",
      code: "auth_failed",
      message: error instanceof Error ? error.message : "Account sign-in could not start."
    } satisfies SuperiorAccountError);
  }
}

async function handleAccountOAuthComplete(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let payload: SuperiorAccountOAuthCompleteRequest;

  try {
    payload = (await readJsonBody(request)) as SuperiorAccountOAuthCompleteRequest;
  } catch {
    sendJson(response, 400, {
      type: "superior-account-error",
      code: "bad_request",
      message: "Expected an account OAuth completion payload."
    } satisfies SuperiorAccountError);
    return;
  }

  if (payload.type !== "superior-account-oauth-complete" || typeof payload.accessToken !== "string") {
    sendJson(response, 400, {
      type: "superior-account-error",
      code: "bad_request",
      message: "OAuth callback needs the returned access token."
    } satisfies SuperiorAccountError);
    return;
  }

  if (!isAccountConfigured()) {
    sendJson(response, 503, {
      type: "superior-account-error",
      code: "not_configured",
      message: "Supabase account login is not configured for this build."
    } satisfies SuperiorAccountError);
    return;
  }

  try {
    const accountState = readStoredAccountState();
    const profile = await syncAccountProfile(payload.accessToken, readServiceBotIdentity().id);
    const session: SuperiorAccountSession = {
      type: "superior-account-session",
      userId: profile.userId,
      email: profile.email ?? accountState.session?.email ?? "operator@superior.local",
      ...(accountState.pendingProvider ? { provider: accountState.pendingProvider } : {}),
      accessToken: payload.accessToken,
      ...(typeof payload.expiresAt === "number" ? { expiresAt: payload.expiresAt } : {}),
      createdAt: new Date().toISOString()
    };

    writeStoredAccountSession({
      session,
      profile
    });
    await syncAccountSpore(payload.accessToken, readServiceBotIdentity()).catch(() => undefined);

    sendJson(response, 200, {
      type: "superior-account-connected",
      session,
      profile,
      account: getSetupAccountState(),
      createdAt: new Date().toISOString()
    } satisfies SuperiorAccountOAuthCompleteResult);
  } catch (error) {
    sendJson(response, 502, {
      type: "superior-account-error",
      code: "auth_failed",
      message: error instanceof Error ? error.message : "Could not finish account sign-in."
    } satisfies SuperiorAccountError);
  }
}

async function handleAccountSignOut(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, {
      type: "superior-account-error",
      code: "bad_request",
      message: "Account sign-out can only start from the local Workshop."
    } satisfies SuperiorAccountError);
    return;
  }

  clearStoredAccountSession();
  sendJson(response, 200, readSetupState());
}

async function handleModelProviderSelect(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, {
      type: "superior-model-provider-error",
      code: "bad_request",
      message: "Model provider can only be changed from the local Workshop."
    } satisfies SuperiorModelProviderError);
    return;
  }

  let payload: SuperiorModelProviderSelectRequest;

  try {
    payload = (await readJsonBody(request)) as SuperiorModelProviderSelectRequest;
  } catch {
    sendJson(response, 400, {
      type: "superior-model-provider-error",
      code: "bad_request",
      message: "Expected a model provider selection."
    } satisfies SuperiorModelProviderError);
    return;
  }

  if (payload.type !== "superior-model-provider-select" || (payload.provider !== "ollama" && payload.provider !== "openai-byok")) {
    sendJson(response, 400, {
      type: "superior-model-provider-error",
      code: "bad_request",
      message: "Choose Local Ollama or OpenAI BYOK."
    } satisfies SuperiorModelProviderError);
    return;
  }

  sendJson(response, 200, selectModelProvider(config, payload.provider));
}

async function handleModelProviderOpenAiKey(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, {
      type: "superior-model-provider-error",
      code: "bad_request",
      message: "BYOK can only be saved from the local Workshop."
    } satisfies SuperiorModelProviderError);
    return;
  }

  let payload: SuperiorOpenAiKeySaveRequest;

  try {
    payload = (await readJsonBody(request)) as SuperiorOpenAiKeySaveRequest;
  } catch {
    sendJson(response, 400, {
      type: "superior-model-provider-error",
      code: "bad_request",
      message: "Expected a BYOK save request."
    } satisfies SuperiorModelProviderError);
    return;
  }

  try {
    if (payload.type !== "superior-openai-key-save") {
      throw new Error("Expected a BYOK save request.");
    }

    sendJson(response, 200, saveOpenAiKey(config, payload.apiKey, payload.model));
  } catch (error) {
    sendJson(response, 400, {
      type: "superior-model-provider-error",
      code: "bad_request",
      message: error instanceof Error ? error.message : "Could not save BYOK."
    } satisfies SuperiorModelProviderError);
  }
}

async function handleModelProviderOllamaStart(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, {
      type: "superior-model-provider-error",
      code: "bad_request",
      message: "Ollama can only be started from the local Workshop."
    } satisfies SuperiorModelProviderError);
    return;
  }

  sendJson(response, 200, startOllamaIfAvailable(config));
}

async function handleBrowserPairingStart(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, {
      type: "browser-pairing-error",
      code: "unauthorized",
      message: "Browser pairing can only be started from the local Workshop."
    } satisfies BrowserPairingError);
    return;
  }

  const started = startBrowserPairing();

  sendJson(response, 200, {
    type: "browser-pairing-started",
    pairingToken: started.pairingToken,
    browserLinkState: {
      status: "pairing"
    },
    createdAt: new Date().toISOString()
  });
}

async function handleBrowserPairingComplete(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let payload: BrowserPairingCompleteRequest;

  try {
    payload = (await readJsonBody(request)) as BrowserPairingCompleteRequest;
  } catch {
    sendJson(response, 400, {
      type: "browser-pairing-error",
      code: "bad_request",
      message: "Expected a valid browser pairing request."
    } satisfies BrowserPairingError);
    return;
  }

  const token = payload.pairingToken?.trim();

  if (payload.type !== "browser-pairing-complete" || !token) {
    sendJson(response, 400, {
      type: "browser-pairing-error",
      requestId: payload.requestId,
      code: "bad_request",
      message: "Paste the pairing token from SUPERIOR."
    } satisfies BrowserPairingError);
    return;
  }

  const browserLinkState = completeBrowserPairing(token, payload.extensionId);

  if (!browserLinkState || browserLinkState.status !== "paired" || !browserLinkState.lastSeenAt) {
    sendJson(response, 401, {
      type: "browser-pairing-error",
      requestId: payload.requestId,
      code: "unauthorized",
      message: "Pairing token did not match the local daemon."
    } satisfies BrowserPairingError);
    return;
  }

  sendJson(response, 200, {
    type: "browser-pairing-complete-result",
    requestId: payload.requestId,
    browserLinkState: {
      status: "paired",
      ...(browserLinkState.extensionId ? { extensionId: browserLinkState.extensionId } : {}),
      lastSeenAt: browserLinkState.lastSeenAt
    },
    createdAt: new Date().toISOString()
  });
}

async function handleBrowserPairingReset(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin) && !isValidPairingHeader(request)) {
    sendJson(response, 403, {
      type: "browser-pairing-error",
      code: "unauthorized",
      message: "Browser pairing can only be reset from the local Workshop or paired extension."
    } satisfies BrowserPairingError);
    return;
  }

  resetBrowserPairing();
  sendJson(response, 200, {
    type: "browser-pairing-reset-result",
    browserLinkState: {
      status: "unpaired"
    },
    createdAt: new Date().toISOString()
  });
}

async function handleCustomSkillImport(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, {
      type: "custom-skill-import-error",
      code: "unauthorized",
      message: "Custom skill import only accepts local Workshop requests."
    } satisfies CustomSkillImportError);
    return;
  }

  let payload: CustomSkillImportRequest;

  try {
    payload = (await readJsonBody(request)) as CustomSkillImportRequest;
  } catch {
    sendJson(response, 400, {
      type: "custom-skill-import-error",
      code: "bad_request",
      message: "Expected a valid JSON custom skill import request."
    } satisfies CustomSkillImportError);
    return;
  }

  if (payload.type !== "custom-skill-import" || typeof payload.folderPath !== "string") {
    sendJson(response, 400, {
      type: "custom-skill-import-error",
      requestId: payload.requestId,
      code: "bad_request",
      message: "Drop a JS/TS project folder for custom skill import."
    } satisfies CustomSkillImportError);
    return;
  }

  try {
    const output = await runSuperiorFunction(
      createSuperiorFunctionRunRequest({
        functionId: "custom-skill-import-proposal",
        input: payload
      }),
      createFunctionRunContext(request)
    );

    if (isSuperiorFunctionError(output)) {
      sendJson(response, getFunctionStatusCode(output.code), toCustomSkillImportError(output, payload.requestId));
      return;
    }

    sendJson(response, 200, output.result);
  } catch (error) {
    sendJson(response, 500, {
      type: "custom-skill-import-error",
      requestId: payload.requestId,
      code: "scan_failed",
      message: error instanceof Error ? error.message : "Custom skill scan failed."
    } satisfies CustomSkillImportError);
  }
}

async function handleFunctionRun(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let payload: SuperiorFunctionRunRequest;

  try {
    payload = (await readJsonBody(request)) as SuperiorFunctionRunRequest;
  } catch {
    sendJson(response, 400, {
      type: "superior-function-error",
      code: "bad_request",
      message: "Expected a valid function run request.",
      createdAt: new Date().toISOString()
    } satisfies SuperiorFunctionError);
    return;
  }

  if (payload.type !== "superior-function-run" || typeof payload.requestId !== "string") {
    sendJson(response, 400, {
      type: "superior-function-error",
      requestId: payload.requestId,
      code: "bad_request",
      message: "Function runs need a request id and function id.",
      createdAt: new Date().toISOString()
    } satisfies SuperiorFunctionError);
    return;
  }

  sendFunctionOutput(response, await runSuperiorFunction(payload, createFunctionRunContext(request)));
}

async function handleBotIdentitySave(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const payload = (await readJsonBody(request)) as BotIdentity;
    const saved = writeBotIdentity({
      ...payload,
      browserLinkState: readBrowserLinkState()
    });

    const accountSession = getActiveAccountSession();

    if (accountSession) {
      void syncAccountSpore(accountSession.accessToken, saved).catch(() => undefined);
    }

    sendJson(
      response,
      200,
      saved
    );
  } catch {
    sendJson(response, 400, {
      code: "bad_request",
      message: "Expected a valid bot identity."
    });
  }
}

async function handleArticleXray(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let payload: ArticleXrayRequest;

  try {
    payload = (await readJsonBody(request)) as ArticleXrayRequest;
  } catch {
    sendJson(response, 400, {
      type: "article-xray-error",
      code: "bad_request",
      message: "Expected a valid JSON Article X-Ray request."
    } satisfies ArticleXrayError);
    return;
  }

  const output = await runSuperiorFunction(
    createSuperiorFunctionRunRequest({
      functionId: "article-xray",
      input: payload,
      bot: payload.bot
    }),
    createFunctionRunContext(request)
  );

  if (isSuperiorFunctionError(output)) {
    sendJson(response, getFunctionStatusCode(output.code), toArticleXrayError(output, payload.requestId));
    return;
  }

  sendJson(response, 200, output.result);
}

async function handleRepoReader(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (!isTrustedLocalOrigin(request.headers.origin)) {
    sendJson(response, 403, {
      type: "repo-reader-error",
      code: "bad_request",
      message: "Repo Reader only accepts local Workshop requests."
    } satisfies RepoReaderContractError);
    return;
  }

  let payload: RepoReaderRequest;

  try {
    payload = (await readJsonBody(request)) as RepoReaderRequest;
  } catch {
    sendJson(response, 400, {
      type: "repo-reader-error",
      code: "bad_request",
      message: "Expected a valid JSON Repo Reader request."
    } satisfies RepoReaderContractError);
    return;
  }

  if (payload.type !== "repo-reader" || typeof payload.repoUrl !== "string") {
    sendJson(response, 400, {
      type: "repo-reader-error",
      requestId: payload.requestId,
      code: "bad_request",
      message: "Give SUPERIOR a GitHub repo link."
    } satisfies RepoReaderContractError);
    return;
  }

  try {
    const output = await runSuperiorFunction(
      createSuperiorFunctionRunRequest({
        functionId: "repo-reader",
        input: payload,
        bot: payload.bot
      }),
      createFunctionRunContext(request)
    );

    if (isSuperiorFunctionError(output)) {
      sendJson(response, getFunctionStatusCode(output.code), toRepoReaderError(output, payload.requestId));
      return;
    }

    sendJson(response, 200, output.result);
  } catch (error) {
    sendJson(response, 502, {
      type: "repo-reader-error",
      requestId: payload.requestId,
      code: "network_error",
      message: error instanceof Error ? error.message : "Repo Reader failed."
    } satisfies RepoReaderContractError);
  }
}

async function handleExplain(request: IncomingMessage, response: ServerResponse): Promise<void> {
  let payload: ExplainPageRequest;

  try {
    payload = (await readJsonBody(request)) as ExplainPageRequest;
  } catch {
    sendJson(response, 400, {
      type: "explain-page-error",
      code: "bad_request",
      message: "Expected a valid JSON explain request."
    } satisfies ExplainPageError);
    return;
  }

  const output = await runSuperiorFunction(
    createSuperiorFunctionRunRequest({
      functionId: "page-explainer",
      input: payload,
      bot: payload.bot
    }),
    createFunctionRunContext(request)
  );

  if (isSuperiorFunctionError(output)) {
    sendJson(response, getFunctionStatusCode(output.code), toExplainPageError(output, payload.requestId));
    return;
  }

  sendJson(response, 200, output.result);
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (body.length > 1_000_000) {
      throw new Error("Request body too large.");
    }
  }

  return JSON.parse(body);
}

async function readOptionalJsonBody(request: IncomingMessage): Promise<unknown | null> {
  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (body.length > 1_000_000) {
      throw new Error("Request body too large.");
    }
  }

  return body.trim() ? JSON.parse(body) : null;
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendHtml(response: ServerResponse, statusCode: number, html: string): void {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8"
  });
  response.end(html);
}

function openExternalUrl(url: string): void {
  const command = process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";

  exec(`${command} "${url}"`);
}

function sendFunctionOutput(response: ServerResponse, output: SuperiorFunctionRunnerOutput): void {
  if (isSuperiorFunctionError(output)) {
    sendJson(response, getFunctionStatusCode(output.code), output);
    return;
  }

  sendJson(response, 200, output);
}

function getFunctionStatusCode(code: SuperiorFunctionErrorCode): number {
  if (code === "unauthorized") {
    return 401;
  }

  if (code === "missing_permission") {
    return 403;
  }

  if (
    code === "missing_config" ||
    code === "missing_browser" ||
    code === "missing_extension" ||
    code === "not_running"
  ) {
    return 503;
  }

  if (code === "not_found" || code === "unknown_repo") {
    return 404;
  }

  if (code === "rate_limited") {
    return 429;
  }

  if (code === "runner_failed" || code === "launch_failed") {
    return 502;
  }

  return 400;
}

function createFunctionRunContext(request: IncomingMessage): Parameters<typeof runSuperiorFunction>[1] {
  const pairingHeaderToken = readPairingHeader(request);

  return {
    config,
    ...(pairingHeaderToken ? { pairingHeaderToken } : {}),
    trustedLocalOrigin: isTrustedLocalOrigin(request.headers.origin)
  };
}

function toArticleXrayError(output: SuperiorFunctionError, requestId: string | undefined): ArticleXrayError {
  return {
    type: "article-xray-error",
    ...(requestId ? { requestId } : {}),
    code:
      output.code === "unauthorized"
        ? "unauthorized"
        : output.code === "empty_input"
          ? "empty_page"
          : "bad_request",
    message: output.message
  };
}

function toExplainPageError(output: SuperiorFunctionError, requestId: string | undefined): ExplainPageError {
  return {
    type: "explain-page-error",
    ...(requestId ? { requestId } : {}),
    code:
      output.code === "unauthorized"
        ? "unauthorized"
        : output.code === "empty_input"
          ? "empty_page"
          : output.code === "missing_config"
            ? "missing_config"
            : output.code === "bad_request"
              ? "bad_request"
              : "provider_error",
    message: output.message
  };
}

function toRepoReaderError(output: SuperiorFunctionError, requestId: string | undefined): RepoReaderContractError {
  return {
    type: "repo-reader-error",
    ...(requestId ? { requestId } : {}),
    code:
      output.code === "not_found"
        ? "not_found"
        : output.code === "rate_limited"
          ? "rate_limited"
          : output.code === "bad_request" || output.code === "missing_permission"
            ? "bad_request"
            : "network_error",
    message: output.message
  };
}

function toCustomSkillImportError(
  output: SuperiorFunctionError,
  requestId: string | undefined
): CustomSkillImportError {
  return {
    type: "custom-skill-import-error",
    ...(requestId ? { requestId } : {}),
    code:
      output.code === "not_found"
        ? "not_found"
        : output.code === "bad_request" || output.code === "missing_permission"
          ? "bad_request"
          : "scan_failed",
    message: output.message
  };
}

function toSuperiorBrowserError(output: SuperiorFunctionError, requestId: string | undefined): SuperiorBrowserError {
  return {
    type: "superior-browser-error",
    ...(requestId ? { requestId } : {}),
    code: toSuperiorBrowserErrorCode(output.code),
    message: output.message
  };
}

function toSuperiorBrowserErrorCode(code: SuperiorFunctionErrorCode): SuperiorBrowserError["code"] {
  if (
    code === "unknown_repo" ||
    code === "missing_browser" ||
    code === "missing_extension" ||
    code === "launch_failed" ||
    code === "not_running" ||
    code === "unauthorized"
  ) {
    return code;
  }

  return code === "bad_request" || code === "missing_permission" ? "bad_request" : "launch_failed";
}

function sendBrowserRuntimeError(response: ServerResponse, requestId: string | undefined, error: unknown): void {
  if (error instanceof BrowserRuntimeError) {
    const statusCode =
      error.code === "unknown_repo" || error.code === "not_running"
        ? 404
        : error.code === "missing_browser" || error.code === "missing_extension"
          ? 503
          : error.code === "unauthorized"
            ? 401
            : 400;

    sendJson(response, statusCode, {
      type: "superior-browser-error",
      ...(requestId ? { requestId } : {}),
      code: error.code,
      message: error.message
    } satisfies SuperiorBrowserError);
    return;
  }

  sendJson(response, 500, {
    type: "superior-browser-error",
    ...(requestId ? { requestId } : {}),
    code: "launch_failed",
    message: error instanceof Error ? error.message : "SUPERIOR Browser failed."
  } satisfies SuperiorBrowserError);
}

function sendGameRuntimeError(response: ServerResponse, requestId: string | undefined, error: unknown): void {
  if (error instanceof GameRuntimeServiceError) {
    sendJson(response, getGameRuntimeStatusCode(error.code), createGameRuntimeError(error.code, error.message, requestId));
    return;
  }

  if (error instanceof GameTargetStoreError) {
    const code = error.code === "missing_exe" ? "missing_exe" : "bad_request";
    sendJson(response, getGameRuntimeStatusCode(code), createGameRuntimeError(code, error.message, requestId));
    return;
  }

  if (error instanceof GameServerRouteStoreError) {
    sendJson(response, 400, createGameRuntimeError("bad_request", error.message, requestId));
    return;
  }

  sendJson(
    response,
    500,
    createGameRuntimeError(
      "launch_failed",
      error instanceof Error ? error.message : "Game Rig failed.",
      requestId
    )
  );
}

function createGameRuntimeError(
  code: GameRuntimeError["code"],
  message: string,
  requestId?: string
): GameRuntimeError {
  return {
    type: "game-runtime-error",
    ...(requestId ? { requestId } : {}),
    code,
    message,
    createdAt: new Date().toISOString()
  };
}

function getGameRuntimeStatusCode(code: GameRuntimeError["code"]): number {
  if (code === "unauthorized") {
    return 401;
  }

  if (code === "not_found" || code === "not_running") {
    return 404;
  }

  if (code === "missing_exe" || code === "capture_blocked" || code === "focus_lost" || code === "budget_exhausted") {
    return 503;
  }

  if (code === "launch_failed") {
    return 502;
  }

  return 400;
}

function setCorsHeaders(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Clawdbot-Pairing-Token");
  response.setHeader("Access-Control-Max-Age", "86400");
}

function readBotStarterPresets(): BotStarterPresetsResponse {
  return {
    type: "bot-starter-presets",
    items: botStarterPresets.map((preset) => ({
      ...preset,
      skills: [...preset.skills]
    })),
    createdAt: new Date().toISOString()
  };
}

function readBotCreationOptions(): BotCreationOptionsResponse {
  return {
    type: "bot-creation-options",
    shapes: botCreationShapes.map((shape) => ({ ...shape })),
    races: sporeRaceCatalog.map((race) => ({ ...race })),
    skills: botSkillLoadoutOptions.map((skill) => ({ ...skill })),
    premadeSkillParts: premadeSkillPartOptions.map((skill) => ({
      ...skill,
      fits: [...skill.fits]
    })),
    createdAt: new Date().toISOString()
  };
}

function getSetupAccountState(): SuperiorSetupState["account"] {
  const session = getActiveAccountSession();
  const stored = readStoredAccountState();
  const profile = stored.profile;
  const configured = isAccountConfigured();
  const connectedProviders = profile?.connectedProviders ?? (session?.provider && session.provider !== "email-code" ? [session.provider] : []);
  const email = profile?.email ?? session?.email;

  return {
    status: session ? "signed-in" : configured ? "signed-out" : "offline",
    ...(profile?.handle ? { handle: profile.handle } : {}),
    ...(email ? { email } : {}),
    ...(session?.userId ? { userId: session.userId } : {}),
    ...(profile?.avatarUrl ? { avatarUrl: profile.avatarUrl } : {}),
    connectedProviders,
    providers: superiorAccountOAuthProviders.map((provider) => ({
      provider,
      label: formatAccountProviderLabel(provider),
      status: connectedProviders.includes(provider)
        ? "connected"
        : configured
          ? "available"
          : "not-configured",
      detail: connectedProviders.includes(provider)
        ? "linked"
        : configured
          ? "ready"
          : "missing config"
    })),
    ...(profile?.updatedAt ? { syncedAt: profile.updatedAt } : {}),
    detail:
      profile?.handle ??
      profile?.email ??
      (session ? "spore claimed" : configured ? "Google / X / Discord" : "account offline")
  };
}

function formatAccountProviderLabel(provider: SuperiorAccountOAuthProvider): "Google" | "X" | "Discord" {
  if (provider === "google") {
    return "Google";
  }

  if (provider === "discord") {
    return "Discord";
  }

  return "X";
}

function getActiveAccountSession(): SuperiorAccountSession | null {
  const session = readStoredAccountState().session;

  if (!session) {
    return null;
  }

  if (typeof session.expiresAt === "number" && session.expiresAt <= Math.floor(Date.now() / 1000)) {
    clearStoredAccountSession();
    return null;
  }

  return session;
}

function isAccountConfigured(): boolean {
  return Boolean(config.supabaseUrl && config.supabasePublishableKey);
}

function parseAccountProvider(value: unknown): SuperiorAccountOAuthProvider | null {
  return superiorAccountOAuthProviders.includes(value as SuperiorAccountOAuthProvider)
    ? (value as SuperiorAccountOAuthProvider)
    : null;
}

async function startAccountOAuth(
  provider: SuperiorAccountOAuthProvider,
  redirectTo: string | undefined
): Promise<SuperiorAccountOAuthStartResult> {
  const response = await fetch(`${getAccountBaseUrl()}/start-oauth`, {
    method: "POST",
    headers: getAccountHeaders(),
    body: JSON.stringify({
      type: "superior-account-start-oauth",
      provider,
      ...(redirectTo ? { redirectTo } : {})
    })
  });

  if (!response.ok) {
    throw new Error(await readRemoteAccountError(response, "Supabase did not return an OAuth URL."));
  }

  return (await response.json()) as SuperiorAccountOAuthStartResult;
}

async function syncAccountProfile(accessToken: string, activeSporeId: string): Promise<SuperiorAccountProfile> {
  const baseUrl = getAccountBaseUrl();
  const authorizationHeaders = getAccountHeaders({
    Authorization: `Bearer ${accessToken}`
  });
  const profileResponse = await fetch(`${baseUrl}/profile`, {
    headers: authorizationHeaders
  });

  if (!profileResponse.ok) {
    throw new Error(await readRemoteAccountError(profileResponse, "Could not read account profile."));
  }

  const profile = (await profileResponse.json()) as SuperiorAccountProfile;
  const upsertResponse = await fetch(`${baseUrl}/profile`, {
    method: "PUT",
    headers: authorizationHeaders,
    body: JSON.stringify({
      handle: profile.handle,
      activeSporeId
    })
  });

  if (!upsertResponse.ok) {
    throw new Error(await readRemoteAccountError(upsertResponse, "Could not save account profile."));
  }

  return (await upsertResponse.json()) as SuperiorAccountProfile;
}

async function syncAccountSpore(accessToken: string, bot: BotIdentity): Promise<void> {
  const response = await fetch(`${getAccountBaseUrl()}/spore`, {
    method: "PUT",
    headers: getAccountHeaders({
      Authorization: `Bearer ${accessToken}`
    }),
    body: JSON.stringify({
      starterPresetId: bot.starterPresetId,
      spore: createBotSporeFromIdentity(bot)
    })
  });

  if (!response.ok) {
    throw new Error(await readRemoteAccountError(response, "Could not sync the active spore."));
  }
}

function getAccountBaseUrl(): string {
  if (!config.supabaseUrl) {
    throw new Error("SUPABASE_URL is not configured.");
  }

  return `${config.supabaseUrl.replace(/\/+$/, "")}/functions/v1/account`;
}

function getAccountHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  if (!config.supabasePublishableKey) {
    throw new Error("SUPABASE_PUBLISHABLE_KEY is not configured.");
  }

  return {
    "Content-Type": "application/json",
    apikey: config.supabasePublishableKey,
    ...extraHeaders
  };
}

async function readRemoteAccountError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as Partial<SuperiorAccountError> | null;

  return payload?.message ?? fallback;
}

function renderAccountOAuthCallbackPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>SUPERIOR Sign-In</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Segoe UI", sans-serif;
        background: #dcc29e;
        color: #2e211a;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(255, 233, 177, 0.74), transparent 28%),
          linear-gradient(180deg, #8fb2b8 0%, #caa47c 54%, #8f5639 100%);
      }
      main {
        width: min(420px, calc(100vw - 24px));
        padding: 24px 22px;
        border-radius: 24px;
        background: rgba(255, 244, 219, 0.92);
        box-shadow: 0 22px 60px rgba(33, 22, 16, 0.24);
      }
      p {
        margin: 0;
        line-height: 1.45;
      }
      .kicker {
        display: inline-block;
        margin-bottom: 10px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      #status {
        font-size: 24px;
        font-weight: 700;
      }
      #detail {
        margin-top: 10px;
        color: #6c5342;
      }
    </style>
  </head>
  <body>
    <main>
      <span class="kicker">SUPERIOR</span>
      <p id="status">Finishing sign-in...</p>
      <p id="detail">Keep the Workshop open.</p>
    </main>
    <script>
      const status = document.getElementById("status");
      const detail = document.getElementById("detail");
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = fragment.get("access_token");
      const refreshToken = fragment.get("refresh_token");
      const expiresAt = fragment.get("expires_at");
      const authError = fragment.get("error_description") || fragment.get("error");

      history.replaceState(null, "", "/account/oauth/callback");

      if (authError) {
        status.textContent = "Sign-in failed";
        detail.textContent = authError;
      } else if (!accessToken) {
        status.textContent = "Token missing";
        detail.textContent = "The provider returned without an access token.";
      } else {
        fetch("/account/oauth/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: "superior-account-oauth-complete",
            accessToken,
            ...(refreshToken ? { refreshToken } : {}),
            ...(expiresAt ? { expiresAt: Number(expiresAt) } : {})
          })
        })
          .then(async (response) => {
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
              throw new Error(payload?.message || "Could not finish sign-in.");
            }

            const handle = payload?.profile?.handle || payload?.profile?.email || "spore claimed";

            status.textContent = "Account linked";
            detail.textContent = handle + ". Return to the Workshop.";
          })
          .catch((error) => {
            status.textContent = "Sign-in failed";
            detail.textContent = error instanceof Error ? error.message : "Could not finish sign-in.";
          });
      }
    </script>
  </body>
</html>`;
}

function readSetupState(): SuperiorSetupState {
  const bot = readServiceBotIdentity();
  const browserLinkState = readBrowserLinkState();
  const modelProviderState = readModelProviderState(config);
  const accountState = getSetupAccountState();
  const activeBotSaved = hasSavedBotIdentity();

  const setupPhase: SuperiorSetupState["setupPhase"] =
    accountState.status !== "signed-in" ? "needs-account" : !activeBotSaved ? "needs-spore" : "ready";

  const keyReady = modelProviderState.openAiKeyStatus === "ready" || modelProviderState.openAiKeyStatus === "saved";
  const modelReady = modelProviderState.modelProvider !== "missing";
  const browserReady = browserLinkState.status === "paired";
  const botStatus: SuperiorSetupState["bot"]["status"] = activeBotSaved
    ? bot.starterPresetId
      ? "saved"
      : "custom"
    : "starter-seed";

  return {
    type: "superior-setup-state",
    activeBotSaved,
    requiresSetup: !activeBotSaved || accountState.status !== "signed-in",
    setupPhase,
    steps: [
      {
        step: "account",
        status:
          accountState.status === "signed-in" ? "ready" : accountState.status === "offline" ? "blocked" : "missing",
        label: "Account",
        detail: accountState.detail
      },
      {
        step: "daemon",
        status: "ready",
        label: "Power",
        detail: "daemon awake"
      },
      {
        step: "key",
        status: keyReady ? "ready" : "missing",
        label: "Key",
        detail: keyReady ? "key ready" : "key missing"
      },
      {
        step: "model",
        status: modelReady ? "ready" : "missing",
        label: "Model",
        detail: modelProviderState.detail
      },
      {
        step: "browser",
        status: browserReady ? "ready" : "missing",
        label: "Browser",
        detail: browserReady ? "hand fitted" : browserLinkState.status
      },
      {
        step: "starter",
        status: "ready",
        label: "Starter",
        detail: bot.starterPresetId ?? "clawd"
      },
      {
        step: "skills",
        status: "ready",
        label: "Skills",
        detail: bot.skills.join(" / ")
      },
      {
        step: "assembly",
        status: "ready",
        label: "Build",
        detail: `${bot.body} / ${bot.color} / ${bot.eye}`
      },
      {
        step: "finish",
        status: activeBotSaved && accountState.status === "signed-in" ? "ready" : "blocked",
        label: "Save",
        detail:
          activeBotSaved && accountState.status === "signed-in"
            ? "active bot saved"
            : accountState.status !== "signed-in"
              ? "claim spore first"
              : "save active bot"
      }
    ],
    account: accountState,
    daemon: {
      status: "ready",
      detail: `SUPERIOR daemon ${config.version}`
    },
    key: {
      status: keyReady ? "ready" : "missing",
      keyFilePath: config.keyFilePath,
      source: config.openaiConfigSource
    },
    browser: {
      status: browserLinkState.status,
      ...(browserLinkState.extensionId ? { extensionId: browserLinkState.extensionId } : {}),
      ...(browserLinkState.lastSeenAt ? { lastSeenAt: browserLinkState.lastSeenAt } : {})
    },
    model: modelProviderState,
    bot: {
      status: botStatus,
      identity: bot,
      ...(bot.starterPresetId ? { starterPresetId: bot.starterPresetId } : {})
    },
    createdAt: new Date().toISOString()
  };
}

function readMobileCompanion(): MobileCompanionResponse {
  const bot = readServiceBotIdentity();
  const spore = createBotSporeFromIdentity(bot);
  const account = getSetupAccountState();
  const modelProviderState = readModelProviderState(config);
  const browserLinkState = readBrowserLinkState();
  const browserState = getSuperiorBrowserState();
  const recentProof = [
    ...readRecentSkillResults().items.map(toMobileSkillProof),
    ...readRecentFunctionRuns().items.map(toMobileFunctionProof)
  ]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, 8);

  return {
    type: "superior-mobile-companion",
    bot: {
      id: bot.id,
      name: bot.name,
      body: bot.body,
      color: bot.color,
      eye: bot.eye,
      ...(bot.race ? { race: bot.race } : {}),
      avatarAsset: spore.appearance.avatarAsset,
      equippedSkills: bot.skills.map((skillId) => {
        const skill = skillCatalog[skillId];

        return {
          id: skill.id,
          label: skill.label,
          slot: skill.slot,
          attachment: skill.attachment,
          effect: skill.effect
        };
      }),
      ...(bot.updatedAt ? { updatedAt: bot.updatedAt } : {})
    },
    account: {
      status: account.status,
      ...(account.handle ? { handle: account.handle } : {}),
      ...(account.avatarUrl ? { avatarUrl: account.avatarUrl } : {}),
      connectedProviders: account.connectedProviders ?? [],
      detail: account.detail
    },
    device: {
      browser: {
        status: browserLinkState.status,
        ...(browserLinkState.extensionId ? { extensionId: browserLinkState.extensionId } : {}),
        ...(browserLinkState.lastSeenAt ? { lastSeenAt: browserLinkState.lastSeenAt } : {})
      },
      superiorBrowser: toMobileBrowserRuntime(browserState),
      model: {
        modelProvider: modelProviderState.modelProvider,
        ollamaStatus: modelProviderState.ollamaStatus,
        openAiKeyStatus: modelProviderState.openAiKeyStatus,
        detail: modelProviderState.detail
      }
    },
    recentProof,
    asset: {
      id: "mobile-clawd-gremlin",
      version: "mobile-3d-0.1",
      format: "glb",
      runtimePath: "assets/bots/mobile-3d/generated/mobile-clawd-gremlin.glb",
      sourcePath: "assets/bots/mobile-3d/asset-manifest.json",
      triangleCount: 492,
      fileBytes: 19064,
      requiredNodeNames: [
        "Body_Gremlin",
        "Eye_Left_Pixel",
        "Eye_Right_Pixel",
        "Antenna_Left",
        "Antenna_Right",
        "Skill_ArticleXray_Lens",
        "Skill_RepoReader_Gear"
      ]
    },
    share: {
      status: "not-configured",
      acceptedInputs: ["url", "text"],
      detail: "Share-sheet capture is a future mobile lane; desktop remains the alpha runtime."
    },
    privacy: {
      localOnly: true,
      excludes: [
        "OpenAI API keys",
        "raw browser pairing tokens",
        "browser profile paths",
        "debug ports",
        "page text",
        "local repo workspace data"
      ]
    },
    createdAt: new Date().toISOString()
  };
}

function toMobileBrowserRuntime(browserState: SuperiorBrowserState): MobileCompanionResponse["device"]["superiorBrowser"] {
  const session = browserState.activeSession;

  return {
    status: browserState.status,
    ...(session?.browserKind ? { browserKind: session.browserKind } : {}),
    ...(session?.repoTitle ? { repoTitle: session.repoTitle } : {}),
    ...(session?.playpenLabel ? { playpenLabel: session.playpenLabel } : {}),
    ...(session?.startedAt ? { startedAt: session.startedAt } : {}),
    ...(session?.pairedAt ? { pairedAt: session.pairedAt } : {}),
    ...(session?.inspection
      ? {
          inspection: {
            status: session.inspection.status,
            ...(session.inspection.pageTitle ? { pageTitle: session.inspection.pageTitle } : {}),
            consoleErrorCount: session.inspection.consoleErrorCount,
            networkFailureCount: session.inspection.networkFailureCount,
            ...(session.inspection.note ? { note: session.inspection.note } : {})
          }
        }
      : {})
  };
}

function toMobileSkillProof(item: RecentSkillResult): MobileCompanionRecentProof {
  const sourceHost = readSourceHost(item.source.url);

  return {
    type: "mobile-companion-proof",
    id: item.id,
    source: "recent-skill",
    label: item.skillLabel,
    status: item.status,
    summary: item.status === "ready" ? `${item.skillLabel} proof recorded.` : `${item.skillLabel} needs review.`,
    detail: `${item.skillLabel} ran on ${sourceHost ?? "captured source"}.`,
    skillId: item.skillId,
    ...(sourceHost ? { sourceHost } : {}),
    sourceTitle: item.source.title,
    createdAt: item.createdAt
  };
}

function toMobileFunctionProof(item: SuperiorFunctionRunSummary): MobileCompanionRecentProof {
  return {
    type: "mobile-companion-proof",
    id: item.runId,
    source: "function-run",
    label: item.label,
    status: item.status === "completed" ? "ready" : "failed",
    summary: item.status === "completed" ? `${item.label} completed.` : `${item.label} failed.`,
    detail: item.botReaction.slot
      ? `${item.botReaction.label} / ${item.botReaction.slot}`
      : item.botReaction.label,
    functionId: item.functionId,
    ...(item.botReaction.skillId ? { skillId: item.botReaction.skillId } : {}),
    createdAt: item.createdAt
  };
}

function readSourceHost(value: string): string | undefined {
  try {
    return new URL(value).host;
  } catch {
    return undefined;
  }
}

function readServiceBotIdentity(): BotIdentity {
  return {
    ...readBotIdentity(),
    browserLinkState: readBrowserLinkState()
  };
}

function isValidPairingHeader(request: IncomingMessage): boolean {
  const headerToken = readPairingHeader(request);

  return Boolean(headerToken && touchBrowserPairing(headerToken));
}

function readPairingHeader(request: IncomingMessage): string | undefined {
  const headerPairingToken = request.headers["x-clawdbot-pairing-token"];

  return Array.isArray(headerPairingToken) ? headerPairingToken[0] : headerPairingToken;
}

function isTrustedLocalOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  return (
    origin === "tauri://localhost" ||
    origin === "http://127.0.0.1:5173" ||
    origin === "http://localhost:5173"
  );
}
