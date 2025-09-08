using Serilog;
using Serilog.Configuration;
using Microsoft.Extensions.Configuration;
using MetricsApp.Serilog.Sink.Configuration;

namespace MetricsApp.Serilog.Sink.Extensions;

/// <summary>
/// Extensions for configuring the MetricsApp Serilog sink
/// </summary>
public static class SerilogConfigurationExtensions
{
    /// <summary>
    /// Adds the MetricsApp sink to the Serilog configuration with a configuration object
    /// </summary>
    public static LoggerConfiguration MetricsApp(
        this LoggerSinkConfiguration sinkConfiguration,
        MetricsAppSinkConfiguration configuration)
    {
        if (sinkConfiguration == null) throw new ArgumentNullException(nameof(sinkConfiguration));
        if (configuration == null) throw new ArgumentNullException(nameof(configuration));

        return sinkConfiguration.Sink(new MetricsAppSink(configuration));
    }

    /// <summary>
    /// Adds the MetricsApp sink with configuration from appsettings
    /// </summary>
    public static LoggerConfiguration MetricsApp(
        this LoggerSinkConfiguration sinkConfiguration,
        IConfiguration configuration,
        string configSection = "MetricsApp")
    {
        if (sinkConfiguration == null) throw new ArgumentNullException(nameof(sinkConfiguration));
        if (configuration == null) throw new ArgumentNullException(nameof(configuration));

        var config = new MetricsAppSinkConfiguration();
        configuration.GetSection(configSection).Bind(config);

        return sinkConfiguration.Sink(new MetricsAppSink(config));
    }

    /// <summary>
    /// Adds the MetricsApp sink with simple configuration for quick setup
    /// </summary>
    public static LoggerConfiguration MetricsApp(
        this LoggerSinkConfiguration sinkConfiguration,
        string apiBaseUrl,
        string serviceName,
        string serviceVersion = "1.0.0",
        string environment = "development",
        string targetEndpoint = "telemetry",
        int batchSize = 100,
        int flushIntervalSeconds = 5)
    {
        if (sinkConfiguration == null) throw new ArgumentNullException(nameof(sinkConfiguration));
        if (string.IsNullOrWhiteSpace(apiBaseUrl)) throw new ArgumentException("API base URL is required", nameof(apiBaseUrl));
        if (string.IsNullOrWhiteSpace(serviceName)) throw new ArgumentException("Service name is required", nameof(serviceName));

        var config = new MetricsAppSinkConfiguration
        {
            ApiBaseUrl = apiBaseUrl,
            ServiceName = serviceName,
            ServiceVersion = serviceVersion,
            Environment = environment,
            TargetEndpoint = targetEndpoint,
            BatchSize = batchSize,
            FlushIntervalSeconds = flushIntervalSeconds
        };

        return sinkConfiguration.Sink(new MetricsAppSink(config));
    }

    /// <summary>
    /// Adds the MetricsApp sink targeting the Telemetry API endpoint
    /// </summary>
    public static LoggerConfiguration MetricsAppTelemetry(
        this LoggerSinkConfiguration sinkConfiguration,
        string apiBaseUrl,
        string serviceName,
        string serviceVersion = "1.0.0",
        string environment = "development",
        int batchSize = 100,
        int flushIntervalSeconds = 5)
    {
        return sinkConfiguration.MetricsApp(
            apiBaseUrl, serviceName, serviceVersion, environment, 
            "telemetry", batchSize, flushIntervalSeconds);
    }

    /// <summary>
    /// Adds the MetricsApp sink targeting the OpenTelemetry (OTLP) endpoint
    /// </summary>
    public static LoggerConfiguration MetricsAppOtel(
        this LoggerSinkConfiguration sinkConfiguration,
        string apiBaseUrl,
        string serviceName,
        string serviceVersion = "1.0.0",
        string environment = "development",
        bool useOtlpFormat = true,
        int batchSize = 100,
        int flushIntervalSeconds = 5)
    {
        var config = new MetricsAppSinkConfiguration
        {
            ApiBaseUrl = apiBaseUrl,
            ServiceName = serviceName,
            ServiceVersion = serviceVersion,
            Environment = environment,
            TargetEndpoint = "otel",
            UseOtlpFormat = useOtlpFormat,
            BatchSize = batchSize,
            FlushIntervalSeconds = flushIntervalSeconds
        };

        return sinkConfiguration.Sink(new MetricsAppSink(config));
    }

    /// <summary>
    /// Adds the MetricsApp sink targeting the Jaeger endpoint for trace-like logs
    /// </summary>
    public static LoggerConfiguration MetricsAppJaeger(
        this LoggerSinkConfiguration sinkConfiguration,
        string apiBaseUrl,
        string serviceName,
        string serviceVersion = "1.0.0",
        string environment = "development",
        int batchSize = 100,
        int flushIntervalSeconds = 5)
    {
        return sinkConfiguration.MetricsApp(
            apiBaseUrl, serviceName, serviceVersion, environment, 
            "jaeger", batchSize, flushIntervalSeconds);
    }

    /// <summary>
    /// Adds the MetricsApp sink with advanced configuration options
    /// </summary>
    public static LoggerConfiguration MetricsAppAdvanced(
        this LoggerSinkConfiguration sinkConfiguration,
        Action<MetricsAppSinkConfiguration> configureOptions)
    {
        if (sinkConfiguration == null) throw new ArgumentNullException(nameof(sinkConfiguration));
        if (configureOptions == null) throw new ArgumentNullException(nameof(configureOptions));

        var config = new MetricsAppSinkConfiguration();
        configureOptions(config);

        return sinkConfiguration.Sink(new MetricsAppSink(config));
    }
}
