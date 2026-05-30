using System.IO;
using System.Text;

namespace Superior.Windows.Services;

public sealed class OpenAiKeyStore
{
    public string StateDirectory => SuperiorRuntimePaths.UserStateDirectory;

    public string KeyFilePath => SuperiorRuntimePaths.KeyFilePath;

    public bool HasSavedKey => File.Exists(KeyFilePath);

    public void Save(string apiKey, string model = "gpt-4.1-mini")
    {
        var trimmedKey = apiKey.Trim();

        if (string.IsNullOrWhiteSpace(trimmedKey))
        {
            throw new InvalidOperationException("key empty");
        }

        Directory.CreateDirectory(StateDirectory);
        var content = new StringBuilder()
            .Append("OPENAI_API_KEY=")
            .AppendLine(trimmedKey)
            .Append("OPENAI_MODEL=")
            .AppendLine(model)
            .ToString();

        File.WriteAllText(KeyFilePath, content, Encoding.UTF8);
    }

    public void Clear()
    {
        if (File.Exists(KeyFilePath))
        {
            File.Delete(KeyFilePath);
        }
    }
}
