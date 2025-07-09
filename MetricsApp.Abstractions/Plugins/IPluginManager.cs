namespace MetricsApp.Abstractions.Plugins;

public interface IPluginManager
{
    /// <summary>
    /// Scan the given folder for manifest.json and return parsed PluginManifest instances.
    /// </summary>
    IReadOnlyList<PluginManifest> LoadManifests(string pluginsFolder);

    IEnumerable<IBackendPlugin> LoadBackendPlugins(string pluginsFolder);
    IEnumerable<IFrontendPlugin> LoadFrontendPlugins(string pluginsFolder);
}