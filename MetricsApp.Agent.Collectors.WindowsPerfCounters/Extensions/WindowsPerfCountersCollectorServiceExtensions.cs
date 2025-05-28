using MetricsApp.Agent.Collectors.WindowsPerfCounters;
using MetricsApp.Agent.Core.Abstractions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Microsoft.Extensions.DependencyInjection
{
    public static class WindowsPerfCounterCollectorServiceExtensions
    {
        public static IServiceCollection AddWindowsPerfCounterCollector(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<WindowsPerfCounterCollectorOptions>(configuration.GetSection("MetricsAgent:Collectors:WindowsPerfCounters"));
            services.AddSingleton<IMetricCollector, WindowsPerfCounterCollector>();
            return services;
        }
    }
}



