using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.Plugins;
using MetricsApp.DataSources.SqlServer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace SqlServerPlugin;

public class SqlServerPlugin : IBackendPlugin
{
    public string Name => "SQL Server DataSource";
    public string Version => "0.0.1";

    public void RegisterServices(IServiceCollection services, IConfiguration config)
    {
        services.AddTransient<IDataRepository, SqlServerDataRepository>();
    }
}