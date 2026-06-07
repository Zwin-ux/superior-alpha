using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using Superior.Windows.Models;

namespace Superior.Windows.Services;

public sealed class SuperiorDaemonClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly HttpClient httpClient;

    public SuperiorDaemonClient(Uri baseAddress)
    {
        httpClient = new HttpClient
        {
            BaseAddress = baseAddress,
            Timeout = TimeSpan.FromSeconds(4)
        };
    }

    public Task<DaemonHealth> GetHealthAsync()
    {
        return GetRequiredAsync<DaemonHealth>("health");
    }

    public Task<BotIdentity> GetBotIdentityAsync()
    {
        return GetRequiredAsync<BotIdentity>("bot-identity");
    }

    public Task<BotStarterPresetsResponse> GetBotPresetsAsync()
    {
        return GetRequiredAsync<BotStarterPresetsResponse>("bot-presets");
    }

    public Task<SuperiorSetupState> GetSetupStateAsync()
    {
        return GetRequiredAsync<SuperiorSetupState>("setup-state");
    }

    public Task<BotCreationOptionsResponse> GetBotCreationOptionsAsync()
    {
        return GetRequiredAsync<BotCreationOptionsResponse>("bot-creation-options");
    }

    public Task<FunctionCatalogResponse> GetFunctionCatalogAsync()
    {
        return GetRequiredAsync<FunctionCatalogResponse>("functions");
    }

    public Task<FunctionRunsResponse> GetRecentFunctionRunsAsync()
    {
        return GetRequiredAsync<FunctionRunsResponse>("function-runs/recent");
    }

    public Task<RepoWorkspaceRecordsResponse> GetRepoWorkspacesAsync()
    {
        return GetRequiredAsync<RepoWorkspaceRecordsResponse>("repo-workspaces");
    }

    public Task<SuperiorBrowserState> GetSuperiorBrowserStateAsync()
    {
        return GetRequiredAsync<SuperiorBrowserState>("browser-runtime");
    }

    public Task<SuperiorBrowserEventsResponse> GetSuperiorBrowserEventsAsync()
    {
        return GetRequiredAsync<SuperiorBrowserEventsResponse>("browser-runtime/events");
    }

    public Task<GameTargetsResponse> GetGameTargetsAsync()
    {
        return GetRequiredAsync<GameTargetsResponse>("game-targets");
    }

    public Task<GameRuntimeState> GetGameRuntimeStateAsync()
    {
        return GetRequiredAsync<GameRuntimeState>("game-runtime");
    }

    public Task<GameRuntimeEventsResponse> GetGameRuntimeEventsAsync()
    {
        return GetRequiredAsync<GameRuntimeEventsResponse>("game-runtime/events");
    }

    public Task<GameServerRoutesResponse> GetGameServerRoutesAsync()
    {
        return GetRequiredAsync<GameServerRoutesResponse>("game-server-routes");
    }

    public async Task<BrowserPairingStarted> StartPairingAsync()
    {
        using var response = await httpClient.PostAsync("browser-link/start", content: null);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<BrowserPairingStarted>(JsonOptions)
            ?? throw new InvalidOperationException("Browser pairing returned no payload.");
    }

    public async Task<BotIdentity> SaveBotIdentityAsync(BotIdentity bot)
    {
        using var response = await httpClient.PutAsJsonAsync("bot-identity", bot, JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<BotIdentity>(JsonOptions)
            ?? throw new InvalidOperationException("Bot identity save returned no payload.");
    }

    public async Task<RepoReaderResult> RunRepoReaderAsync(string repoUrl, BotIdentity bot)
    {
        var payload = new
        {
            type = "repo-reader",
            requestId = $"windows_repo_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            repoUrl,
            bot,
            createdAt = DateTimeOffset.UtcNow.ToString("O")
        };

        using var response = await httpClient.PostAsJsonAsync("skills/repo-reader", payload, JsonOptions);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadFromJsonAsync<RepoReaderError>(JsonOptions);
            throw new InvalidOperationException(error?.Message ?? $"Repo Reader failed with HTTP {(int)response.StatusCode}.");
        }

        return await response.Content.ReadFromJsonAsync<RepoReaderResult>(JsonOptions)
            ?? throw new InvalidOperationException("Repo Reader returned no payload.");
    }

    public async Task<SuperiorBrowserStartResult> StartSuperiorBrowserAsync(string repoWorkspaceId, BotIdentity bot)
    {
        var payload = new
        {
            type = "superior-browser-start",
            requestId = $"windows_browser_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            repoWorkspaceId,
            bot,
            createdAt = DateTimeOffset.UtcNow.ToString("O")
        };

        using var response = await httpClient.PostAsJsonAsync("browser-runtime/start", payload, JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<SuperiorBrowserStartResult>(JsonOptions)
            ?? throw new InvalidOperationException("SUPERIOR Browser start returned no payload.");
    }

    public async Task<SuperiorBrowserStopResult> StopSuperiorBrowserAsync()
    {
        using var response = await httpClient.PostAsync("browser-runtime/stop", content: null);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<SuperiorBrowserStopResult>(JsonOptions)
            ?? throw new InvalidOperationException("SUPERIOR Browser stop returned no payload.");
    }

    public async Task<GameTargetImportResult> ImportGameTargetAsync(string executablePath)
    {
        var payload = new
        {
            type = "game-target-import",
            requestId = $"windows_game_target_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            executablePath,
            createdAt = DateTimeOffset.UtcNow.ToString("O")
        };

        using var response = await httpClient.PostAsJsonAsync("game-targets/import", payload, JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<GameTargetImportResult>(JsonOptions)
            ?? throw new InvalidOperationException("Game target import returned no payload.");
    }

    public async Task<GameRuntimeStartResult> StartGameRuntimeAsync(string targetId, string goal)
    {
        var payload = new
        {
            type = "game-runtime-start",
            requestId = $"windows_game_start_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            targetId,
            goal,
            createdAt = DateTimeOffset.UtcNow.ToString("O")
        };

        using var response = await httpClient.PostAsJsonAsync("game-runtime/start", payload, JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<GameRuntimeStartResult>(JsonOptions)
            ?? throw new InvalidOperationException("Game Rig start returned no payload.");
    }

    public async Task<GameRuntimeStartResult> StartGameRuntimeAsync(string targetId, string goal, string? serverRouteId)
    {
        var payload = new
        {
            type = "game-runtime-start",
            requestId = $"windows_game_start_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            targetId,
            goal,
            serverRouteId,
            createdAt = DateTimeOffset.UtcNow.ToString("O")
        };

        using var response = await httpClient.PostAsJsonAsync("game-runtime/start", payload, JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<GameRuntimeStartResult>(JsonOptions)
            ?? throw new InvalidOperationException("Game Rig start returned no payload.");
    }

    public async Task<GameServerRouteSaveResult> SaveGameServerRouteAsync(string addressOrUrl, string label, string password, string playerName)
    {
        var payload = new
        {
            type = "game-server-route-save",
            requestId = $"windows_game_route_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            game = "gmod",
            label,
            addressOrUrl,
            password,
            playerName,
            createdAt = DateTimeOffset.UtcNow.ToString("O")
        };

        using var response = await httpClient.PostAsJsonAsync("game-server-routes/save", payload, JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<GameServerRouteSaveResult>(JsonOptions)
            ?? throw new InvalidOperationException("GMOD route save returned no payload.");
    }

    public async Task<GameRuntimeCommandResult> SetGameRuntimeGoalAsync(string goal)
    {
        var payload = new
        {
            type = "game-runtime-goal",
            requestId = $"windows_game_goal_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            goal,
            createdAt = DateTimeOffset.UtcNow.ToString("O")
        };

        using var response = await httpClient.PostAsJsonAsync("game-runtime/goal", payload, JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<GameRuntimeCommandResult>(JsonOptions)
            ?? throw new InvalidOperationException("Game Rig goal returned no payload.");
    }

    public async Task<GameRuntimeCommandResult> NudgeGameRuntimeAsync(string nudge)
    {
        var payload = new
        {
            type = "game-runtime-nudge",
            requestId = $"windows_game_nudge_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            nudge,
            createdAt = DateTimeOffset.UtcNow.ToString("O")
        };

        using var response = await httpClient.PostAsJsonAsync("game-runtime/nudge", payload, JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<GameRuntimeCommandResult>(JsonOptions)
            ?? throw new InvalidOperationException("Game Rig nudge returned no payload.");
    }

    public async Task<GameRuntimeCommandResult> PauseGameRuntimeAsync()
    {
        var payload = new
        {
            type = "game-runtime-pause",
            requestId = $"windows_game_pause_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            reason = "windows shell",
            createdAt = DateTimeOffset.UtcNow.ToString("O")
        };

        using var response = await httpClient.PostAsJsonAsync("game-runtime/pause", payload, JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<GameRuntimeCommandResult>(JsonOptions)
            ?? throw new InvalidOperationException("Game Rig pause returned no payload.");
    }

    public async Task<GameRuntimeCommandResult> ResumeGameRuntimeAsync()
    {
        var payload = new
        {
            type = "game-runtime-resume",
            requestId = $"windows_game_resume_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            createdAt = DateTimeOffset.UtcNow.ToString("O")
        };

        using var response = await httpClient.PostAsJsonAsync("game-runtime/resume", payload, JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<GameRuntimeCommandResult>(JsonOptions)
            ?? throw new InvalidOperationException("Game Rig resume returned no payload.");
    }

    public async Task<GameRuntimeCommandResult> StopGameRuntimeAsync()
    {
        var payload = new
        {
            type = "game-runtime-stop",
            requestId = $"windows_game_stop_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}",
            createdAt = DateTimeOffset.UtcNow.ToString("O")
        };

        using var response = await httpClient.PostAsJsonAsync("game-runtime/stop", payload, JsonOptions);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadFromJsonAsync<GameRuntimeCommandResult>(JsonOptions)
            ?? throw new InvalidOperationException("Game Rig stop returned no payload.");
    }

    private async Task<T> GetRequiredAsync<T>(string path)
    {
        var value = await httpClient.GetFromJsonAsync<T>(path, JsonOptions);

        return value ?? throw new InvalidOperationException($"{path} returned no payload.");
    }
}
