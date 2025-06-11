using MetricsApp.DataSources.WindowsPerformanceCounters;
using Microsoft.Extensions.DependencyInjection;

namespace Microsoft.Extensions.DependencyInjection
{
    /// <summary>
    /// Extension methods for registering Windows Performance Counters datasource
    /// </summary>
    public static class WindowsPerfDataSourceServiceCollectionExtensions
    {
        /// <summary>
        /// Add Windows Performance Counters datasource with all required dependencies
        /// </summary>
        public static IServiceCollection AddWindowsPerfDataSource(this IServiceCollection services)
        {
            // Register the SQL Server datasource
            services.AddDataSource<WindowsPerformanceMetricsDataSource>();
        
            return services;
        }
    }   
}

