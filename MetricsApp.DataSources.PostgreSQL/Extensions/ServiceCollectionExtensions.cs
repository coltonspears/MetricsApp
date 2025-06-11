using MetricsApp.DataSources.PostgreSQL;
using Microsoft.Extensions.DependencyInjection;

namespace Microsoft.Extensions.DependencyInjection
{
    /// <summary>
    /// Extension methods for registering PostgreSQL datasource
    /// </summary>
    public static class PostgreSQLDataSourceServiceCollectionExtensions
    {
        /// <summary>
        /// Add PostgreSQL datasource with all required dependencies
        /// </summary>
        public static IServiceCollection AddPostgreSQLDataSource(this IServiceCollection services)
        {
            // Register the PostgreSQL datasource
            services.AddDataSource<PostgresDataSource>();
        
            return services;
        }
    }   
}

