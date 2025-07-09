using System.Reflection;
using System.Text.Json;

namespace MetricsApp.Abstractions.Plugins;

public class PluginManager : IPluginManager
{
    private readonly JsonSerializerOptions _jsonOptions = new JsonSerializerOptions
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
    };

    public IReadOnlyList<PluginManifest> LoadManifests(string pluginsFolder)
    {
        if (!Directory.Exists(pluginsFolder))
            return Array.Empty<PluginManifest>();

        var manifests = new List<PluginManifest>();
        var files = Directory.EnumerateFiles(pluginsFolder, "manifest.json", SearchOption.AllDirectories);
        foreach (var path in files)
        {
            try
            {
                var json = File.ReadAllText(path);
                var manifest = JsonSerializer.Deserialize<PluginManifest>(json, _jsonOptions);
                if (manifest != null)
                    manifests.Add(manifest);
            }
            catch
            {
                // log or swallow
            }
        }
        return manifests;
    }

    public IEnumerable<IBackendPlugin> LoadBackendPlugins(string pluginsFolder)
    {
        var backTypes = new[]
        {
            PluginType.Persistence,
            PluginType.DataSource,
            PluginType.Setup
        };

        foreach (var manifest in LoadManifests(pluginsFolder).Where(m => backTypes.Contains(m.Type)))
        {
            var assemblyPath = Path.Combine(pluginsFolder, manifest.Entry.Assembly);
            if (!File.Exists(assemblyPath)) continue;

            var asm = Assembly.LoadFrom(assemblyPath);
            var pluginTypes = asm.GetTypes()
                .Where(t => typeof(IBackendPlugin).IsAssignableFrom(t) && !t.IsAbstract);

            foreach (var type in pluginTypes)
            {
                if (Activator.CreateInstance(type) is IBackendPlugin plugin)
                    yield return plugin;
            }
        }
    }

    public IEnumerable<IFrontendPlugin> LoadFrontendPlugins(string pluginsFolder)
    {
        foreach (var manifest in LoadManifests(pluginsFolder)
                     .Where(m => m.Type == PluginType.Dashboard))
        {
            // we assume Dashboards are purely UI plugins; adapt if others exist
            if (string.IsNullOrWhiteSpace(manifest.Entry.Assembly)) continue;

            var assemblyPath = Path.Combine(pluginsFolder, manifest.Entry.Assembly);
            if (!File.Exists(assemblyPath)) continue;

            var asm = Assembly.LoadFrom(assemblyPath);
            var pluginTypes = asm.GetTypes()
                .Where(t => typeof(IFrontendPlugin).IsAssignableFrom(t) && !t.IsAbstract);

            foreach (var type in pluginTypes)
            {
                if (Activator.CreateInstance(type) is IFrontendPlugin plugin)
                    yield return plugin;
            }
        }
    }
}