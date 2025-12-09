using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Abstractions.Plugins;

public static class PluginLoaderExtensions
{
    /// <summary>
    /// Adds plugin support to the service collection.
    /// Call this during ConfigureServices to register the plugin manager.
    /// </summary>
    public static IServiceCollection AddPlugins(this IServiceCollection services, IConfiguration config, string pluginsFolder)
    {
        // Register the plugin manager as singleton
        services.AddSingleton<IPluginManager>(sp =>
        {
            var logger = sp.GetRequiredService<ILogger<PluginManager>>();
            return new PluginManager(logger);
        });
        
        return services;
    }
    
    /// <summary>
    /// Loads and initializes all plugins.
    /// Call this after the service provider is built to load plugin assemblies.
    /// </summary>
    public static async Task<PluginLoadResult> LoadPluginsAsync(
        this IServiceProvider services,
        string pluginsFolder,
        IConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        var manager = services.GetRequiredService<IPluginManager>();
        var logger = services.GetRequiredService<ILogger<PluginManager>>();
        
        if (!Directory.Exists(pluginsFolder))
        {
            logger.LogInformation("Plugins folder not found: {PluginsFolder}", pluginsFolder);
            return new PluginLoadResult();
        }
        
        logger.LogInformation("Loading plugins from: {PluginsFolder}", pluginsFolder);
        
        // Load all plugins
        var result = await manager.LoadPluginsAsync(pluginsFolder, services, cancellationToken);
        
        if (result.HasErrors)
        {
            foreach (var error in result.LoadErrors)
            {
                logger.LogError("Failed to load plugin {PluginId}: {Message}", error.PluginId, error.Message);
            }
            foreach (var error in result.DependencyErrors)
            {
                logger.LogError("Dependency error: {Error}", error);
            }
        }
        
        logger.LogInformation("Loaded {Count} plugins", result.LoadedPlugins.Count);
        
        // Initialize all plugins
        await manager.InitializePluginsAsync(services, cancellationToken);
        
        return result;
    }
}

