using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MetricsApp.Abstractions.Plugins;

public static class PluginLoaderExtensions
{
    public static IServiceCollection AddPlugins(this IServiceCollection services, IConfiguration config, string pluginsFolder)
    {
        var manager = new PluginManager();
        var manifests = manager.LoadManifests(pluginsFolder);
        foreach (var manifest in manifests.Where(m => m.Type == PluginType.Persistence || m.Type == PluginType.DataSource || m.Type == PluginType.Setup))
        {
            var plugin = manager.LoadBackendPlugins(pluginsFolder)
                .First(p => p.Name == manifest.Name);
            plugin.RegisterServices(services, config);
        }
        services.AddSingleton<IPluginManager>(manager);
        return services;
    }
}