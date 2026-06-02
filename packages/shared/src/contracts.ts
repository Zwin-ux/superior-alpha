import {
  BotBody,
  BotColorId,
  BotEye,
  BotIdentity,
  BotSpore,
  BotCreationShapeDefinition,
  BotCreationShapeId,
  BotStarterPreset,
  BotStarterPresetId,
  BotSkillLoadoutOption,
  BrowserLinkState,
  PremadeSkillPartOption,
  SkillCategory,
  SkillId,
  SkillSlot,
  SporeRaceDefinition,
  createLocalId
} from "./bot.js";

export interface PageContentBlock {
  type: "heading" | "paragraph" | "list" | "quote";
  text: string;
}

export interface PageContext {
  url: string;
  title: string;
  selectedText?: string;
  bodyText?: string;
  readableBlocks?: PageContentBlock[];
  capturedAt: string;
}

export interface ExplainPageRequest {
  type: "explain-page";
  requestId: string;
  pairingToken: string;
  bot: BotIdentity;
  page: PageContext;
  createdAt: string;
}

export interface ExplainPageResult {
  type: "explain-page-result";
  requestId: string;
  summary: string;
  keyPoints: string[];
  usefulActions: string[];
  warnings: string[];
  source: {
    url: string;
    title: string;
  };
  model: string;
  createdAt: string;
}

export interface ExplainPageError {
  type: "explain-page-error";
  requestId?: string;
  code: "missing_config" | "empty_page" | "provider_error" | "unauthorized" | "bad_request";
  message: string;
}

export interface ArticleXrayRequest {
  type: "article-xray";
  requestId: string;
  pairingToken: string;
  bot: BotIdentity;
  page: PageContext;
  createdAt: string;
}

export interface ArticleXrayResult {
  type: "article-xray-result";
  requestId: string;
  source: {
    url: string;
    title: string;
  };
  textSource: "selection" | "readable-blocks" | "body";
  quality: "clean" | "thin" | "noisy";
  headline: string;
  excerpt: string;
  cleanText: string;
  blocks: PageContentBlock[];
  stats: {
    inputCharacters: number;
    outputCharacters: number;
    wordCount: number;
    paragraphCount: number;
    headingCount: number;
    coverageRatio: number;
  };
  warnings: string[];
  createdAt: string;
}

export interface ArticleXrayError {
  type: "article-xray-error";
  requestId?: string;
  code: "empty_page" | "unauthorized" | "bad_request";
  message: string;
}

export interface RepoReaderRequest {
  type: "repo-reader";
  requestId: string;
  repoUrl: string;
  bot: BotIdentity;
  createdAt: string;
}

export interface RepoReaderStructureItem {
  path: string;
  kind: "file" | "directory";
  signal: string;
}

export type RepoProjectSurface =
  | "desktop-exe"
  | "browser-extension"
  | "web-app"
  | "local-service"
  | "cli"
  | "library"
  | "monorepo"
  | "docs"
  | "unknown";

export type RepoPlaygroundKind =
  | "superior-browser"
  | "extension-lab"
  | "service-loop"
  | "desktop-bench"
  | "terminal-cage"
  | "package-shelf"
  | "docs-table"
  | "repo-map";

export type RepoPermissionProfile =
  | "read-repo"
  | "local-files"
  | "terminal"
  | "browser-control"
  | "extension-control"
  | "service-control";

export interface RepoReaderEnvironmentStep {
  label: string;
  command?: string;
  note: string;
}

export interface RepoReaderSurfaceSignal {
  surface: RepoProjectSurface;
  path: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export interface RepoReaderPlayground {
  kind: RepoPlaygroundKind;
  label: string;
  robotRole: string;
  permissions: RepoPermissionProfile[];
  primaryLoop: string[];
  launchTargets: string[];
  checks: RepoReaderEnvironmentStep[];
  notes: string[];
}

export interface RepoReaderResult {
  type: "repo-reader-result";
  requestId: string;
  source: {
    url: string;
    title: string;
  };
  repository: {
    owner: string;
    name: string;
    defaultBranch: string;
    description: string;
    primaryLanguage: string;
    stars: number;
    forks: number;
    license: string;
    updatedAt: string;
  };
  presentation: {
    primary: RepoProjectSurface;
    surfaces: RepoProjectSurface[];
    signals: string[];
    surfaceMap: RepoReaderSurfaceSignal[];
  };
  environment: {
    mode: "learn" | "spin-up" | "both";
    summary: string;
    steps: RepoReaderEnvironmentStep[];
  };
  playground: RepoReaderPlayground;
  summary: string;
  stack: string[];
  entrypoints: string[];
  structure: RepoReaderStructureItem[];
  risks: string[];
  nextMoves: string[];
  playLoop: string[];
  createdAt: string;
}

export interface RepoWorkspaceRecord {
  type: "repo-workspace-record";
  id: string;
  source: RepoReaderResult["source"];
  repository: RepoReaderResult["repository"];
  presentation: RepoReaderResult["presentation"];
  environment: RepoReaderResult["environment"];
  playground: RepoReaderResult["playground"];
  stack: string[];
  risks: string[];
  nextMoves: string[];
  localPath?: string;
  profilePath?: string;
  lastBrowserSessionId?: string;
  lastBrowserEventSummary?: string;
  lastBrowserInspection?: SuperiorBrowserInspection;
  nextMove?: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RepoWorkspaceRecordsResponse {
  type: "repo-workspace-records";
  items: RepoWorkspaceRecord[];
  createdAt: string;
}

export type SuperiorBrowserSessionMode = "superior-browser" | "extension-lab" | "repo-map";
export type SuperiorBrowserKind = "chrome" | "edge";
export type SuperiorBrowserStatus = "closed" | "starting" | "ready" | "paired" | "missing-browser" | "failed";
export type SuperiorBrowserInspectionStatus = "ready" | "unavailable" | "failed";

export interface SuperiorBrowserInspection {
  type: "superior-browser-inspection";
  status: SuperiorBrowserInspectionStatus;
  inspectedAt: string;
  extensionPaired: boolean;
  browserKind?: SuperiorBrowserKind;
  currentUrl?: string;
  pageTitle?: string;
  tabId?: string;
  consoleErrorCount: number;
  networkFailureCount: number;
  note?: string;
}

export interface SuperiorBrowserSession {
  sessionId: string;
  repoWorkspaceId: string;
  repoTitle: string;
  mode: SuperiorBrowserSessionMode;
  status: SuperiorBrowserStatus;
  browserKind?: SuperiorBrowserKind;
  browserPath?: string;
  profilePath: string;
  debugPort?: number;
  processId?: number;
  homeUrl: string;
  repoUrl: string;
  playpenLabel: string;
  startedAt: string;
  pairedAt?: string;
  inspection?: SuperiorBrowserInspection;
  error?: string;
}

export interface SuperiorBrowserState {
  type: "superior-browser-state";
  status: SuperiorBrowserStatus;
  activeSession?: SuperiorBrowserSession;
  createdAt: string;
}

export type SuperiorBrowserEventKind =
  | "started"
  | "home_loaded"
  | "extension_paired"
  | "repo_opened"
  | "page_inspected"
  | "skill_ran"
  | "stopped"
  | "failed";

export interface SuperiorBrowserEvent {
  type: "superior-browser-event";
  id: string;
  sessionId: string;
  repoWorkspaceId: string;
  kind: SuperiorBrowserEventKind;
  label: string;
  detail?: string;
  createdAt: string;
}

export interface SuperiorBrowserEventsResponse {
  type: "superior-browser-events";
  sessionId?: string;
  items: SuperiorBrowserEvent[];
  createdAt: string;
}

export interface SuperiorBrowserStartRequest {
  type: "superior-browser-start";
  requestId: string;
  repoWorkspaceId: string;
  bot: BotIdentity;
  createdAt: string;
}

export interface SuperiorBrowserStartResult {
  type: "superior-browser-start-result";
  requestId: string;
  state: SuperiorBrowserState;
  createdAt: string;
}

export interface SuperiorBrowserStopResult {
  type: "superior-browser-stop-result";
  state: SuperiorBrowserState;
  createdAt: string;
}

export interface SuperiorBrowserInspectResult {
  type: "superior-browser-inspect-result";
  state: SuperiorBrowserState;
  inspection: SuperiorBrowserInspection;
  createdAt: string;
}

export interface SuperiorBrowserAttachRequest {
  type: "superior-browser-attach";
  requestId: string;
  sessionToken: string;
  extensionId?: string;
  createdAt: string;
}

export interface SuperiorBrowserAttachResult {
  type: "superior-browser-attach-result";
  requestId: string;
  pairingToken: string;
  bot: BotIdentity;
  browserLinkState: {
    status: "paired";
    extensionId?: string;
    lastSeenAt: string;
  };
  createdAt: string;
}

export interface SuperiorBrowserActivePageReport {
  type: "superior-browser-active-page";
  requestId: string;
  pairingToken: string;
  page: {
    url: string;
    title: string;
    tabId?: number;
    windowId?: number;
    capturedAt: string;
  };
  createdAt: string;
}

export interface SuperiorBrowserActivePageResult {
  type: "superior-browser-active-page-result";
  inspection: SuperiorBrowserInspection;
  state: SuperiorBrowserState;
  createdAt: string;
}

export interface SuperiorBrowserError {
  type: "superior-browser-error";
  requestId?: string;
  code:
    | "bad_request"
    | "unknown_repo"
    | "missing_browser"
    | "missing_extension"
    | "launch_failed"
    | "not_running"
    | "unauthorized";
  message: string;
}

export interface RepoReaderError {
  type: "repo-reader-error";
  requestId?: string;
  code: "bad_request" | "not_found" | "rate_limited" | "network_error";
  message: string;
}

export interface RecentSkillResult {
  type: "recent-skill-result";
  id: string;
  requestId: string;
  skillId: SkillId;
  skillLabel: string;
  source: {
    url: string;
    title: string;
  };
  summary: string;
  detail: string;
  status: "ready" | "warning";
  createdAt: string;
}

export interface RecentSkillResultsResponse {
  type: "recent-skill-results";
  items: RecentSkillResult[];
  createdAt: string;
}

export interface DaemonHealth {
  service: "superior-daemon";
  status: "ready" | "missing_config" | "error";
  version: string;
  openaiConfigured: boolean;
  localConfig: {
    stateDirectory: string;
    keyFilePath: string;
    keyFilePresent: boolean;
    openaiConfigSource: "environment" | "env-file" | "missing";
  };
  browserLinkState: {
    status: "unpaired" | "pairing" | "paired" | "offline";
    lastSeenAt?: string;
  };
}

export type BotCreationStep =
  | "account"
  | "daemon"
  | "key"
  | "model"
  | "browser"
  | "starter"
  | "shape"
  | "skills"
  | "assembly"
  | "finish";
export type BotCreationStepStatus = "ready" | "missing" | "blocked";
export type SuperiorAccountStatus = "signed-out" | "code-sent" | "signed-in" | "offline";
export type SuperiorModelProvider = "ollama" | "openai-byok" | "missing";
export type SuperiorOllamaStatus = "available" | "missing" | "starting" | "failed";
export type SuperiorOpenAiKeyStatus = "missing" | "saved" | "ready" | "invalid";
export const superiorAccountOAuthProviders = ["google", "x"] as const;
export type SuperiorAccountOAuthProvider = (typeof superiorAccountOAuthProviders)[number];
export type SuperiorAccountProviderStatus = "available" | "not-configured" | "connected";

export interface BotCreationDraft {
  type: "bot-creation-draft";
  step: BotCreationStep;
  shapeId?: BotCreationShapeId;
  starterPresetId?: BotStarterPresetId;
  name: string;
  body: BotBody;
  color: BotColorId;
  eye: BotEye;
  skills: SkillId[];
  updatedAt: string;
}

export interface BotStarterPresetsResponse {
  type: "bot-starter-presets";
  items: BotStarterPreset[];
  createdAt: string;
}

export interface BotCreationOptionsResponse {
  type: "bot-creation-options";
  shapes: BotCreationShapeDefinition[];
  races: SporeRaceDefinition[];
  skills: BotSkillLoadoutOption[];
  premadeSkillParts: PremadeSkillPartOption[];
  createdAt: string;
}

export interface SuperiorSetupStepState {
  step: BotCreationStep;
  status: BotCreationStepStatus;
  label: "Account" | "Power" | "Key" | "Model" | "Browser" | "Starter" | "Shape" | "Skills" | "Build" | "Save";
  detail: string;
}

export interface SuperiorAccountState {
  status: SuperiorAccountStatus;
  handle?: string;
  email?: string;
  userId?: string;
  connectedProviders?: SuperiorAccountOAuthProvider[];
  providers?: SuperiorAccountProviderState[];
  syncedAt?: string;
  detail: string;
}

export interface SuperiorAccountProviderState {
  provider: SuperiorAccountOAuthProvider;
  label: "Google" | "X";
  status: SuperiorAccountProviderStatus;
  detail: string;
}

export interface SuperiorModelProviderState {
  type: "superior-model-provider-state";
  modelProvider: SuperiorModelProvider;
  ollamaStatus: SuperiorOllamaStatus;
  openAiKeyStatus: SuperiorOpenAiKeyStatus;
  selectedAt?: string;
  detail: string;
  createdAt: string;
}

export interface SuperiorSetupState {
  type: "superior-setup-state";
  activeBotSaved: boolean;
  requiresSetup: boolean;
  steps: SuperiorSetupStepState[];
  account: SuperiorAccountState;
  daemon: {
    status: "ready";
    detail: string;
  };
  key: {
    status: "ready" | "missing";
    keyFilePath: string;
    source: DaemonHealth["localConfig"]["openaiConfigSource"];
  };
  browser: {
    status: BrowserLinkState["status"];
    extensionId?: string;
    lastSeenAt?: string;
  };
  model: SuperiorModelProviderState;
  bot: {
    status: "saved" | "starter-seed" | "custom";
    identity: BotIdentity;
    starterPresetId?: BotStarterPresetId;
  };
  createdAt: string;
}

export interface SuperiorModelProviderSelectRequest {
  type: "superior-model-provider-select";
  provider: Exclude<SuperiorModelProvider, "missing">;
}

export interface SuperiorOpenAiKeySaveRequest {
  type: "superior-openai-key-save";
  apiKey: string;
  model?: string;
}

export interface SuperiorModelProviderError {
  type: "superior-model-provider-error";
  code: "bad_request" | "not_found" | "start_failed";
  message: string;
}

export interface SuperiorAccountStartEmailCodeRequest {
  type: "superior-account-start-email-code";
  email: string;
}

export interface SuperiorAccountStartEmailCodeResult {
  type: "superior-account-code-sent";
  email: string;
  createdAt: string;
}

export interface SuperiorAccountVerifyEmailCodeRequest {
  type: "superior-account-verify-email-code";
  email: string;
  token: string;
}

export interface SuperiorAccountStartOAuthRequest {
  type: "superior-account-start-oauth";
  provider: SuperiorAccountOAuthProvider;
  redirectTo?: string;
}

export interface SuperiorAccountOAuthStartResult {
  type: "superior-account-oauth-started";
  provider: SuperiorAccountOAuthProvider;
  authUrl: string;
  redirectTo?: string;
  createdAt: string;
}

export interface SuperiorAccountSession {
  type: "superior-account-session";
  userId: string;
  email: string;
  provider?: "email-code" | SuperiorAccountOAuthProvider;
  accessToken: string;
  expiresAt?: number;
  createdAt: string;
}

export interface SuperiorAccountProfile {
  type: "superior-account-profile";
  userId: string;
  email?: string;
  handle: string;
  connectedProviders?: SuperiorAccountOAuthProvider[];
  activeSporeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuperiorAccountConnection {
  type: "superior-account-connection";
  userId: string;
  provider: SuperiorAccountOAuthProvider;
  providerUserId?: string;
  connectedAt: string;
}

export interface SuperiorAccountSpore {
  type: "superior-account-spore";
  userId: string;
  spore: BotSpore;
  starterPresetId?: BotStarterPresetId;
  createdAt: string;
  updatedAt: string;
}

export interface BrowserPairingStartResult {
  type: "browser-pairing-started";
  pairingToken: string;
  browserLinkState: {
    status: "pairing";
  };
  createdAt: string;
}

export interface BrowserPairingCompleteRequest {
  type: "browser-pairing-complete";
  requestId: string;
  pairingToken: string;
  extensionId?: string;
  createdAt: string;
}

export interface BrowserPairingCompleteResult {
  type: "browser-pairing-complete-result";
  requestId: string;
  browserLinkState: {
    status: "paired";
    extensionId?: string;
    lastSeenAt: string;
  };
  createdAt: string;
}

export interface BrowserPairingResetResult {
  type: "browser-pairing-reset-result";
  browserLinkState: {
    status: "unpaired";
  };
  createdAt: string;
}

export interface BrowserPairingError {
  type: "browser-pairing-error";
  requestId?: string;
  code: "bad_request" | "unauthorized";
  message: string;
}

export type CustomSkillImportLanguage = "javascript" | "typescript" | "mixed-js-ts";

export interface CustomSkillScript {
  name: string;
  command: string;
}

export interface CustomSkillFileSignal {
  path: string;
  kind: "package-json" | "tsconfig" | "source" | "script" | "test" | "config";
  language?: CustomSkillImportLanguage;
}

export interface CustomSkillImportRequest {
  type: "custom-skill-import";
  requestId: string;
  folderPath: string;
  createdAt: string;
}

export interface CustomSkillImportProposal {
  type: "custom-skill-import-proposal";
  requestId: string;
  sourceFolder: string;
  projectName: string;
  packageName?: string;
  language: CustomSkillImportLanguage;
  suggestedSkill: {
    id: string;
    label: string;
    slot: SkillSlot;
    category: SkillCategory;
    attachment: string;
    effect: string;
  };
  scripts: CustomSkillScript[];
  entrypoints: string[];
  fileSignals: CustomSkillFileSignal[];
  warnings: string[];
  nextSteps: string[];
  createdAt: string;
}

export interface CustomSkillImportError {
  type: "custom-skill-import-error";
  requestId?: string;
  code: "bad_request" | "not_found" | "unsupported_folder" | "scan_failed" | "unauthorized";
  message: string;
}

export const superiorFunctionIds = [
  "page-explainer",
  "article-xray",
  "repo-reader",
  "superior-browser-start",
  "superior-browser-stop",
  "custom-skill-import-proposal"
] as const;

export type SuperiorFunctionId = (typeof superiorFunctionIds)[number];
export type SuperiorFunctionRunnerKind = "local" | "model" | "browser" | "repo" | "proposal";
export type SuperiorFunctionSurface = "workshop" | "extension" | "browser-runtime";
export type SuperiorFunctionStatus = "runnable" | "proposal";
export type SuperiorFunctionPermission =
  | "browser-pairing"
  | "browser-runtime"
  | "local-files"
  | "model-provider"
  | "repo-network";
export type SuperiorFunctionRunStatus = "completed" | "failed";
export type SuperiorFunctionRunEventKind =
  | "queued"
  | "validated"
  | "running"
  | "model_called"
  | "browser_context_received"
  | "result_saved"
  | "failed";
export type SuperiorFunctionErrorCode =
  | "unknown_function"
  | "bad_request"
  | "missing_permission"
  | "missing_config"
  | "unauthorized"
  | "empty_input"
  | "not_found"
  | "unknown_repo"
  | "rate_limited"
  | "missing_browser"
  | "missing_extension"
  | "launch_failed"
  | "not_running"
  | "runner_failed";

export interface SuperiorBotReaction {
  type: "superior-bot-reaction";
  state: "running" | "success" | "failure";
  pulseKey: string;
  label: string;
  detail?: string;
  skillId?: SkillId;
  slot?: SkillSlot;
  createdAt: string;
}

export interface SuperiorFunctionDefinition {
  type: "superior-function-definition";
  id: SuperiorFunctionId;
  label: string;
  shortLabel: string;
  status: SuperiorFunctionStatus;
  runnerKind: SuperiorFunctionRunnerKind;
  surfaces: SuperiorFunctionSurface[];
  permissions: SuperiorFunctionPermission[];
  skillId?: SkillId;
  slot?: SkillSlot;
  category?: SkillCategory;
  attachment: string;
  effect: string;
}

export interface SuperiorFunctionCatalogResponse {
  type: "superior-function-catalog";
  items: SuperiorFunctionDefinition[];
  createdAt: string;
}

export interface SuperiorFunctionRunRequest {
  type: "superior-function-run";
  requestId: string;
  functionId: SuperiorFunctionId;
  input: unknown;
  bot?: BotIdentity;
  createdAt: string;
}

export interface SuperiorFunctionRunEvent {
  type: "superior-function-run-event";
  id: string;
  runId: string;
  requestId: string;
  functionId: SuperiorFunctionId;
  kind: SuperiorFunctionRunEventKind;
  label: string;
  detail?: string;
  createdAt: string;
}

export interface SuperiorFunctionRunResult {
  type: "superior-function-run-result";
  requestId: string;
  runId: string;
  functionId: SuperiorFunctionId;
  status: "completed";
  result: unknown;
  events: SuperiorFunctionRunEvent[];
  botReaction: SuperiorBotReaction;
  createdAt: string;
}

export interface SuperiorFunctionError {
  type: "superior-function-error";
  requestId?: string;
  runId?: string;
  functionId?: SuperiorFunctionId;
  code: SuperiorFunctionErrorCode;
  message: string;
  events?: SuperiorFunctionRunEvent[];
  botReaction?: SuperiorBotReaction;
  createdAt: string;
}

export interface SuperiorFunctionRunSummary {
  type: "superior-function-run-summary";
  runId: string;
  requestId: string;
  functionId: SuperiorFunctionId;
  label: string;
  status: SuperiorFunctionRunStatus;
  summary: string;
  botReaction: SuperiorBotReaction;
  createdAt: string;
}

export interface SuperiorFunctionRunsResponse {
  type: "superior-function-runs";
  items: SuperiorFunctionRunSummary[];
  createdAt: string;
}

export interface SuperiorFunctionRunEventsResponse {
  type: "superior-function-run-events";
  runId: string;
  items: SuperiorFunctionRunEvent[];
  createdAt: string;
}

export function createSuperiorFunctionRunRequest(input: {
  functionId: SuperiorFunctionId;
  input: unknown;
  bot?: BotIdentity;
}): SuperiorFunctionRunRequest {
  return {
    type: "superior-function-run",
    requestId: createLocalId("function"),
    functionId: input.functionId,
    input: input.input,
    ...(input.bot ? { bot: input.bot } : {}),
    createdAt: new Date().toISOString()
  };
}

export function createExplainPageRequest(input: {
  pairingToken: string;
  bot: BotIdentity;
  page: PageContext;
}): ExplainPageRequest {
  return {
    type: "explain-page",
    requestId: createLocalId("explain"),
    pairingToken: input.pairingToken,
    bot: input.bot,
    page: input.page,
    createdAt: new Date().toISOString()
  };
}

export function createArticleXrayRequest(input: {
  pairingToken: string;
  bot: BotIdentity;
  page: PageContext;
}): ArticleXrayRequest {
  return {
    type: "article-xray",
    requestId: createLocalId("xray"),
    pairingToken: input.pairingToken,
    bot: input.bot,
    page: input.page,
    createdAt: new Date().toISOString()
  };
}

export function createRepoReaderRequest(input: { repoUrl: string; bot: BotIdentity }): RepoReaderRequest {
  return {
    type: "repo-reader",
    requestId: createLocalId("repo"),
    repoUrl: input.repoUrl,
    bot: input.bot,
    createdAt: new Date().toISOString()
  };
}

export function createSuperiorBrowserStartRequest(input: {
  repoWorkspaceId: string;
  bot: BotIdentity;
}): SuperiorBrowserStartRequest {
  return {
    type: "superior-browser-start",
    requestId: createLocalId("browser"),
    repoWorkspaceId: input.repoWorkspaceId,
    bot: input.bot,
    createdAt: new Date().toISOString()
  };
}

export function createSuperiorBrowserAttachRequest(input: {
  sessionToken: string;
  extensionId?: string;
}): SuperiorBrowserAttachRequest {
  return {
    type: "superior-browser-attach",
    requestId: createLocalId("browser_attach"),
    sessionToken: input.sessionToken,
    ...(input.extensionId ? { extensionId: input.extensionId } : {}),
    createdAt: new Date().toISOString()
  };
}

export function createSuperiorBrowserActivePageReport(input: {
  pairingToken: string;
  page: SuperiorBrowserActivePageReport["page"];
}): SuperiorBrowserActivePageReport {
  return {
    type: "superior-browser-active-page",
    requestId: createLocalId("browser_page"),
    pairingToken: input.pairingToken,
    page: input.page,
    createdAt: new Date().toISOString()
  };
}

export function createCustomSkillImportRequest(input: { folderPath: string }): CustomSkillImportRequest {
  return {
    type: "custom-skill-import",
    requestId: createLocalId("skill_import"),
    folderPath: input.folderPath,
    createdAt: new Date().toISOString()
  };
}

export function createBrowserPairingCompleteRequest(input: {
  pairingToken: string;
  extensionId?: string;
}): BrowserPairingCompleteRequest {
  return {
    type: "browser-pairing-complete",
    requestId: createLocalId("browser_pair"),
    pairingToken: input.pairingToken,
    ...(input.extensionId ? { extensionId: input.extensionId } : {}),
    createdAt: new Date().toISOString()
  };
}

export function getPageText(page: PageContext): string {
  return (page.selectedText || page.bodyText || "").trim();
}

export function hasUsablePageText(page: PageContext): boolean {
  return getPageText(page).length > 0;
}

export function truncatePageText(text: string, maxCharacters = 16000): string {
  const trimmed = text.trim();

  if (trimmed.length <= maxCharacters) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxCharacters)}\n\n[Content truncated by SUPERIOR.]`;
}
