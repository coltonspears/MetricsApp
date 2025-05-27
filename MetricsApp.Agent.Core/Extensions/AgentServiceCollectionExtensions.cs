using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Microsoft.Extensions.DependencyInjection
{
    using Microsoft.Extensions.Configuration;
    using Microsoft.Extensions.Hosting; 
    using MetricsApp.Agent.Core.Services;

    public static class AgentServiceCollectionExtensions
    {
        public static IServiceCollection AddMetricsAgentCore(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<AgentOptions>(configuration.GetSection("MetricsAgent"));
            
            // The MetricCollectionService itself is registered as a hosted service.
            // IMetricCollector and IMetricEmitter implementations will be registered by other packages.
            services.AddHostedService<MetricCollectionService>();
            
            return services;
        }
    }
}