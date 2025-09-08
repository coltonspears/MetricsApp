using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Serilog;
using MetricsApp.Serilog.Sink.Configuration;

namespace MetricsApp.Serilog.Sink.Extensions;

/// <summary>
/// Extensions for registering MetricsApp Serilog sink with dependency injection
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds MetricsApp Serilog sink to the service collection and configures Serilog as the logging provider
    /// </summary>
    public static IServiceCollection AddMetricsAppLogging(
        this IServiceCollection services,
        IConfiguration configuration,
        string configSection = "MetricsApp")
    {
        if (services == null) throw new ArgumentNullException(nameof(services));
        if (configuration == null) throw new ArgumentNullException(nameof(configuration));

        // Register the configuration
        services.Configure<MetricsAppSinkConfiguration>(configuration.GetSection(configSection));

        // Configure Serilog
        var sinkConfig = new MetricsAppSinkConfiguration();
        configuration.GetSection(configSection).Bind(sinkConfig);

        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(configuration)
            .WriteTo.MetricsApp(sinkConfig)
            .CreateLogger();

        // Replace default logging with Serilog
        services.AddLogging(builder =>
        {
            builder.ClearProviders();
            builder.AddSerilog(dispose: true);
        });

        return services;
    }

    /// <summary>
    /// Adds MetricsApp Serilog sink with simple configuration
    /// </summary>
    public static IServiceCollection AddMetricsAppLogging(
        this IServiceCollection services,
        string apiBaseUrl,
        string serviceName,
        string serviceVersion = "1.0.0",
        string environment = "development",
        string targetEndpoint = "telemetry")
    {
        if (services == null) throw new ArgumentNullException(nameof(services));
        if (string.IsNullOrWhiteSpace(apiBaseUrl)) throw new ArgumentException("API base URL is required", nameof(apiBaseUrl));
        if (string.IsNullOrWhiteSpace(serviceName)) throw new ArgumentException("Service name is required", nameof(serviceName));

        var config = new MetricsAppSinkConfiguration
        {
            ApiBaseUrl = apiBaseUrl,
            ServiceName = serviceName,
            ServiceVersion = serviceVersion,
            Environment = environment,
            TargetEndpoint = targetEndpoint
        };

        // Register the configuration
        services.AddSingleton(config);

        // Configure Serilog
        Log.Logger = new LoggerConfiguration()
            .WriteTo.Console()
            .WriteTo.MetricsApp(config)
            .CreateLogger();

        // Replace default logging with Serilog
        services.AddLogging(builder =>
        {
            builder.ClearProviders();
            builder.AddSerilog(dispose: true);
        });

        return services;
    }

    /// <summary>
    /// Adds MetricsApp Serilog sink with advanced configuration
    /// </summary>
    public static IServiceCollection AddMetricsAppLogging(
        this IServiceCollection services,
        Action<MetricsAppSinkConfiguration> configureOptions)
    {
        if (services == null) throw new ArgumentNullException(nameof(services));
        if (configureOptions == null) throw new ArgumentNullException(nameof(configureOptions));

        var config = new MetricsAppSinkConfiguration();
        configureOptions(config);

        // Register the configuration
        services.AddSingleton(config);

        // Configure Serilog
        Log.Logger = new LoggerConfiguration()
            .WriteTo.Console()
            .WriteTo.MetricsApp(config)
            .CreateLogger();

        // Replace default logging with Serilog
        services.AddLogging(builder =>
        {
            builder.ClearProviders();
            builder.AddSerilog(dispose: true);
        });

        return services;
    }

    /// <summary>
    /// Adds only the MetricsApp sink configuration without replacing the logging provider
    /// </summary>
    public static IServiceCollection AddMetricsAppSinkConfiguration(
        this IServiceCollection services,
        IConfiguration configuration,
        string configSection = "MetricsApp")
    {
        if (services == null) throw new ArgumentNullException(nameof(services));
        if (configuration == null) throw new ArgumentNullException(nameof(configuration));

        services.Configure<MetricsAppSinkConfiguration>(configuration.GetSection(configSection));
        
        // Register a configured instance
        var config = new MetricsAppSinkConfiguration();
        configuration.GetSection(configSection).Bind(config);
        services.AddSingleton(config);

        return services;
    }
}
