using System.Text.Json.Serialization;

namespace Superior.Windows.Models;

public sealed record DaemonHealth(
    [property: JsonPropertyName("service")] string Service,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("openaiConfigured")] bool OpenAiConfigured,
    [property: JsonPropertyName("localConfig")] DaemonLocalConfig? LocalConfig,
    [property: JsonPropertyName("browserLinkState")] BrowserLinkState? BrowserLinkState);

public sealed record DaemonLocalConfig(
    [property: JsonPropertyName("stateDirectory")] string StateDirectory,
    [property: JsonPropertyName("keyFilePath")] string KeyFilePath,
    [property: JsonPropertyName("keyFilePresent")] bool KeyFilePresent,
    [property: JsonPropertyName("openaiConfigSource")] string OpenAiConfigSource);

public sealed record BrowserLinkState(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("extensionId")] string? ExtensionId,
    [property: JsonPropertyName("lastSeenAt")] string? LastSeenAt);

public sealed record BotIdentity(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("body")] string Body,
    [property: JsonPropertyName("color")] string Color,
    [property: JsonPropertyName("eye")] string Eye,
    [property: JsonPropertyName("skills")] IReadOnlyList<string> Skills,
    [property: JsonPropertyName("starterPresetId")] string? StarterPresetId = null,
    [property: JsonPropertyName("createdAt")] string? CreatedAt = null,
    [property: JsonPropertyName("updatedAt")] string? UpdatedAt = null);

public sealed record BotStarterPresetsResponse(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("items")] IReadOnlyList<BotStarterPreset> Items,
    [property: JsonPropertyName("createdAt")] string CreatedAt);

public sealed record BotStarterPreset(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("body")] string Body,
    [property: JsonPropertyName("color")] string Color,
    [property: JsonPropertyName("eye")] string Eye,
    [property: JsonPropertyName("skills")] IReadOnlyList<string> Skills);

public sealed record BotCreationOptionsResponse(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("shapes")] IReadOnlyList<BotCreationShape> Shapes,
    [property: JsonPropertyName("skills")] IReadOnlyList<BotSkillLoadoutOption> Skills,
    [property: JsonPropertyName("createdAt")] string CreatedAt);

public sealed record BotCreationShape(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("body")] string Body,
    [property: JsonPropertyName("defaultColor")] string DefaultColor,
    [property: JsonPropertyName("defaultEye")] string DefaultEye,
    [property: JsonPropertyName("starterPresetId")] string StarterPresetId,
    [property: JsonPropertyName("starterName")] string StarterName,
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("benchPrompt")] string BenchPrompt);

public sealed record BotSkillLoadoutOption(
    [property: JsonPropertyName("skillId")] string SkillId,
    [property: JsonPropertyName("slot")] string Slot,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("effect")] string Effect,
    [property: JsonPropertyName("attachment")] string Attachment);

public sealed record SuperiorSetupState(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("activeBotSaved")] bool ActiveBotSaved,
    [property: JsonPropertyName("requiresSetup")] bool RequiresSetup,
    [property: JsonPropertyName("steps")] IReadOnlyList<SuperiorSetupStepState> Steps,
    [property: JsonPropertyName("daemon")] SuperiorSetupDaemonState Daemon,
    [property: JsonPropertyName("key")] SuperiorSetupKeyState Key,
    [property: JsonPropertyName("browser")] SuperiorSetupBrowserState Browser,
    [property: JsonPropertyName("bot")] SuperiorSetupBotState Bot,
    [property: JsonPropertyName("createdAt")] string CreatedAt);

public sealed record SuperiorSetupStepState(
    [property: JsonPropertyName("step")] string Step,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("detail")] string Detail);

public sealed record SuperiorSetupDaemonState(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("detail")] string Detail);

public sealed record SuperiorSetupKeyState(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("keyFilePath")] string KeyFilePath,
    [property: JsonPropertyName("source")] string Source);

public sealed record SuperiorSetupBrowserState(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("extensionId")] string? ExtensionId,
    [property: JsonPropertyName("lastSeenAt")] string? LastSeenAt);

public sealed record SuperiorSetupBotState(
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("identity")] BotIdentity Identity,
    [property: JsonPropertyName("starterPresetId")] string? StarterPresetId);

public sealed record FunctionCatalogResponse(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("items")] IReadOnlyList<FunctionDefinition> Items);

public sealed record FunctionDefinition(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("shortLabel")] string ShortLabel,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("runnerKind")] string RunnerKind);

public sealed record FunctionRunsResponse(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("items")] IReadOnlyList<FunctionRunSummary> Items);

public sealed record FunctionRunSummary(
    [property: JsonPropertyName("functionId")] string FunctionId,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("botReaction")] BotReaction? BotReaction);

public sealed record BotReaction(
    [property: JsonPropertyName("state")] string State,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("slot")] string? Slot);

public sealed record BrowserPairingStarted(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("pairingToken")] string PairingToken,
    [property: JsonPropertyName("browserLinkState")] BrowserLinkState? BrowserLinkState);

public sealed record DaemonLaunchState(string Status, string Detail, string RuntimeStatus = "dev");

public sealed record WindowsServiceStatus(string Status, string Detail);

public sealed record WindowsServiceCommandResult(string Status, string Detail, int ExitCode, string Output);

public sealed record RepoReaderResult(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("requestId")] string RequestId,
    [property: JsonPropertyName("source")] RepoWorkspaceSource Source,
    [property: JsonPropertyName("repository")] RepoReaderRepository Repository,
    [property: JsonPropertyName("presentation")] RepoReaderPresentation Presentation,
    [property: JsonPropertyName("environment")] RepoReaderEnvironment Environment,
    [property: JsonPropertyName("playground")] RepoWorkspacePlayground Playground,
    [property: JsonPropertyName("summary")] string Summary,
    [property: JsonPropertyName("stack")] IReadOnlyList<string> Stack,
    [property: JsonPropertyName("entrypoints")] IReadOnlyList<string> Entrypoints,
    [property: JsonPropertyName("risks")] IReadOnlyList<string> Risks,
    [property: JsonPropertyName("nextMoves")] IReadOnlyList<string> NextMoves,
    [property: JsonPropertyName("createdAt")] string CreatedAt);

public sealed record RepoReaderRepository(
    [property: JsonPropertyName("owner")] string Owner,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("defaultBranch")] string DefaultBranch,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("primaryLanguage")] string PrimaryLanguage,
    [property: JsonPropertyName("stars")] int Stars,
    [property: JsonPropertyName("forks")] int Forks,
    [property: JsonPropertyName("license")] string License,
    [property: JsonPropertyName("updatedAt")] string UpdatedAt);

public sealed record RepoReaderPresentation(
    [property: JsonPropertyName("primary")] string Primary,
    [property: JsonPropertyName("surfaces")] IReadOnlyList<string> Surfaces,
    [property: JsonPropertyName("signals")] IReadOnlyList<string> Signals);

public sealed record RepoReaderEnvironment(
    [property: JsonPropertyName("mode")] string Mode,
    [property: JsonPropertyName("summary")] string Summary);

public sealed record RepoReaderError(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("requestId")] string? RequestId,
    [property: JsonPropertyName("code")] string Code,
    [property: JsonPropertyName("message")] string Message);

public sealed record RepoWorkspaceRecordsResponse(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("items")] IReadOnlyList<RepoWorkspaceRecord> Items,
    [property: JsonPropertyName("createdAt")] string CreatedAt);

public sealed record RepoWorkspaceRecord(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("source")] RepoWorkspaceSource Source,
    [property: JsonPropertyName("repository")] RepoWorkspaceRepository Repository,
    [property: JsonPropertyName("presentation")] RepoWorkspacePresentation Presentation,
    [property: JsonPropertyName("playground")] RepoWorkspacePlayground Playground,
    [property: JsonPropertyName("profilePath")] string? ProfilePath,
    [property: JsonPropertyName("lastBrowserSessionId")] string? LastBrowserSessionId,
    [property: JsonPropertyName("lastBrowserEventSummary")] string? LastBrowserEventSummary,
    [property: JsonPropertyName("nextMove")] string? NextMove,
    [property: JsonPropertyName("updatedAt")] string UpdatedAt);

public sealed record RepoWorkspaceSource(
    [property: JsonPropertyName("url")] string Url,
    [property: JsonPropertyName("title")] string Title);

public sealed record RepoWorkspaceRepository(
    [property: JsonPropertyName("owner")] string Owner,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("primaryLanguage")] string PrimaryLanguage);

public sealed record RepoWorkspacePresentation(
    [property: JsonPropertyName("primary")] string Primary);

public sealed record RepoWorkspacePlayground(
    [property: JsonPropertyName("kind")] string Kind,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("robotRole")] string RobotRole);

public sealed record SuperiorBrowserState(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("activeSession")] SuperiorBrowserSession? ActiveSession,
    [property: JsonPropertyName("createdAt")] string CreatedAt);

public sealed record SuperiorBrowserSession(
    [property: JsonPropertyName("sessionId")] string SessionId,
    [property: JsonPropertyName("repoWorkspaceId")] string RepoWorkspaceId,
    [property: JsonPropertyName("repoTitle")] string RepoTitle,
    [property: JsonPropertyName("mode")] string Mode,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("browserKind")] string? BrowserKind,
    [property: JsonPropertyName("profilePath")] string ProfilePath,
    [property: JsonPropertyName("homeUrl")] string HomeUrl,
    [property: JsonPropertyName("repoUrl")] string RepoUrl,
    [property: JsonPropertyName("playpenLabel")] string PlaypenLabel,
    [property: JsonPropertyName("startedAt")] string StartedAt,
    [property: JsonPropertyName("pairedAt")] string? PairedAt,
    [property: JsonPropertyName("inspection")] SuperiorBrowserInspection? Inspection,
    [property: JsonPropertyName("error")] string? Error);

public sealed record SuperiorBrowserInspection(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("extensionPaired")] bool ExtensionPaired,
    [property: JsonPropertyName("browserKind")] string? BrowserKind,
    [property: JsonPropertyName("currentUrl")] string? CurrentUrl,
    [property: JsonPropertyName("pageTitle")] string? PageTitle,
    [property: JsonPropertyName("consoleErrorCount")] int ConsoleErrorCount,
    [property: JsonPropertyName("networkFailureCount")] int NetworkFailureCount,
    [property: JsonPropertyName("note")] string? Note);

public sealed record SuperiorBrowserStartResult(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("requestId")] string RequestId,
    [property: JsonPropertyName("state")] SuperiorBrowserState State,
    [property: JsonPropertyName("createdAt")] string CreatedAt);

public sealed record SuperiorBrowserStopResult(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("state")] SuperiorBrowserState State,
    [property: JsonPropertyName("createdAt")] string CreatedAt);

public sealed record SuperiorBrowserEventsResponse(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("sessionId")] string? SessionId,
    [property: JsonPropertyName("items")] IReadOnlyList<SuperiorBrowserEvent> Items,
    [property: JsonPropertyName("createdAt")] string CreatedAt);

public sealed record SuperiorBrowserEvent(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("sessionId")] string SessionId,
    [property: JsonPropertyName("repoWorkspaceId")] string RepoWorkspaceId,
    [property: JsonPropertyName("kind")] string Kind,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("detail")] string? Detail,
    [property: JsonPropertyName("createdAt")] string CreatedAt);
