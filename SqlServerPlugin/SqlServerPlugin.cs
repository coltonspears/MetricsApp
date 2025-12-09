using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.Plugins;
using MetricsApp.DataSources.SqlServer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace SqlServerPlugin;

/// <summary>
/// SQL Server data source plugin - provides SQL Server as a persistence layer.
/// </summary>
[PluginManifest(
    Tags = new[] { "Data Stores", "Database" },
    License = "MIT",
    FrontendBundle = "/plugins/sqlserver-plugin/bundle.js",
    Permissions = new[] { "datasources:read", "datasources:write" }
)]
[PluginAuthor("Colton Spears", Email = "coltonspears09@gmail.com", Homepage = "https://github.com/coltonspears09")]
[PluginAsset(PluginAssetType.Dashboard, "assets/dashboards/SQLServer-Overview_dashboard.json")]
[PluginAsset(PluginAssetType.Dashboard, "assets/dashboards/sqlserver_dashboard.json")]
[PluginAsset(PluginAssetType.Alert, "assets/alerts/sqlserver_high_processes_blocked.json")]
public class SqlServerPlugin : PluginBase
{
    public override string Id => "sqlserver-datasource-plugin";
    public override string Name => "SQL Server DataSource";
    public override string Version => "0.0.1";
    public override string Title => "SQL Server Data Source";
    public override string Description => "Provides SQL Server as a data repository for MetricsApp, collecting important SQL Server performance and health metrics.";

    public override void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddTransient<IDataRepository, SqlServerDataRepository>();
    }
}
