using MetricsApp.DataSources.SqlServer;
using Microsoft.Extensions.DependencyInjection;

namespace Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Extension methods for registering SQL Server datasource
/// </summary>
public static class SqlServerDataSourceServiceCollectionExtensions
{
    /// <summary>
    /// Add SQL Server datasource with all required dependencies
    /// </summary>
    public static IServiceCollection AddSqlServerDataSource(this IServiceCollection services)
    {
        // Register the SQL Server datasource
        services.AddDataSource<SqlServerDataSource>();
        
        return services;
    }
} 