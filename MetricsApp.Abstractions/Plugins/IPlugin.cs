using MetricsApp.Abstractions.Plugins.Capabilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MetricsApp.Abstractions.Plugins;

/// <summary>
/// Core interface that all plugins must implement.
/// Plugins declare their functionality by implementing capability interfaces.
/// </summary>
public interface IPlugin
{
    /// <summary>
    /// Unique plugin identifier, e.g. "metricsapp-datasource-sqlserver"
    /// Should match the plugin_id in manifest.json
    /// </summary>
    string Id { get; }
    
    /// <summary>
    /// Full plugin name, e.g. "MetricsApp.DataSources.SqlServer"
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Semantic version, e.g. "1.0.0"
    /// </summary>
    string Version { get; }
    
    /// <summary>
    /// Human-readable title
    /// </summary>
    string Title { get; }
    
    /// <summary>
    /// Description of what this plugin provides
    /// </summary>
    string Description { get; }
    
    /// <summary>
    /// Gets all capabilities this plugin provides
    /// </summary>
    IEnumerable<IPluginCapability> GetCapabilities();
    
    /// <summary>
    /// Gets a specific capability if the plugin provides it
    /// </summary>
    TCapability? GetCapability<TCapability>() where TCapability : class, IPluginCapability;
    
    /// <summary>
    /// Checks if this plugin provides a specific capability
    /// </summary>
    bool HasCapability<TCapability>() where TCapability : class, IPluginCapability;
    
    /// <summary>
    /// Called during application startup to register services
    /// </summary>
    void ConfigureServices(IServiceCollection services, IConfiguration configuration);
    
    /// <summary>
    /// Called after the plugin is loaded
    /// </summary>
    Task OnLoadAsync(PluginContext context, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Called after all plugins are loaded and services are configured
    /// </summary>
    Task OnInitializeAsync(IServiceProvider services, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Called when the application is shutting down
    /// </summary>
    Task OnShutdownAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Context provided to plugins during loading.
/// </summary>
public class PluginContext
{
    /// <summary>
    /// The loaded manifest for this plugin.
    /// </summary>
    public required PluginManifest Manifest { get; init; }
    
    /// <summary>
    /// Base directory where the plugin is located.
    /// </summary>
    public required string PluginDirectory { get; init; }
    
    /// <summary>
    /// Configuration section for this plugin.
    /// </summary>
    public IConfiguration? Configuration { get; init; }
    
    /// <summary>
    /// Service provider for resolving dependencies during load.
    /// </summary>
    public required IServiceProvider Services { get; init; }
}