using System.IO;

namespace Superior.Windows.Services;

public static class SuperiorRuntimePaths
{
    public static string UserStateDirectory =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SUPERIOR", ".clawdbot");

    public static string KeyFilePath => Path.Combine(UserStateDirectory, ".env.local");

    public static string ResourceDirectory => Path.Combine(AppContext.BaseDirectory, "resources");

    public static string PackagedNodePath => Path.Combine(ResourceDirectory, "node", "node.exe");

    public static string PackagedDaemonEntry => Path.Combine(ResourceDirectory, "daemon", "server.mjs");

    public static string PackagedExtensionPath => Path.Combine(ResourceDirectory, "extension");

    public static bool HasPackagedNode => File.Exists(PackagedNodePath);

    public static bool HasPackagedDaemon => File.Exists(PackagedDaemonEntry);

    public static bool HasPackagedExtension => File.Exists(Path.Combine(PackagedExtensionPath, "manifest.json"));

    public static bool HasAnyExtensionPackage()
    {
        if (HasPackagedExtension)
        {
            return true;
        }

        var repoRoot = DaemonSupervisor.FindRepoRoot();
        return repoRoot is not null && File.Exists(Path.Combine(repoRoot, "apps", "extension", "dist", "manifest.json"));
    }
}
