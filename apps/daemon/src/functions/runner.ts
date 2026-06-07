import { exec } from "node:child_process";
import { promisify } from "node:util";
import {
  ArticleXrayRequest,
  CustomSkillImportRequest,
  ExplainPageRequest,
  RepoReaderRequest,
  SuperiorBotReaction,
  SuperiorBrowserStartRequest,
  SuperiorFunctionDefinition,
  SuperiorFunctionError,
  SuperiorFunctionErrorCode,
  SuperiorFunctionId,
  SuperiorFunctionRunEvent,
  SuperiorFunctionRunEventKind,
  SuperiorFunctionRunRequest,
  SuperiorFunctionRunResult,
  SuperiorFunctionRunSummary,
  SuperiorSignalKind,
  createLocalId,
  hasUsablePageText,
  skillLabels
} from "@clawdbot/shared";

const execAsync = promisify(exec);

import { hasArticleContent, runArticleXray } from "../articleXray.js";
import { touchBrowserPairing } from "../browserLinkStore.js";
import {
  BrowserRuntimeError,
  rememberSuperiorBrowserSkillRun,
  startSuperiorBrowser,
  stopSuperiorBrowser
} from "../browserRuntime.js";
import { DaemonConfig } from "../config.js";
import { CustomSkillImportScanError, proposeCustomSkillImport } from "../customSkillImport.js";
import { MissingOpenAIConfigError, explainPageWithOpenAI } from "../openaiProvider.js";
import {
  rememberArticleXrayResult,
  rememberExplainPageResult,
  rememberRepoReaderResult
} from "../recentResultsStore.js";
import { RepoReaderError, runRepoReader } from "../repoReader.js";
import { rememberRepoWorkspaceRecord } from "../repoWorkspaceStore.js";
import { getSuperiorFunctionDefinition } from "./catalog.js";
import { rememberFunctionRun } from "./runEventsStore.js";
import { emitSuperiorSignal } from "../signalClient.js";

export interface SuperiorFunctionRunContext {
  config: DaemonConfig;
  pairingHeaderToken?: string;
  trustedLocalOrigin: boolean;
}

export type SuperiorFunctionRunnerOutput = SuperiorFunctionRunResult | SuperiorFunctionError;

export async function runSuperiorFunction(
  request: SuperiorFunctionRunRequest,
  context: SuperiorFunctionRunContext
): Promise<SuperiorFunctionRunnerOutput> {
  const runId = createLocalId("run");
  const events: SuperiorFunctionRunEvent[] = [];
  const definition = getSuperiorFunctionDefinition(request.functionId);

  addEvent(events, runId, request, "queued", "Queued");

  if (!definition) {
    return failRun(request, runId, events, undefined, "unknown_function", "That robot part is not registered.");
  }

  addEvent(events, runId, request, "validated", "Validated");

  try {
    const result = await runFunctionAdapter(definition, request, context, runId, events);

    addEvent(events, runId, request, "result_saved", "Result saved", getResultSummary(definition.id, result));

    return completeRun(request, runId, events, definition, result);
  } catch (error) {
    return failRun(
      request,
      runId,
      events,
      definition,
      getFunctionErrorCode(error),
      getFunctionErrorMessage(error, definition)
    );
  }
}

export function isSuperiorFunctionError(output: SuperiorFunctionRunnerOutput): output is SuperiorFunctionError {
  return output.type === "superior-function-error";
}

async function runFunctionAdapter(
  definition: SuperiorFunctionDefinition,
  request: SuperiorFunctionRunRequest,
  context: SuperiorFunctionRunContext,
  runId: string,
  events: SuperiorFunctionRunEvent[]
): Promise<unknown> {
  addEvent(events, runId, request, "running", "Running", definition.label);

  if (definition.surfaces.includes("workshop") && !context.trustedLocalOrigin) {
    throw new FunctionRunError("missing_permission", "This function only accepts local Workshop requests.");
  }

  switch (definition.id) {
    case "article-xray":
      return runArticleXrayAdapter(request, context, runId, events);
    case "page-explainer":
      return runPageExplainerAdapter(request, context, runId, events);
    case "repo-reader":
      return runRepoReaderAdapter(request);
    case "superior-browser-start":
      return runBrowserStartAdapter(request);
    case "superior-browser-stop":
      return runBrowserStopAdapter();
    case "custom-skill-import-proposal":
      return runCustomSkillImportAdapter(request);
    case "pi-status":
      return runPiStatusAdapter(request, context, runId, events);
    default:
      throw new FunctionRunError("unknown_function", "That robot part is not registered.");
  }
}

async function runPiStatusAdapter(
  request: SuperiorFunctionRunRequest,
  context: SuperiorFunctionRunContext,
  runId: string,
  events: SuperiorFunctionRunEvent[]
): Promise<unknown> {
  const SshHost = "pi@192.168.137.142";
  const RemotePath = "/home/pi/plant";

  const remoteScript = `
set -euo pipefail
printf 'timestamp='; date --iso-8601=seconds
printf 'hostname='; hostname
printf 'uptime='; uptime -p
printf 'memory='; free -h | awk 'NR==2 {print $3 "/" $2 " used"}'
printf 'disk='; df -h / | awk 'NR==2 {print $3 "/" $2 " used (" $5 ")"}'
printf 'venv='; if [ -d '${RemotePath}/.venv' ]; then echo present; else echo missing; fi
printf 'repo='; if [ -d '${RemotePath}/.git' ]; then echo present; else echo missing; fi
`.trim();

  addEvent(events, runId, request, "running", "Connecting to Pi...", SshHost);

  try {
    const { stdout } = await execAsync(`echo "${remoteScript}" | ssh ${SshHost} "bash -s"`);
    const lines = stdout.trim().split("\n");
    const result: Record<string, string> = {};

    for (const line of lines) {
      const [key, ...values] = line.split("=");
      if (key) {
        result[key] = values.join("=");
      }
    }

    return {
      type: "pi-status-result",
      status: "ready",
      summary: `Pi is ${result.uptime || "up"}. Mem: ${result.memory || "unknown"}.`,
      details: result,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    throw new FunctionRunError("runner_failed", `Could not connect to Pi at ${SshHost}.`);
  }
}

function runArticleXrayAdapter(
  request: SuperiorFunctionRunRequest,
  context: SuperiorFunctionRunContext,
  runId: string,
  events: SuperiorFunctionRunEvent[]
): unknown {
  const payload = requireArticleXrayRequest(request.input);

  requirePairing(payload.pairingToken, context);
  addEvent(events, runId, request, "browser_context_received", "Browser context received", payload.page.title);

  if (!hasArticleContent(payload)) {
    throw new FunctionRunError("empty_input", "SUPERIOR needs selected text, readable article blocks, or page text.");
  }

  const result = runArticleXray(payload);
  rememberArticleXrayResult(result);
  rememberSuperiorBrowserSkillRun("Article X-Ray", result.source.title, result.source.url);

  return result;
}

async function runPageExplainerAdapter(
  request: SuperiorFunctionRunRequest,
  context: SuperiorFunctionRunContext,
  runId: string,
  events: SuperiorFunctionRunEvent[]
): Promise<unknown> {
  const payload = requireExplainPageRequest(request.input);

  requirePairing(payload.pairingToken, context);
  addEvent(events, runId, request, "browser_context_received", "Browser context received", payload.page.title);

  if (!hasUsablePageText(payload.page)) {
    throw new FunctionRunError("empty_input", "SUPERIOR needs selected text or readable page text.");
  }

  addEvent(events, runId, request, "model_called", "Model called", context.config.openaiModel);
  const result = await explainPageWithOpenAI(payload, context.config);
  rememberExplainPageResult(result);
  rememberSuperiorBrowserSkillRun("Page Explainer", result.source.title, result.source.url);

  return result;
}

async function runRepoReaderAdapter(request: SuperiorFunctionRunRequest): Promise<unknown> {
  const payload = requireRepoReaderRequest(request.input);
  const result = await runRepoReader(payload);

  rememberRepoReaderResult(result);
  rememberRepoWorkspaceRecord(result);

  return result;
}

async function runBrowserStartAdapter(request: SuperiorFunctionRunRequest): Promise<unknown> {
  return startSuperiorBrowser(requireSuperiorBrowserStartRequest(request.input));
}

async function runBrowserStopAdapter(): Promise<unknown> {
  return {
    type: "superior-browser-stop-result",
    state: await stopSuperiorBrowser(),
    createdAt: new Date().toISOString()
  };
}

async function runCustomSkillImportAdapter(request: SuperiorFunctionRunRequest): Promise<unknown> {
  return proposeCustomSkillImport(requireCustomSkillImportRequest(request.input));
}

function completeRun(
  request: SuperiorFunctionRunRequest,
  runId: string,
  events: SuperiorFunctionRunEvent[],
  definition: SuperiorFunctionDefinition,
  result: unknown
): SuperiorFunctionRunResult {
  const createdAt = new Date().toISOString();
  const botReaction = createBotReaction(definition, runId, "success", getResultSummary(definition.id, result));

  rememberFunctionRun(
    {
      type: "superior-function-run-summary",
      runId,
      requestId: request.requestId,
      functionId: definition.id,
      label: definition.label,
      status: "completed",
      summary: getResultSummary(definition.id, result),
      botReaction,
      createdAt
    },
    events
  );

  return {
    type: "superior-function-run-result",
    requestId: request.requestId,
    runId,
    functionId: definition.id,
    status: "completed",
    result,
    events,
    botReaction,
    createdAt
  };
}

function failRun(
  request: SuperiorFunctionRunRequest,
  runId: string,
  events: SuperiorFunctionRunEvent[],
  definition: SuperiorFunctionDefinition | undefined,
  code: SuperiorFunctionErrorCode,
  message: string
): SuperiorFunctionError {
  const createdAt = new Date().toISOString();
  const botReaction = definition ? createBotReaction(definition, runId, "failure", message) : undefined;

  addEvent(events, runId, request, "failed", "Failed", message);

  if (definition && botReaction) {
    rememberFunctionRun(
      {
        type: "superior-function-run-summary",
        runId,
        requestId: request.requestId,
        functionId: definition.id,
        label: definition.label,
        status: "failed",
        summary: message,
        botReaction,
        createdAt
      },
      events
    );
  }

  return {
    type: "superior-function-error",
    requestId: request.requestId,
    runId,
    ...(definition ? { functionId: definition.id } : {}),
    code,
    message,
    events,
    ...(botReaction ? { botReaction } : {}),
    createdAt
  };
}

function addEvent(
  events: SuperiorFunctionRunEvent[],
  runId: string,
  request: SuperiorFunctionRunRequest,
  kind: SuperiorFunctionRunEventKind,
  label: string,
  detail?: string
): void {
  events.push({
    type: "superior-function-run-event",
    id: createLocalId("function_event"),
    runId,
    requestId: request.requestId,
    functionId: request.functionId,
    kind,
    label,
    ...(detail ? { detail } : {}),
    createdAt: new Date().toISOString()
  });

  // Emit real-time signal for the Godot Workshop
  const signalKind: SuperiorSignalKind =
    kind === "running" ? "agent" : kind === "model_called" ? "agent" : kind === "failed" ? "system" : "system";
  emitSuperiorSignal(signalKind, label, kind === "failed" ? 2 : 1, detail);
}

function createBotReaction(
  definition: SuperiorFunctionDefinition,
  runId: string,
  state: "success" | "failure",
  detail: string
): SuperiorBotReaction {
  return {
    type: "superior-bot-reaction",
    state,
    pulseKey: `${runId}:${definition.id}:${state}`,
    label: state === "success" ? `${definition.shortLabel} clicked` : `${definition.shortLabel} jammed`,
    detail,
    ...(definition.skillId ? { skillId: definition.skillId } : {}),
    ...(definition.slot ? { slot: definition.slot } : {}),
    createdAt: new Date().toISOString()
  };
}

function requirePairing(payloadToken: string | undefined, context: SuperiorFunctionRunContext): void {
  const token = payloadToken?.trim();

  if (!token || context.pairingHeaderToken !== token || !touchBrowserPairing(token)) {
    throw new FunctionRunError("unauthorized", "Pair the extension from SUPERIOR before running this skill.");
  }
}

function requireArticleXrayRequest(input: unknown): ArticleXrayRequest {
  const payload = input as Partial<ArticleXrayRequest>;

  if (
    payload.type !== "article-xray" ||
    typeof payload.requestId !== "string" ||
    typeof payload.pairingToken !== "string" ||
    typeof payload.page?.url !== "string" ||
    typeof payload.page.title !== "string"
  ) {
    throw new FunctionRunError("bad_request", "Expected an Article X-Ray function input.");
  }

  return payload as ArticleXrayRequest;
}

function requireExplainPageRequest(input: unknown): ExplainPageRequest {
  const payload = input as Partial<ExplainPageRequest>;

  if (
    payload.type !== "explain-page" ||
    typeof payload.requestId !== "string" ||
    typeof payload.pairingToken !== "string" ||
    typeof payload.page?.url !== "string" ||
    typeof payload.page.title !== "string"
  ) {
    throw new FunctionRunError("bad_request", "Expected a Page Explainer function input.");
  }

  return payload as ExplainPageRequest;
}

function requireRepoReaderRequest(input: unknown): RepoReaderRequest {
  const payload = input as Partial<RepoReaderRequest>;

  if (payload.type !== "repo-reader" || typeof payload.requestId !== "string" || typeof payload.repoUrl !== "string") {
    throw new FunctionRunError("bad_request", "Expected a Repo Reader function input.");
  }

  return payload as RepoReaderRequest;
}

function requireSuperiorBrowserStartRequest(input: unknown): SuperiorBrowserStartRequest {
  const payload = input as Partial<SuperiorBrowserStartRequest>;

  if (
    payload.type !== "superior-browser-start" ||
    typeof payload.requestId !== "string" ||
    typeof payload.repoWorkspaceId !== "string"
  ) {
    throw new FunctionRunError("bad_request", "Expected a SUPERIOR Browser start function input.");
  }

  return payload as SuperiorBrowserStartRequest;
}

function requireCustomSkillImportRequest(input: unknown): CustomSkillImportRequest {
  const payload = input as Partial<CustomSkillImportRequest>;

  if (
    payload.type !== "custom-skill-import" ||
    typeof payload.requestId !== "string" ||
    typeof payload.folderPath !== "string"
  ) {
    throw new FunctionRunError("bad_request", "Expected a custom skill import function input.");
  }

  return payload as CustomSkillImportRequest;
}

function getResultSummary(functionId: SuperiorFunctionId, result: unknown): string {
  const payload = result as {
    summary?: string;
    excerpt?: string;
    headline?: string;
    state?: { status?: string };
    status?: string;
    projectName?: string;
    source?: { title?: string };
  };

  if (typeof payload.summary === "string") {
    return payload.summary;
  }

  if (typeof payload.excerpt === "string") {
    return payload.excerpt;
  }

  if (typeof payload.headline === "string") {
    return payload.headline;
  }

  if (typeof payload.projectName === "string") {
    return payload.projectName;
  }

  if (typeof payload.state?.status === "string") {
    return payload.state.status;
  }

  if (typeof payload.status === "string") {
    return payload.status;
  }

  return skillLabels[functionId as keyof typeof skillLabels] ?? functionId;
}

function getFunctionErrorCode(error: unknown): SuperiorFunctionErrorCode {
  if (error instanceof FunctionRunError) {
    return error.code;
  }

  if (error instanceof MissingOpenAIConfigError) {
    return "missing_config";
  }

  if (error instanceof RepoReaderError) {
    return error.code === "not_found" || error.code === "rate_limited" ? error.code : "runner_failed";
  }

  if (error instanceof BrowserRuntimeError) {
    return error.code;
  }

  if (error instanceof CustomSkillImportScanError) {
    return error.code === "not_found" ? "not_found" : error.code === "scan_failed" ? "runner_failed" : "bad_request";
  }

  return "runner_failed";
}

function getFunctionErrorMessage(error: unknown, definition: SuperiorFunctionDefinition): string {
  if (error instanceof Error) {
    return error.message;
  }

  return `${definition.label} failed.`;
}

class FunctionRunError extends Error {
  constructor(
    public readonly code: SuperiorFunctionErrorCode,
    message: string
  ) {
    super(message);
  }
}
