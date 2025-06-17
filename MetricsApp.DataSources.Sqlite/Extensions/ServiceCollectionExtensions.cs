using MetricsApp.DataSources.Sqlite;
using Microsoft.Extensions.DependencyInjection;

namespace Microsoft.Extensions.DependencyInjection
{
    /// <summary>
    /// Extension methods for registering Sqlite datasource
    /// </summary>
    public static class SqliteDataSourceServiceCollectionExtensions
    {
        /// <summary>
        /// Add Sqlite datasource with all required dependencies
        /// </summary>
        public static IServiceCollection AddSqliteDataSource(this IServiceCollection services)
        {
            // Register the SQL Server datasource
            services.AddDataSource<SqliteDataSource>();
        
            return services;
        }
    }   
}

