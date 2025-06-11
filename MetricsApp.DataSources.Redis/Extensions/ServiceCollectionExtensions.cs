using MetricsApp.DataSources.Redis;
using Microsoft.Extensions.DependencyInjection;

namespace Microsoft.Extensions.DependencyInjection
{
    /// <summary>
    /// Extension methods for registering Redis datasource
    /// </summary>
    public static class RedisDataSourceServiceCollectionExtensions
    {
        /// <summary>
        /// Add Redis datasource with all required dependencies
        /// </summary>
        public static IServiceCollection AddRedisDataSource(this IServiceCollection services)
        {
            // Register the SQL Server datasource
            services.AddDataSource<RedisDataSource>();
        
            return services;
        }
    }   
}

