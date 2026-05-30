using System.Diagnostics;
using System.IO;
using System.Text;
using Superior.Windows.Models;

namespace Superior.Windows.Services;

public sealed class WindowsDaemonServiceController
{
    public async Task<WindowsServiceStatus> GetStatusAsync()
    {
        const string command = """
        $task = Get-ScheduledTask -TaskName 'SUPERIOR Daemon' -ErrorAction SilentlyContinue
        if (!$task) { Write-Output 'not-installed'; exit 0 }
        if ($task.State -eq 'Running') { Write-Output 'running'; exit 0 }
        if ($task.State -eq 'Ready' -or $task.State -eq 'Disabled') { Write-Output 'stopped'; exit 0 }
        Write-Output 'installed'
        """;

        var result = await RunPowerShellCommandAsync(command);

        if (result.ExitCode != 0)
        {
            return new WindowsServiceStatus(ToFailureStatus(result.Output), TrimDetail(result.Output, "service check failed"));
        }

        var status = result.Output.Trim();
        return new WindowsServiceStatus(string.IsNullOrWhiteSpace(status) ? "failed" : status, "scheduled task");
    }

    public async Task<WindowsServiceCommandResult> InstallAsync()
    {
        var repoRoot = DaemonSupervisor.FindRepoRoot();

        if (repoRoot is null)
        {
            return new WindowsServiceCommandResult("failed", "repo root not found", 1, "");
        }

        var script = Path.Combine(repoRoot, "apps", "daemon", "scripts", "install-windows-service.ps1");
        var result = await RunPowerShellFileAsync(script, "-WorkspaceRoot", repoRoot, "-Build");

        return ToCommandResult(result, "installed");
    }

    public async Task<WindowsServiceCommandResult> UninstallAsync()
    {
        var repoRoot = DaemonSupervisor.FindRepoRoot();

        if (repoRoot is null)
        {
            return new WindowsServiceCommandResult("failed", "repo root not found", 1, "");
        }

        var script = Path.Combine(repoRoot, "apps", "daemon", "scripts", "uninstall-windows-service.ps1");
        var result = await RunPowerShellFileAsync(script);

        return ToCommandResult(result, "not-installed");
    }

    public async Task<WindowsServiceCommandResult> StartAsync()
    {
        const string command = """
        $task = Get-ScheduledTask -TaskName 'SUPERIOR Daemon' -ErrorAction SilentlyContinue
        if (!$task) { Write-Output 'not-installed'; exit 2 }
        Start-ScheduledTask -TaskName 'SUPERIOR Daemon'
        Write-Output 'running'
        """;

        var result = await RunPowerShellCommandAsync(command);

        return ToCommandResult(result, "running");
    }

    public async Task<WindowsServiceCommandResult> StopAsync()
    {
        const string command = """
        $task = Get-ScheduledTask -TaskName 'SUPERIOR Daemon' -ErrorAction SilentlyContinue
        if (!$task) { Write-Output 'not-installed'; exit 0 }
        Stop-ScheduledTask -TaskName 'SUPERIOR Daemon' -ErrorAction SilentlyContinue
        Write-Output 'stopped'
        """;

        var result = await RunPowerShellCommandAsync(command);

        return ToCommandResult(result, "stopped");
    }

    private static WindowsServiceCommandResult ToCommandResult(ProcessOutput output, string successStatus)
    {
        if (output.ExitCode == 0)
        {
            return new WindowsServiceCommandResult(successStatus, TrimDetail(output.Output, successStatus), output.ExitCode, output.Output);
        }

        var status = ToFailureStatus(output.Output);
        return new WindowsServiceCommandResult(status, TrimDetail(output.Output, status), output.ExitCode, output.Output);
    }

    private static string ToFailureStatus(string output)
    {
        return output.Contains("Access is denied", StringComparison.OrdinalIgnoreCase) ||
            output.Contains("blocked scheduled task", StringComparison.OrdinalIgnoreCase) ||
            output.Contains("elevated", StringComparison.OrdinalIgnoreCase)
            ? "needs-admin"
            : "failed";
    }

    private static string TrimDetail(string output, string fallback)
    {
        var detail = output.Trim();

        return string.IsNullOrWhiteSpace(detail) ? fallback : detail;
    }

    private static Task<ProcessOutput> RunPowerShellCommandAsync(string command)
    {
        return RunPowerShellAsync(startInfo =>
        {
            startInfo.ArgumentList.Add("-Command");
            startInfo.ArgumentList.Add(command);
        });
    }

    private static Task<ProcessOutput> RunPowerShellFileAsync(string scriptPath, params string[] arguments)
    {
        return RunPowerShellAsync(startInfo =>
        {
            startInfo.ArgumentList.Add("-File");
            startInfo.ArgumentList.Add(scriptPath);

            foreach (var argument in arguments)
            {
                startInfo.ArgumentList.Add(argument);
            }
        });
    }

    private static async Task<ProcessOutput> RunPowerShellAsync(Action<ProcessStartInfo> configure)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            CreateNoWindow = true,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
            WindowStyle = ProcessWindowStyle.Hidden
        };

        startInfo.ArgumentList.Add("-NoProfile");
        startInfo.ArgumentList.Add("-ExecutionPolicy");
        startInfo.ArgumentList.Add("Bypass");
        configure(startInfo);

        using var process = Process.Start(startInfo) ?? throw new InvalidOperationException("Could not start PowerShell.");
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        await process.WaitForExitAsync();

        return new ProcessOutput(process.ExitCode, $"{await stdout}{await stderr}");
    }

    private sealed record ProcessOutput(int ExitCode, string Output);
}
