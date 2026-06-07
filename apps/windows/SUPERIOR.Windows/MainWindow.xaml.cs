using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;
using Superior.Windows.Models;
using Superior.Windows.Services;

namespace Superior.Windows;

public partial class MainWindow : Window
{
    private sealed record RecoveryCue(string Title, string Detail);

    private readonly SuperiorDaemonClient daemonClient = new(new Uri("http://127.0.0.1:5317"));
    private readonly DaemonSupervisor daemonSupervisor;
    private readonly WindowsDaemonServiceController serviceController = new();
    private readonly OpenAiKeyStore openAiKeyStore = new();
    private BotIdentity? currentBot;
    private RepoWorkspaceRecord? currentRepoWorkspace;
    private SuperiorBrowserState? currentBrowserState;
    private GameTargetsResponse? currentGameTargets;
    private GameRuntimeState? currentGameRuntimeState;
    private GameServerRoutesResponse? currentGameServerRoutes;
    private RepoReaderResult? currentRepoReaderResult;
    private IReadOnlyList<BotStarterPreset> starterPresets = Array.Empty<BotStarterPreset>();
    private BotCreationOptionsResponse? creationOptions;
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
            SetupStepText.Text = "Power / Key / Browser / Shape";
            SetupDetailText.Text = "empty bench";
            await EnsureCreationOptionsAsync();
            StartSetupFromShape("orb");
        }
        catch (Exception error)
        {
            SetupStepText.Text = "failed";
            SetupDetailText.Text = error.Message;
        }
    }

    private async void OnShapeClicked(object sender, RoutedEventArgs e)
    {
        if (sender is not Button button || button.Tag is not string shapeId)
        {
            return;
        }

        try
        {
            await EnsureCreationOptionsAsync();
            StartSetupFromShape(shapeId);
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
            BrowserStatusText.Text = "pairing";
            BrowserDetailText.Text = "Use this token in the extension.";
            ExtensionStatusText.Text = pairing.BrowserLinkState?.Status ?? "token waiting";
            RecoveryStatusText.Text = "Hand pairing";
            RecoveryDetailText.Text = "Finish the token in the browser extension.";
            RecoveryQueueText.Text = "Browser hand waiting";
        }
        catch (Exception error)
        {
            PairingTokenText.Text = $"Pair failed: {error.Message}";
            RecoveryStatusText.Text = "Pair failed";
            RecoveryDetailText.Text = error.Message;
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

    private async void OnGameRigClicked(object sender, RoutedEventArgs e)
    {
        GameRigStatusText.Text = "checking";
        await RefreshWorkbenchAsync();
    }

    private async void OnImportGameRigClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            var dialog = new OpenFileDialog
            {
                Title = "Import a local game EXE",
                Filter = "Windows games (*.exe)|*.exe|All files (*.*)|*.*",
                CheckFileExists = true,
                Multiselect = false
            };

            if (dialog.ShowDialog(this) != true)
            {
                return;
            }

            GameRigStatusText.Text = "importing";
            var imported = await daemonClient.ImportGameTargetAsync(dialog.FileName);
            currentGameTargets = imported.Targets;
            GameTargetSelect.SelectedValue = imported.Target.Id;
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            GameRigStatusText.Text = "import failed";
            GameRigDetailText.Text = error.Message;
        }
    }

    private async void OnStartGameRigClicked(object sender, RoutedEventArgs e)
    {
        var targetId = GameTargetSelect.SelectedValue as string;

        if (string.IsNullOrWhiteSpace(targetId))
        {
            GameRigDetailText.Text = "Pick a cartridge first.";
            return;
        }

        try
        {
            StartGameRigButton.IsEnabled = false;
            GameRigStatusText.Text = "starting";
            await daemonClient.StartGameRuntimeAsync(targetId, ReadGameGoal(), GameServerRouteSelect.SelectedValue as string);
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            GameRigStatusText.Text = "failed";
            GameRigDetailText.Text = error.Message;
        }
        finally
        {
            UpdateGameRigButtons();
        }
    }

    private async void OnPauseGameRigClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            await daemonClient.PauseGameRuntimeAsync();
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            GameRigStatusText.Text = "pause failed";
            GameRigDetailText.Text = error.Message;
        }
    }

    private async void OnResumeGameRigClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            await daemonClient.ResumeGameRuntimeAsync();
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            GameRigStatusText.Text = "resume failed";
            GameRigDetailText.Text = error.Message;
        }
    }

    private async void OnStopGameRigClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            StopGameRigButton.IsEnabled = false;
            GameRigStatusText.Text = "stopping";
            await daemonClient.StopGameRuntimeAsync();
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            GameRigStatusText.Text = "stop failed";
            GameRigDetailText.Text = error.Message;
        }
        finally
        {
            UpdateGameRigButtons();
        }
    }

    private async void OnNudgeGameRigClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            await daemonClient.NudgeGameRuntimeAsync(ReadGameNudge());
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            GameRigStatusText.Text = "nudge failed";
            GameRigDetailText.Text = error.Message;
        }
    }

    private async void OnSetGameGoalClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            await daemonClient.SetGameRuntimeGoalAsync(ReadGameGoal());
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            GameRigStatusText.Text = "goal failed";
            GameRigDetailText.Text = error.Message;
        }
    }

    private async void OnSaveGameServerRouteClicked(object sender, RoutedEventArgs e)
    {
        try
        {
            GameRigStatusText.Text = "saving route";
            var saved = await daemonClient.SaveGameServerRouteAsync(
                GameServerAddressText.Text.Trim(),
                GameServerLabelText.Text.Trim(),
                GameServerPasswordText.Text.Trim(),
                GamePlayerNameText.Text.Trim());
            currentGameServerRoutes = saved.Routes;
            GameServerRouteSelect.SelectedValue = saved.Route.Id;
            await RefreshWorkbenchAsync();
        }
        catch (Exception error)
        {
            GameRigStatusText.Text = "route failed";
            GameRigDetailText.Text = error.Message;
        }
    }

    private void OnGameServerRouteSelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        ApplySelectedGameRouteToInputs();
    }

    private void OnGameTargetSelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (currentGameTargets is not null && currentGameRuntimeState is not null)
        {
            GameRigDetailText.Text = currentGameRuntimeState.ActiveSession is null
                ? FormatSelectedGameTargetDetail(currentGameTargets)
                : GameRigDetailText.Text;
        }

        UpdateGameRigButtons();
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
            var options = await daemonClient.GetBotCreationOptionsAsync();
            var setupState = await daemonClient.GetSetupStateAsync();
            var catalog = await daemonClient.GetFunctionCatalogAsync();
            var recent = await daemonClient.GetRecentFunctionRunsAsync();
            var repoWorkspaces = await daemonClient.GetRepoWorkspacesAsync();
            var browserState = await daemonClient.GetSuperiorBrowserStateAsync();
            var browserEvents = await daemonClient.GetSuperiorBrowserEventsAsync();
            var gameTargets = await daemonClient.GetGameTargetsAsync();
            var gameState = await daemonClient.GetGameRuntimeStateAsync();
            var gameEvents = await daemonClient.GetGameRuntimeEventsAsync();
            var gameRoutes = await daemonClient.GetGameServerRoutesAsync();

            currentBot = bot;
            starterPresets = presets.Items;
            creationOptions = options;
            currentRepoWorkspace = repoWorkspaces.Items.OrderByDescending(item => item.UpdatedAt).FirstOrDefault();
            currentBrowserState = browserState;
            currentGameTargets = gameTargets;
            currentGameRuntimeState = gameState;
            currentGameServerRoutes = gameRoutes;

            DaemonStatusText.Text = launch.Status == "started" ? "started" : health.Status;
            DaemonDetailText.Text = launch.Detail;
            InstalledRuntimeStatusText.Text = launch.RuntimeStatus;
            ApplyOpenAiState(health);
            BrowserStatusText.Text = FormatBrowserStatus(browserState);
            BrowserDetailText.Text = FormatBrowserDetail(browserState);
            ExtensionStatusText.Text = FormatExtensionStatus(health.BrowserLinkState, browserState);
            var recentReaction = recent.Items.FirstOrDefault()?.BotReaction;
            FunctionProofText.Text = recentReaction?.Label ?? $"{catalog.Items.Count} parts ready";
            ApplyRepoWorkspaceState(currentRepoWorkspace);
            ApplyPlaypenState(browserState, browserEvents);
            ApplyGameRigState(gameTargets, gameRoutes, gameState, gameEvents);
            ApplySetupState(setupState);
            ApplyRecoveryState(setupState, browserState);
            UpdatePlaypenButtons();
            UpdateGameRigButtons();

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
            BrowserDetailText.Text = "daemon offline; browser check blocked";
            ExtensionStatusText.Text = FormatExtensionStatus(null, currentBrowserState);
            SetupStepText.Text = "Power";
            SetupDetailText.Text = "daemon offline";
            ApplyDaemonOfflineRecoveryState(error);
            PlaypenStatusText.Text = "offline";
            NativeLoopStatusText.Text = "failed";
            RepoReadStatusText.Text = "failed";
            RepoStatusText.Text = "daemon not answering";
            PlaypenDetailText.Text = "";
            PlaypenEventText.Text = "empty";
            GameRigStatusText.Text = "offline";
            GameRigDetailText.Text = "daemon not answering";
            GameShelfTitleText.Text = "Game Rig offline";
            GameShelfDetailText.Text = "start daemon";
            GameShelfTargetsText.Text = "fixture unavailable";
            GameRigSafetyText.Text = "local-only / foreground-only / emergency stop";
            GameRigBudgetText.Text = "Free: 15 minutes high-quality gameplay";
            GameRigEventText.Text = "empty";
            FunctionProofText.Text = error.Message;
            UpdatePlaypenButtons();
            UpdateGameRigButtons();
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

    private async Task EnsureCreationOptionsAsync()
    {
        if (creationOptions is not null)
        {
            return;
        }

        creationOptions = await daemonClient.GetBotCreationOptionsAsync();
    }

    private void StartSetupFromShape(string shapeId)
    {
        var shape = creationOptions?.Shapes.FirstOrDefault(item => item.Id == shapeId)
            ?? creationOptions?.Shapes.FirstOrDefault()
            ?? throw new InvalidOperationException("No bot shapes returned.");
        var now = DateTimeOffset.UtcNow.ToString("O");
        setupDraftBot = new BotIdentity(
            Id: $"active-{shape.Id}",
            Name: shape.StarterName,
            Body: shape.Body,
            Color: shape.DefaultColor,
            Eye: shape.DefaultEye,
            Skills: CollectSetupSkills(),
            StarterPresetId: shape.StarterPresetId,
            CreatedAt: now,
            UpdatedAt: now);

        ApplySetupDraft(setupDraftBot);
        ApplyBot(setupDraftBot, reaction: null);
        SetupStepText.Text = "Shape / Skills / Save";
        SetupDetailText.Text = shape.BenchPrompt;
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
            Body: "orb",
            Color: "lavender",
            Eye: "glow",
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

    private void ApplyRecoveryState(SuperiorSetupState setupState, SuperiorBrowserState browserState)
    {
        var cues = CollectRecoveryCues(setupState, browserState);

        if (cues.Count == 0)
        {
            RecoveryStatusText.Text = "Bench ready";
            RecoveryDetailText.Text = "Spore, key, browser, and hand are fitted.";
            RecoveryQueueText.Text = "Power ready / Key ready / Browser ready / Hand fitted";
            return;
        }

        var lead = cues[0];
        RecoveryStatusText.Text = lead.Title;
        RecoveryDetailText.Text = lead.Detail;
        RecoveryQueueText.Text = string.Join(" / ", cues.Select(cue => cue.Title));
    }

    private static IReadOnlyList<RecoveryCue> CollectRecoveryCues(SuperiorSetupState setupState, SuperiorBrowserState browserState)
    {
        var cues = new List<RecoveryCue>();
        var accountStep = setupState.Steps.FirstOrDefault(step => step.Step == "account" && step.Status != "ready");

        if (accountStep is not null)
        {
            cues.Add(new RecoveryCue("Spore unclaimed", "Sign in with Google, X, or Discord."));
        }

        if (setupState.Key.Status != "ready")
        {
            cues.Add(new RecoveryCue("Key missing", "Paste a local OpenAI key. Press Save Key."));
        }

        if (browserState.Status == "missing-browser")
        {
            cues.Add(new RecoveryCue("Browser missing", "Install Chrome or Edge, or set SUPERIOR_BROWSER_PATH."));
        }

        if (browserState.Status != "missing-browser" && setupState.Browser.Status != "paired")
        {
            var detail = setupState.Browser.Status == "pairing"
                ? "Token is live. Finish pairing in the extension."
                : "Press Pair. Fit the Chrome hand to this spore.";
            cues.Add(new RecoveryCue("Hand unpaired", detail));
        }

        var modelStep = setupState.Steps.FirstOrDefault(step => step.Step == "model" && step.Status != "ready");

        if (modelStep is not null && setupState.Key.Status == "ready")
        {
            cues.Add(new RecoveryCue("Model missing", modelStep.Detail));
        }

        return cues;
    }

    private void ApplyDaemonOfflineRecoveryState(Exception error)
    {
        RecoveryStatusText.Text = "Power offline";
        RecoveryDetailText.Text = "Press Start. If it stays down, check packaged daemon resources.";
        RecoveryQueueText.Text = $"Daemon not answering / {error.Message}";
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

    private void ApplyGameRigState(
        GameTargetsResponse targets,
        GameServerRoutesResponse routes,
        GameRuntimeState state,
        GameRuntimeEventsResponse events)
    {
        var selectedId = GameTargetSelect.SelectedValue as string;
        var selectedRouteId = GameServerRouteSelect.SelectedValue as string;
        var activeSession = state.ActiveSession;
        var fallbackTarget = targets.Items.FirstOrDefault(item => item.Id == activeSession?.TargetId)
            ?? targets.Items.FirstOrDefault(item => item.Id == "superior-fixture-game")
            ?? targets.Items.FirstOrDefault();

        GameTargetSelect.ItemsSource = targets.Items;
        GameServerRouteSelect.ItemsSource = routes.Items;

        if (selectedId is not null && targets.Items.Any(item => item.Id == selectedId))
        {
            GameTargetSelect.SelectedValue = selectedId;
        }
        else if (fallbackTarget is not null)
        {
            GameTargetSelect.SelectedValue = fallbackTarget.Id;
        }

        if (selectedRouteId is not null && routes.Items.Any(item => item.Id == selectedRouteId))
        {
            GameServerRouteSelect.SelectedValue = selectedRouteId;
        }
        else if (activeSession?.ServerRoute is not null)
        {
            GameServerRouteSelect.SelectedValue = activeSession.ServerRoute.Id;
        }
        else if (routes.Items.Count > 0)
        {
            GameServerRouteSelect.SelectedValue = routes.Items.OrderByDescending(item => item.UpdatedAt).First().Id;
        }
        ApplySelectedGameRouteToInputs();

        GameRigStatusText.Text = state.Status;
        GameRigDetailText.Text = activeSession is null
            ? FormatSelectedGameTargetDetail(targets)
            : $"{activeSession.TargetLabel} / {activeSession.ServerRoute?.Address ?? "no route"} / {activeSession.Goal.Text}";
        GameRigSafetyText.Text = activeSession is null
            ? "local-only / foreground-only / emergency stop"
            : $"{activeSession.SafetyState} / pid {activeSession.ProcessId?.ToString() ?? "pending"} / confidence {activeSession.Confidence:0.00}";
        GameRigBudgetText.Text = $"{state.Budget.Plan.ToUpperInvariant()} / {state.Budget.Status}: {state.Budget.Detail}";

        var shelfTarget = activeSession is null
            ? targets.Items.FirstOrDefault(item => item.Id == (GameTargetSelect.SelectedValue as string)) ?? fallbackTarget
            : targets.Items.FirstOrDefault(item => item.Id == activeSession.TargetId) ?? fallbackTarget;

        GameShelfTitleText.Text = shelfTarget?.Label ?? "No cartridge";
        GameShelfDetailText.Text = activeSession is null
            ? $"{shelfTarget?.Status ?? "missing"} / {shelfTarget?.SafetyBadge ?? "local-only"}"
            : $"{activeSession.Status} / {activeSession.BrainMode} / {activeSession.SafetyState}";
        GameShelfTargetsText.Text = FormatGameShelfTargets(targets);

        var recentEvents = events.Items
            .Take(4)
            .Select(item => item.Detail is null ? item.Label : $"{item.Label}: {item.Detail}")
            .ToArray();

        GameRigEventText.Text = recentEvents.Length > 0 ? string.Join(" / ", recentEvents) : "empty";
    }

    private string FormatSelectedGameTargetDetail(GameTargetsResponse targets)
    {
        var selectedId = GameTargetSelect.SelectedValue as string;
        var selected = targets.Items.FirstOrDefault(item => item.Id == selectedId)
            ?? targets.Items.FirstOrDefault(item => item.Id == "superior-fixture-game")
            ?? targets.Items.FirstOrDefault();

        if (selected is null)
        {
            return "No game targets returned.";
        }

        var path = selected.ExecutablePath is null ? selected.Detail : selected.ExecutablePath;

        return $"{selected.Status} / {selected.Kind} / {path}";
    }

    private void ApplySelectedGameRouteToInputs()
    {
        var selectedId = GameServerRouteSelect.SelectedValue as string;
        var route = currentGameServerRoutes?.Items.FirstOrDefault(item => item.Id == selectedId);

        if (route is null)
        {
            return;
        }

        GameServerAddressText.Text = route.BattlemetricsUrl ?? route.Address;
        GameServerLabelText.Text = route.Label;
        GamePlayerNameText.Text = route.PlayerName ?? GamePlayerNameText.Text;
        GameServerPasswordText.Text = route.Password ?? "";
    }

    private static string FormatGameShelfTargets(GameTargetsResponse targets)
    {
        return string.Join(
            " / ",
            targets.Items.Take(4).Select(item => $"{item.Status.ToUpperInvariant()} {item.Label} [{item.SafetyBadge}]"));
    }

    private string ReadGameGoal()
    {
        var goal = GameGoalText.Text.Trim();

        return string.IsNullOrWhiteSpace(goal) ? "look around and report what changed" : goal;
    }

    private string ReadGameNudge()
    {
        var nudge = GameNudgeText.Text.Trim();

        return string.IsNullOrWhiteSpace(nudge) ? "try something useful" : nudge;
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

    private static string FormatBrowserStatus(SuperiorBrowserState browserState)
    {
        return browserState.Status == "missing-browser" ? "browser missing" : browserState.Status;
    }

    private static string FormatBrowserDetail(SuperiorBrowserState browserState)
    {
        if (browserState.Status == "missing-browser")
        {
            return "Install Chrome or Edge, or set SUPERIOR_BROWSER_PATH.";
        }

        if (browserState.ActiveSession is not null)
        {
            return FormatPlaypenDetail(browserState.ActiveSession);
        }

        if (browserState.Status == "closed")
        {
            return "Chrome/Edge found. Start Playpen after Repo Reader.";
        }

        return browserState.Status == "failed" ? "start failed" : $"playpen {browserState.Status}";
    }

    private static string FormatExtensionStatus(BrowserLinkState? browserLinkState, SuperiorBrowserState? browserState)
    {
        if (browserState?.ActiveSession?.Inspection?.ExtensionPaired == true)
        {
            return "hand reporting active page";
        }

        if (browserLinkState?.Status == "paired")
        {
            return browserLinkState.ExtensionId is null ? "hand paired" : $"hand paired / {browserLinkState.ExtensionId}";
        }

        if (browserLinkState?.Status == "pairing")
        {
            return "token waiting";
        }

        if (browserState?.Status == "missing-browser")
        {
            return SuperiorRuntimePaths.HasAnyExtensionPackage() ? "packaged; browser missing" : "extension package missing";
        }

        return SuperiorRuntimePaths.HasAnyExtensionPackage() ? "packaged; press Pair" : "extension package missing";
    }

    private void UpdatePlaypenButtons()
    {
        var status = currentBrowserState?.Status ?? "closed";
        var canStart = currentRepoWorkspace is not null && status is "closed" or "failed" or "missing-browser";
        var canStop = currentBrowserState?.ActiveSession is not null && status is not "closed";

        StartPlaypenButton.IsEnabled = canStart;
        StopPlaypenButton.IsEnabled = canStop;
    }

    private void UpdateGameRigButtons()
    {
        var selectedId = GameTargetSelect.SelectedValue as string;
        var selected = currentGameTargets?.Items.FirstOrDefault(item => item.Id == selectedId);
        var session = currentGameRuntimeState?.ActiveSession;
        var hasSession = session is not null && currentGameRuntimeState?.Status != "closed";
        var isPaused = session?.Status == "paused";

        StartGameRigButton.IsEnabled = selected?.Status == "ready" && !hasSession;
        PauseGameRigButton.IsEnabled = hasSession && !isPaused;
        ResumeGameRigButton.IsEnabled = hasSession && isPaused;
        StopGameRigButton.IsEnabled = hasSession;
        NudgeGameRigButton.IsEnabled = hasSession;
        SetGameGoalButton.IsEnabled = hasSession;
        SaveGameServerRouteButton.IsEnabled = !hasSession;
    }
}
