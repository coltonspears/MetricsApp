using MetricsApp.DataSources.MySql;
using Microsoft.Extensions.DependencyInjection;

namespace Microsoft.Extensions.DependencyInjection
{
    /// <summary>
    /// Extension methods for registering MySql datasource
    /// </summary>
    public static class MySqlDataSourceServiceCollectionExtensions
    {
        /// <summary>
        /// Add MySql datasource with all required dependencies
        /// </summary>
        public static IServiceCollection AddMySqlDataSource(this IServiceCollection services)
        {
            // Register the SQL Server datasource
            services.AddDataSource<MySqlDataSource>();
        
            return services;
        }
    }   
}

