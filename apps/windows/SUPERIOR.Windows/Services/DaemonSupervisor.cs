using System.Diagnostics;
using System.IO;
using Superior.Windows.Models;

namespace Superior.Windows.Services;

public sealed class DaemonSupervisor : IDisposable
{
    private readonly SuperiorDaemonClient daemonClient;
    private Process? ownedProcess;

    public DaemonSupervisor(SuperiorDaemonClient daemonClient)
    {
        this.daemonClient = daemonClient;
    }

    public async Task<DaemonLaunchState> EnsureRunningAsync()
    {
        if (await TryReadHealthAsync())
        {
            return new DaemonLaunchState("ready", "daemon already running", ownedProcess is null ? "external" : ResolveRuntime().Status);
        }

        var repoRoot = FindRepoRoot();
        var runtime = ResolveRuntime(repoRoot);

        if (runtime.Status == "missing-resource" || runtime.NodePath is null || runtime.Arguments is null)
        {
            return new DaemonLaunchState("offline", runtime.Detail, runtime.Status);
        }

        if (ownedProcess is null || ownedProcess.HasExited)
        {
            ownedProcess = StartDaemon(runtime);
        }

        for (var attempt = 0; attempt < 30; attempt++)
        {
            await Task.Delay(350);

            if (await TryReadHealthAsync())
            {
                return new DaemonLaunchState("started", "daemon started", runtime.Status);
            }
        }

        return new DaemonLaunchState("offline", "daemon did not answer", runtime.Status);
    }

    public async Task<DaemonLaunchState> RestartOwnedDaemonAsync()
    {
        if (ownedProcess is null || ownedProcess.HasExited)
        {
            if (await TryReadHealthAsync())
            {
                return new DaemonLaunchState("needs-restart", "daemon already running outside this window", "external");
            }
        }

        StopOwnedDaemon();
        return await EnsureRunningAsync();
    }

    public void Dispose()
    {
        StopOwnedDaemon();
    }

    public void StopOwnedDaemon()
    {
        if (ownedProcess is null || ownedProcess.HasExited)
        {
            return;
        }

        ownedProcess.Kill(entireProcessTree: true);
        ownedProcess.Dispose();
        ownedProcess = null;
    }

    private async Task<bool> TryReadHealthAsync()
    {
        try
        {
            var health = await daemonClient.GetHealthAsync();

            return health.Service == "superior-daemon";
        }
        catch
        {
            return false;
        }
    }

    private static Process StartDaemon(DaemonRuntime runtime)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = runtime.NodePath,
            Arguments = runtime.Arguments,
            WorkingDirectory = runtime.WorkingDirectory,
            CreateNoWindow = true,
            UseShellExecute = false,
            WindowStyle = ProcessWindowStyle.Hidden
        };

        startInfo.Environment["CLAWDBOT_DAEMON_HOST"] = "127.0.0.1";
        startInfo.Environment["CLAWDBOT_DAEMON_PORT"] = "5317";
        startInfo.Environment["CLAWDBOT_STATE_DIR"] = runtime.StateDirectory;

        if (!string.IsNullOrWhiteSpace(runtime.ExtensionPath))
        {
            startInfo.Environment["SUPERIOR_EXTENSION_PATH"] = runtime.ExtensionPath;
        }

        return Process.Start(startInfo) ?? throw new InvalidOperationException("Could not start SUPERIOR daemon.");
    }

    private static DaemonRuntime ResolveRuntime(string? repoRoot = null)
    {
        if (SuperiorRuntimePaths.HasPackagedDaemon && SuperiorRuntimePaths.HasPackagedNode)
        {
            return new DaemonRuntime(
                "packaged",
                "packaged daemon",
                SuperiorRuntimePaths.PackagedNodePath,
                $"\"{SuperiorRuntimePaths.PackagedDaemonEntry}\"",
                AppContext.BaseDirectory,
                SuperiorRuntimePaths.UserStateDirectory,
                SuperiorRuntimePaths.HasPackagedExtension ? SuperiorRuntimePaths.PackagedExtensionPath : null);
        }

        if (SuperiorRuntimePaths.HasPackagedDaemon || SuperiorRuntimePaths.HasPackagedNode)
        {
            return new DaemonRuntime(
                "missing-resource",
                "packaged daemon resources incomplete",
                null,
                null,
                AppContext.BaseDirectory,
                SuperiorRuntimePaths.UserStateDirectory,
                null);
        }

        repoRoot ??= FindRepoRoot();

        if (repoRoot is null)
        {
            return new DaemonRuntime("missing-resource", "repo root not found", null, null, AppContext.BaseDirectory, SuperiorRuntimePaths.UserStateDirectory, null);
        }

        var node = "cmd.exe";
        var arguments = "/c corepack pnpm dev:daemon";
        var extensionPath = Path.Combine(repoRoot, "apps", "extension", "dist");

        return new DaemonRuntime(
            "dev",
            "dev daemon",
            node,
            arguments,
            repoRoot,
            Path.Combine(repoRoot, ".clawdbot"),
            File.Exists(Path.Combine(extensionPath, "manifest.json")) ? extensionPath : null);
    }

    public static string? FindRepoRoot()
    {
        var directory = AppContext.BaseDirectory;

        while (!string.IsNullOrWhiteSpace(directory))
        {
            if (File.Exists(Path.Combine(directory, "pnpm-workspace.yaml")) && Directory.Exists(Path.Combine(directory, "apps", "daemon")))
            {
                return directory;
            }

            directory = Directory.GetParent(directory)?.FullName;
        }

        var sourceRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".."));

        if (File.Exists(Path.Combine(sourceRoot, "pnpm-workspace.yaml")))
        {
            return sourceRoot;
        }

        return null;
    }

    private sealed record DaemonRuntime(
        string Status,
        string Detail,
        string? NodePath,
        string? Arguments,
        string WorkingDirectory,
        string StateDirectory,
        string? ExtensionPath);
}
