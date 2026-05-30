using System.Windows;
using System.Windows.Controls;
using Superior.Windows.Models;
using Superior.Windows.Services;

namespace Superior.Windows;

public partial class MainWindow : Window
{
    private readonly SuperiorDaemonClient daemonClient = new(new Uri("http://127.0.0.1:5317"));
    private readonly DaemonSupervisor daemonSupervisor;
    private readonly WindowsDaemonServiceController serviceController = new();
    private readonly OpenAiKeyStore openAiKeyStore = new();
    private BotIdentity? currentBot;
    private RepoWorkspaceRecord? currentRepoWorkspace;
    private SuperiorBrowserState? currentBrowserState;
    private RepoReaderResult? currentRepoReaderResult;
    private IReadOnlyList<BotStarterPreset> starterPresets = Array.Empty<BotStarterPreset>();
    private BotIdentity? setupDraftBot;

    public MainWindow()
    {
        InitializeComponent();
        daemonSupervisor = new DaemonSupervisor(daemonClient);
    }

    private async void OnLoaded(object sender, RoutedEventArgs e)
    {
        await RefreshWorkbenchAsync();
    }

    private async void OnRefreshClicked(object sender, RoutedEventArgs e)
    {
        await RefreshWorkbenchAsync();
    }

    private async void OnNewBotClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            SetupStepText.Text = "Power / Key / Browser / Pick";
            SetupDetailText.Text = "wake machine";
            await EnsureStarterPresetsAsync();
            StartSetupFromPreset("clawd");
        }
        catch (Exception error)
        {
            SetupStepText.Text = "failed";
            SetupDetailText.Text = error.Message;
        }
    }

    private async void OnPresetClicked(object sender, RoutedEventArgs e)
    {
        if (sender is not Button button || button.Tag is not string presetId)
        {
            return;
        }

        try
        {
            await EnsureStarterPresetsAsync();
            StartSetupFromPreset(presetId);
        }
        catch (Exception error)
        {
            SetupStepText.Text = "failed";
            SetupDetailText.Text = error.Message;
        }
    }

    private async void OnSaveBotClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            SetupStepText.Text = "Save";
            SetupDetailText.Text = "pressing clay";
            var draft = BuildSetupDraft();
            var saved = await daemonClient.SaveBotIdentityAsync(draft);
            setupDraftBot = null;
            currentBot = saved;
            ApplyBot(saved, reaction: null);
            ApplySetupDraft(saved);
            SetupStepText.Text = "saved";
            SetupDetailText.Text = $"{saved.Name} awake";
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            SetupStepText.Text = "failed";
            SetupDetailText.Text = error.Message;
        }
    }

    private async void OnPairClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            var pairing = await daemonClient.StartPairingAsync();
            PairingTokenText.Text = $"Pair token: {pairing.PairingToken}";
            BrowserStatusText.Text = pairing.BrowserLinkState?.Status ?? "pairing";
        }
        catch (Exception error)
        {
            PairingTokenText.Text = $"Pair failed: {error.Message}";
        }
    }

    private async void OnReadRepoClicked(object sender, RoutedEventArgs e)
    {
        if (currentBot is null)
        {
            RepoReadStatusText.Text = "daemon offline";
            NativeLoopStatusText.Text = "failed";
            return;
        }

        var repoUrl = RepoUrlText.Text.Trim();

        if (string.IsNullOrWhiteSpace(repoUrl))
        {
            RepoReadStatusText.Text = "empty";
            RepoNextMoveText.Text = "Paste a GitHub repo URL.";
            NativeLoopStatusText.Text = "failed";
            return;
        }

        try
        {
            ReadRepoButton.IsEnabled = false;
            RepoReadStatusText.Text = "reading";
            NativeLoopStatusText.Text = "repo-read";
            currentRepoReaderResult = await daemonClient.RunRepoReaderAsync(repoUrl, currentBot);
            ApplyRepoReaderResult(currentRepoReaderResult);
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            RepoReadStatusText.Text = "failed";
            RepoNextMoveText.Text = error.Message;
            NativeLoopStatusText.Text = "failed";
        }
        finally
        {
            ReadRepoButton.IsEnabled = true;
            UpdatePlaypenButtons();
        }
    }

    private async void OnStartPlaypenClicked(object sender, RoutedEventArgs e)
    {
        if (currentBot is null || currentRepoWorkspace is null)
        {
            PlaypenDetailText.Text = "Read a repo first.";
            return;
        }

        try
        {
            StartPlaypenButton.IsEnabled = false;
            PlaypenStatusText.Text = "starting";
            NativeLoopStatusText.Text = "playpen-starting";
            await daemonClient.StartSuperiorBrowserAsync(currentRepoWorkspace.Id, currentBot);
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            PlaypenStatusText.Text = "failed";
            PlaypenDetailText.Text = error.Message;
        }
        finally
        {
            UpdatePlaypenButtons();
        }
    }

    private async void OnStopPlaypenClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            StopPlaypenButton.IsEnabled = false;
            PlaypenStatusText.Text = "stopping";
            await daemonClient.StopSuperiorBrowserAsync();
            NativeLoopStatusText.Text = "stopped";
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            PlaypenStatusText.Text = "failed";
            PlaypenDetailText.Text = error.Message;
        }
        finally
        {
            UpdatePlaypenButtons();
        }
    }

    private async void OnServiceStartClicked(object sender, RoutedEventArgs e)
    {
        await RunServiceActionAsync(async () =>
        {
            var service = await serviceController.GetStatusAsync();

            if (service.Status == "not-installed")
            {
                var launch = await daemonSupervisor.EnsureRunningAsync();
                return new WindowsServiceCommandResult(launch.Status, launch.Detail, 0, launch.Detail);
            }

            return await serviceController.StartAsync();
        });
    }

    private async void OnServiceStopClicked(object sender, RoutedEventArgs e)
    {
        await RunServiceActionAsync(async () =>
        {
            daemonSupervisor.StopOwnedDaemon();
            return await serviceController.StopAsync();
        }, autoStartAfter: false);
    }

    private async void OnServiceInstallClicked(object sender, RoutedEventArgs e)
    {
        await RunServiceActionAsync(serviceController.InstallAsync);
    }

    private async void OnServiceUninstallClicked(object sender, RoutedEventArgs e)
    {
        await RunServiceActionAsync(serviceController.UninstallAsync);
    }

    private async void OnSaveOpenAiKeyClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            OpenAiStatusText.Text = "saving";
            openAiKeyStore.Save(OpenAiKeyBox.Password);
            OpenAiKeyBox.Clear();
            var restart = await daemonSupervisor.RestartOwnedDaemonAsync();
            OpenAiStatusText.Text = restart.Status == "needs-restart" ? "needs-restart" : "saved";
            OpenAiDetailText.Text = restart.Status == "needs-restart" ? "restart needed" : openAiKeyStore.KeyFilePath;
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            OpenAiStatusText.Text = "invalid";
            OpenAiDetailText.Text = error.Message;
        }
    }

    private async void OnClearOpenAiKeyClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            OpenAiStatusText.Text = "clearing";
            openAiKeyStore.Clear();
            var restart = await daemonSupervisor.RestartOwnedDaemonAsync();
            OpenAiStatusText.Text = restart.Status == "needs-restart" ? "needs-restart" : "missing";
            OpenAiDetailText.Text = restart.Status == "needs-restart" ? "restart needed" : openAiKeyStore.KeyFilePath;
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            OpenAiStatusText.Text = "failed";
            OpenAiDetailText.Text = error.Message;
        }
    }

    private async void OnTestOpenAiKeyClicked(object sender, RoutedEventArgs e)
    {
        await RefreshWorkbenchAsync();
    }

    private void OnQuitClicked(object sender, RoutedEventArgs e)
    {
        Close();
    }

    protected override void OnClosed(EventArgs e)
    {
        daemonSupervisor.Dispose();
        base.OnClosed(e);
    }

    private async Task RefreshWorkbenchAsync(bool autoStartDaemon = true)
    {
        try
        {
            DaemonStatusText.Text = "checking";
            var service = await serviceController.GetStatusAsync();
            ApplyServiceState(service);
            var launch = autoStartDaemon
                ? await daemonSupervisor.EnsureRunningAsync()
                : new DaemonLaunchState("stopped", "daemon start skipped");
            var health = await daemonClient.GetHealthAsync();
            var bot = await daemonClient.GetBotIdentityAsync();
            var presets = await daemonClient.GetBotPresetsAsync();
            var setupState = await daemonClient.GetSetupStateAsync();
            var catalog = await daemonClient.GetFunctionCatalogAsync();
            var recent = await daemonClient.GetRecentFunctionRunsAsync();
            var repoWorkspaces = await daemonClient.GetRepoWorkspacesAsync();
            var browserState = await daemonClient.GetSuperiorBrowserStateAsync();
            var browserEvents = await daemonClient.GetSuperiorBrowserEventsAsync();

            currentBot = bot;
            starterPresets = presets.Items;
            currentRepoWorkspace = repoWorkspaces.Items.OrderByDescending(item => item.UpdatedAt).FirstOrDefault();
            currentBrowserState = browserState;

            DaemonStatusText.Text = launch.Status == "started" ? "started" : health.Status;
            DaemonDetailText.Text = launch.Detail;
            InstalledRuntimeStatusText.Text = launch.RuntimeStatus;
            ApplyOpenAiState(health);
            BrowserStatusText.Text = health.BrowserLinkState?.Status ?? "unknown";
            ExtensionStatusText.Text = FormatExtensionStatus(browserState);
            var recentReaction = recent.Items.FirstOrDefault()?.BotReaction;
            FunctionProofText.Text = recentReaction?.Label ?? $"{catalog.Items.Count} parts ready";
            ApplyRepoWorkspaceState(currentRepoWorkspace);
            ApplyPlaypenState(browserState, browserEvents);
            ApplySetupState(setupState);
            UpdatePlaypenButtons();

            ApplyBot(bot, recentReaction);
        }
        catch (Exception error)
        {
            try
            {
                ApplyServiceState(await serviceController.GetStatusAsync());
            }
            catch
            {
                ServiceStatusText.Text = "failed";
                ServiceDetailText.Text = "service check failed";
            }

            DaemonStatusText.Text = "offline";
            DaemonDetailText.Text = "daemon not answering";
            InstalledRuntimeStatusText.Text = "failed";
            OpenAiStatusText.Text = "offline";
            OpenAiDetailText.Text = openAiKeyStore.KeyFilePath;
            BrowserStatusText.Text = "offline";
            ExtensionStatusText.Text = FormatExtensionStatus(currentBrowserState);
            SetupStepText.Text = "Power";
            SetupDetailText.Text = "daemon offline";
            PlaypenStatusText.Text = "offline";
            NativeLoopStatusText.Text = "failed";
            RepoReadStatusText.Text = "failed";
            RepoStatusText.Text = "daemon not answering";
            PlaypenDetailText.Text = "";
            PlaypenEventText.Text = "empty";
            FunctionProofText.Text = error.Message;
            UpdatePlaypenButtons();
        }
    }

    private async Task RunServiceActionAsync(Func<Task<WindowsServiceCommandResult>> action, bool autoStartAfter = true)
    {
        try
        {
            ServiceStatusText.Text = "working";
            var result = await action();
            ServiceStatusText.Text = result.Status;
            ServiceDetailText.Text = result.Detail;
            await RefreshWorkbenchAsync(autoStartAfter);
        }
        catch (Exception error)
        {
            ServiceStatusText.Text = "failed";
            ServiceDetailText.Text = error.Message;
        }
    }

    private async Task EnsureStarterPresetsAsync()
    {
        if (starterPresets.Count > 0)
        {
            return;
        }

        var presets = await daemonClient.GetBotPresetsAsync();
        starterPresets = presets.Items;
    }

    private void StartSetupFromPreset(string presetId)
    {
        var preset = starterPresets.FirstOrDefault(item => item.Id == presetId)
            ?? starterPresets.FirstOrDefault()
            ?? throw new InvalidOperationException("No starter presets returned.");
        var now = DateTimeOffset.UtcNow.ToString("O");
        setupDraftBot = new BotIdentity(
            Id: $"active-{preset.Id}",
            Name: preset.Name,
            Body: preset.Body,
            Color: preset.Color,
            Eye: preset.Eye,
            Skills: preset.Skills,
            StarterPresetId: preset.Id,
            CreatedAt: now,
            UpdatedAt: now);

        ApplySetupDraft(setupDraftBot);
        ApplyBot(setupDraftBot, reaction: null);
        SetupStepText.Text = "Pick / Build / Save";
        SetupDetailText.Text = preset.Role;
    }

    private BotIdentity BuildSetupDraft()
    {
        var baseBot = setupDraftBot ?? currentBot ?? new BotIdentity(
            Id: "active-clawd",
            Name: "Clawd",
            Body: "gremlin",
            Color: "mossGreen",
            Eye: "pixel",
            Skills: new[] { "page-explainer", "article-xray", "repo-reader" },
            StarterPresetId: "clawd");
        var now = DateTimeOffset.UtcNow.ToString("O");
        var name = string.IsNullOrWhiteSpace(BotNameInput.Text) ? baseBot.Name : BotNameInput.Text.Trim();
        var skills = CollectSetupSkills();

        return new BotIdentity(
            Id: baseBot.Id,
            Name: name,
            Body: ReadComboBoxValue(BodySelect, baseBot.Body),
            Color: ReadComboBoxValue(ColorSelect, baseBot.Color),
            Eye: ReadComboBoxValue(EyeSelect, baseBot.Eye),
            Skills: skills,
            StarterPresetId: baseBot.StarterPresetId,
            CreatedAt: baseBot.CreatedAt ?? now,
            UpdatedAt: now);
    }

    private IReadOnlyList<string> CollectSetupSkills()
    {
        var skills = new List<string>();

        if (SkillExplainCheck.IsChecked == true)
        {
            skills.Add("page-explainer");
        }

        if (SkillXrayCheck.IsChecked == true)
        {
            skills.Add("article-xray");
        }

        if (SkillRepoCheck.IsChecked == true)
        {
            skills.Add("repo-reader");
        }

        if (skills.Count == 0)
        {
            skills.Add("page-explainer");
        }

        return skills;
    }

    private void ApplySetupState(SuperiorSetupState setupState)
    {
        if (setupDraftBot is null)
        {
            ApplySetupDraft(setupState.Bot.Identity);
        }

        var readySteps = setupState.Steps
            .Where(step => step.Status == "ready")
            .Select(step => step.Label);
        var missingStep = setupState.Steps.FirstOrDefault(step => step.Status != "ready");

        SetupStepText.Text = missingStep is null ? "ready" : string.Join(" / ", readySteps.Append(missingStep.Label));
        SetupDetailText.Text = missingStep?.Detail
            ?? (setupState.ActiveBotSaved ? $"{setupState.Bot.Identity.Name} awake" : "save active bot");
    }

    private void ApplySetupDraft(BotIdentity bot)
    {
        BotNameInput.Text = bot.Name;
        SetComboBoxValue(BodySelect, bot.Body);
        SetComboBoxValue(ColorSelect, bot.Color);
        SetComboBoxValue(EyeSelect, bot.Eye);
        SkillExplainCheck.IsChecked = bot.Skills.Contains("page-explainer");
        SkillXrayCheck.IsChecked = bot.Skills.Contains("article-xray");
        SkillRepoCheck.IsChecked = bot.Skills.Contains("repo-reader");
    }

    private static string ReadComboBoxValue(ComboBox comboBox, string fallback)
    {
        return comboBox.SelectedItem is ComboBoxItem item && item.Content is string value ? value : fallback;
    }

    private static void SetComboBoxValue(ComboBox comboBox, string value)
    {
        foreach (var item in comboBox.Items.OfType<ComboBoxItem>())
        {
            if (item.Content is string itemValue && itemValue == value)
            {
                comboBox.SelectedItem = item;
                return;
            }
        }
    }

    private void ApplyBot(BotIdentity bot, BotReaction? reaction)
    {
        BotNameText.Text = bot.Name;
        BodyText.Text = bot.Body;
        ColorText.Text = bot.Color;
        EyeText.Text = bot.Eye;

        Bench.BotBody = bot.Body;
        Bench.BotColor = bot.Color;
        Bench.BotEye = bot.Eye;
        Bench.EquippedSkillsCsv = string.Join(",", bot.Skills);
        Bench.ReactionState = reaction?.State ?? "";
    }

    private void ApplyOpenAiState(DaemonHealth health)
    {
        if (health.OpenAiConfigured)
        {
            OpenAiStatusText.Text = "ready";
        }
        else if (openAiKeyStore.HasSavedKey || health.LocalConfig?.KeyFilePresent == true)
        {
            OpenAiStatusText.Text = "saved";
        }
        else
        {
            OpenAiStatusText.Text = "missing";
        }

        var source = health.LocalConfig?.OpenAiConfigSource ?? "local";
        var path = health.LocalConfig?.KeyFilePath ?? openAiKeyStore.KeyFilePath;
        OpenAiDetailText.Text = $"{source} / {path}";
    }

    private void ApplyRepoReaderResult(RepoReaderResult result)
    {
        RepoReadStatusText.Text = "saved";
        RepoSurfaceText.Text = $"{result.Repository.Owner}/{result.Repository.Name} / {result.Presentation.Primary}";
        RepoRoleText.Text = result.Playground.RobotRole;
        RepoNextMoveText.Text = result.NextMoves.FirstOrDefault() ?? result.Environment.Summary;
    }

    private void ApplyRepoWorkspaceState(RepoWorkspaceRecord? workspace)
    {
        if (currentRepoReaderResult is not null)
        {
            return;
        }

        if (workspace is null)
        {
            RepoReadStatusText.Text = "empty";
            RepoSurfaceText.Text = "surface pending";
            RepoRoleText.Text = "role pending";
            RepoNextMoveText.Text = "next move pending";
            return;
        }

        RepoReadStatusText.Text = "saved";
        RepoSurfaceText.Text = $"{workspace.Repository.Owner}/{workspace.Repository.Name} / {workspace.Presentation.Primary}";
        RepoRoleText.Text = workspace.Playground.RobotRole;
        RepoNextMoveText.Text = workspace.NextMove ?? workspace.LastBrowserEventSummary ?? "Start Playpen";
    }

    private void ApplyServiceState(WindowsServiceStatus service)
    {
        ServiceStatusText.Text = service.Status;
        ServiceDetailText.Text = service.Detail;
    }

    private void ApplyPlaypenState(SuperiorBrowserState browserState, SuperiorBrowserEventsResponse events)
    {
        var session = browserState.ActiveSession;
        PlaypenStatusText.Text = browserState.Status;
        NativeLoopStatusText.Text = FormatNativeLoopStatus(browserState, events);

        if (session is not null)
        {
            RepoStatusText.Text = session.RepoTitle;
            PlaypenDetailText.Text = FormatPlaypenDetail(session);
        }
        else if (currentRepoWorkspace is not null)
        {
            RepoStatusText.Text = $"{currentRepoWorkspace.Repository.Owner}/{currentRepoWorkspace.Repository.Name}";
            PlaypenDetailText.Text = currentRepoWorkspace.Playground.Label;
        }
        else
        {
            RepoStatusText.Text = "No saved repo";
            PlaypenDetailText.Text = "Run Repo Reader from the harness or daemon.";
        }

        var recentEvents = events.Items
            .Take(3)
            .Select(item => item.Label)
            .ToArray();

        PlaypenEventText.Text = recentEvents.Length > 0 ? string.Join(" / ", recentEvents) : "empty";
    }

    private static string FormatNativeLoopStatus(SuperiorBrowserState browserState, SuperiorBrowserEventsResponse events)
    {
        if (events.Items.Any(item => item.Kind == "skill_ran"))
        {
            return "skill-ran";
        }

        if (browserState.Status == "paired")
        {
            return "paired";
        }

        if (browserState.Status == "ready" || browserState.Status == "starting")
        {
            return "playpen-starting";
        }

        return browserState.Status == "closed" ? "idle" : browserState.Status;
    }

    private static string FormatPlaypenDetail(SuperiorBrowserSession session)
    {
        var browser = session.BrowserKind ?? "browser";
        var paired = session.PairedAt is null ? "unpaired" : "paired";
        var page = session.Inspection?.PageTitle ?? session.PlaypenLabel;

        return $"{browser} / {paired} / {page}";
    }

    private static string FormatExtensionStatus(SuperiorBrowserState? browserState)
    {
        if (browserState?.Status == "paired")
        {
            return "loaded in playpen";
        }

        return SuperiorRuntimePaths.HasAnyExtensionPackage() ? "packaged" : "missing";
    }

    private void UpdatePlaypenButtons()
    {
        var status = currentBrowserState?.Status ?? "closed";
        var canStart = currentRepoWorkspace is not null && status is "closed" or "failed" or "missing-browser";
        var canStop = currentBrowserState?.ActiveSession is not null && status is not "closed";

        StartPlaypenButton.IsEnabled = canStart;
        StopPlaypenButton.IsEnabled = canStop;
    }
}
