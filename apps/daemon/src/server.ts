import { createServer, IncomingMessage, ServerResponse } from "node:http";
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
  RepoReaderError as RepoReaderContractError,
  RepoReaderRequest,
  SuperiorBrowserAttachRequest,
  SuperiorBrowserActivePageReport,
  SuperiorBrowserError,
  SuperiorBrowserStartRequest,
  SuperiorFunctionError,
  SuperiorFunctionErrorCode,
  SuperiorFunctionRunRequest,
  SuperiorModelProviderError,
  SuperiorModelProviderSelectRequest,
  SuperiorOpenAiKeySaveRequest,
  SuperiorSetupState,
  botCreationShapes,
  botSkillLoadoutOptions,
  botStarterPresets,
  createSuperiorFunctionRunRequest,
  premadeSkillPartOptions,
  sporeRaceCatalog,
  superiorAccountOAuthProviders
} from "@clawdbot/shared";
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
    sendJson(
      response,
      200,
      writeBotIdentity({
        ...payload,
        browserLinkState: readBrowserLinkState()
      })
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

function readSetupState(): SuperiorSetupState {
  const bot = readServiceBotIdentity();
  const browserLinkState = readBrowserLinkState();
  const modelProviderState = readModelProviderState(config);
  const activeBotSaved = hasSavedBotIdentity();
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
    requiresSetup: !activeBotSaved,
    steps: [
      {
        step: "account",
        status: "missing",
        label: "Account",
        detail: "Google / X / email code"
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
        status: activeBotSaved ? "ready" : "blocked",
        label: "Save",
        detail: activeBotSaved ? "active bot saved" : "save active bot"
      }
    ],
    account: {
      status: "signed-out",
      connectedProviders: [],
      providers: superiorAccountOAuthProviders.map((provider) => ({
        provider,
        label: provider === "google" ? "Google" : "X",
        status: "available",
        detail: provider === "google" ? "Supabase Google OAuth" : "Supabase X OAuth 2.0"
      })),
      detail: "Google / X / email code"
    },
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
