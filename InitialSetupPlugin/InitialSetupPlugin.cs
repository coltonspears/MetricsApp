using MetricsApp.Abstractions.Plugins;
using MetricsApp.Abstractions.Setup;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InitialSetupPlugin;

public class InitialSetupPlugin : IBackendPlugin, IFrontendPlugin
{
    public string Name => "MetricsApp.Setup.InitialSetup";
    public string Version => "1.0.0";

    public void RegisterServices(IServiceCollection services, IConfiguration config)
    {
        // e.g. register SetupController routes, DbInitializer, etc.
        services.AddTransient<IDbInitializer, SqlServerDbInitializer>();
    }

    public string MountPointId { get; } = "initial-setup";
    public string BundlePath { get; } = "/plugins/initial-setup-plugin.bundle.js";
}