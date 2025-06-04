using MetricsApp.Abstractions.DataSources;
using MetricsApp.DataSources.Core;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Microsoft.Extensions.DependencyInjection 
{
    
    /// <summary>
    /// Extension methods for registering datasource services
    /// </summary>
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Add datasource management services
        /// </summary>
        public static IServiceCollection AddDataSources(this IServiceCollection services)
        {
            services.AddSingleton<IDataSourceRegistry, DataSourceRegistry>();
            services.AddScoped<IDataSourceManager, DataSourceManager>();
            services.AddSingleton<DataSourceRegistrationService>();
            services.AddHostedService<DataSourceRegistrationService>();
            
            return services;
        }
        
        /// <summary>
        /// Register a datasource type
        /// </summary>
        public static IServiceCollection AddDataSource<T>(this IServiceCollection services) 
            where T : class, IDataSource
        {
            // Register the datasource type itself for DI
            services.AddTransient<T>();
            
            // Add registration action
            services.Configure<DataSourceRegistrationOptions>(options =>
            {
                options.RegistrationActions.Add(registry => registry.RegisterDataSource<T>());
            });
            
            return services;
        }

        /// <summary>
        /// Register a datasource with a custom factory
        /// </summary>
        public static IServiceCollection AddDataSource(this IServiceCollection services, 
            string dataSourceType, 
            Func<IServiceProvider, IDataSource> factory)
        {
            services.Configure<DataSourceRegistrationOptions>(options =>
            {
                options.RegistrationActions.Add(registry => registry.RegisterDataSource(dataSourceType, factory));
            });
            
            return services;
        }
    }

    /// <summary>
    /// Options for datasource registration
    /// </summary>
    public class DataSourceRegistrationOptions
    {
        public List<Action<IDataSourceRegistry>> RegistrationActions { get; } = new();
    }

    /// <summary>
    /// Hosted service that handles datasource registration on startup
    /// </summary>
    public class DataSourceRegistrationService : IHostedService
    {
        private readonly IDataSourceRegistry _registry;
        private readonly DataSourceRegistrationOptions _options;

        public DataSourceRegistrationService(IDataSourceRegistry registry, Microsoft.Extensions.Options.IOptions<DataSourceRegistrationOptions> options)
        {
            _registry = registry;
            _options = options.Value;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            // Execute all registration actions
            foreach (var action in _options.RegistrationActions)
            {
                action(_registry);
            }
            
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    } 
}
