using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MetricsApp.Abstractions.Plugins;

/// <summary>
/// Interface for managing plugin discovery, loading, and lifecycle.
/// </summary>
public interface IPluginManager : IDisposable
{
    /// <summary>
    /// Gets all loaded plugins.
    /// </summary>
    IReadOnlyDictionary<string, LoadedPlugin> LoadedPlugins { get; }
    
    /// <summary>
    /// Discovers and loads all plugins from the specified folder.
    /// </summary>
    Task<PluginLoadResult> LoadPluginsAsync(
        string pluginsFolder, 
        IServiceProvider services,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Registers services for all loaded plugins.
    /// </summary>
    void ConfigureServices(IServiceCollection services, IConfiguration configuration);
    
    /// <summary>
    /// Initializes all loaded plugins.
    /// </summary>
    Task InitializePluginsAsync(IServiceProvider services, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Gets all plugins that provide a specific capability.
    /// </summary>
    IEnumerable<TCapability> GetCapabilities<TCapability>() 
        where TCapability : class, Capabilities.IPluginCapability;
    
    /// <summary>
    /// Gets a specific plugin by ID.
    /// </summary>
    LoadedPlugin? GetPlugin(string pluginId);
    
    /// <summary>
    /// Loads and parses all manifest files from the plugins folder.
    /// </summary>
    IReadOnlyList<PluginManifest> LoadManifests(string pluginsFolder);
}
