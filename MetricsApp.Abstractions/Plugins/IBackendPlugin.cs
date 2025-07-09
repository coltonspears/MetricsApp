using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MetricsApp.Abstractions.Plugins;

public interface IBackendPlugin : IPlugin
{
    void RegisterServices(IServiceCollection services, IConfiguration config);
}