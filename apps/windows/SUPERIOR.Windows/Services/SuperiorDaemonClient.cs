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

    private async Task<T> GetRequiredAsync<T>(string path)
    {
        var value = await httpClient.GetFromJsonAsync<T>(path, JsonOptions);

        return value ?? throw new InvalidOperationException($"{path} returned no payload.");
    }
}
