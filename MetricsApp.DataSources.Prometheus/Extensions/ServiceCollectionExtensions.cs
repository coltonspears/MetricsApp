using MetricsApp.DataSources.Prometheus;
using Microsoft.Extensions.DependencyInjection;

namespace Microsoft.Extensions.DependencyInjection;

/// <summary>
/// Extension methods for registering Prometheus datasource
/// </summary>
public static class PrometheusDataSourceServiceCollectionExtensions
{
    /// <summary>
    /// Add Prometheus datasource with all required dependencies
    /// </summary>
    public static IServiceCollection AddPrometheusDataSource(this IServiceCollection services)
    {
        // Ensure HTTP client is registered
        services.AddHttpClient();
        
        // Register the Prometheus datasource
        services.AddDataSource<PrometheusDataSource>();
        
        return services;
    }
    
    /// <summary>
    /// Add Prometheus datasource with custom HTTP client configuration
    /// </summary>
    public static IServiceCollection AddPrometheusDataSource(this IServiceCollection services, 
        Action<HttpClient> configureHttpClient)
    {
        // Register HTTP client with custom configuration
        services.AddHttpClient<PrometheusDataSource>(configureHttpClient);
        
        // Register the Prometheus datasource
        services.AddDataSource<PrometheusDataSource>();
        
        return services;
    }
} 