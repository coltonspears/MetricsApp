using Serilog;
using Serilog.Configuration;
using Microsoft.Extensions.Configuration;

namespace MetricsApp.Serilog.OpenTelemetry;

public static class SerilogConfigurationExtensions
{
    /// <summary>
    /// Adds the OpenTelemetry log sink to the Serilog configuration
    /// </summary>
    public static LoggerConfiguration OpenTelemetry(
        this LoggerSinkConfiguration sinkConfiguration,
        OpenTelemetryConfiguration configuration)
    {
        if (sinkConfiguration == null) throw new ArgumentNullException(nameof(sinkConfiguration));
        if (configuration == null) throw new ArgumentNullException(nameof(configuration));

        return sinkConfiguration.Sink(new OpenTelemetryLogSink(configuration));
    }

    /// <summary>
    /// Adds the OpenTelemetry log sink with configuration from appsettings
    /// </summary>
    public static LoggerConfiguration OpenTelemetry(
        this LoggerSinkConfiguration sinkConfiguration,
        IConfiguration configuration,
        string configSection = "OpenTelemetry")
    {
        if (sinkConfiguration == null) throw new ArgumentNullException(nameof(sinkConfiguration));
        if (configuration == null) throw new ArgumentNullException(nameof(configuration));

        var config = new OpenTelemetryConfiguration();
        configuration.GetSection(configSection).Bind(config);

        return sinkConfiguration.Sink(new OpenTelemetryLogSink(config));
    }

    /// <summary>
    /// Adds the OpenTelemetry log sink with simple configuration
    /// </summary>
    public static LoggerConfiguration OpenTelemetry(
        this LoggerSinkConfiguration sinkConfiguration,
        string endpoint,
        string serviceName,
        string? serviceVersion = null,
        string? environment = null)
    {
        if (sinkConfiguration == null) throw new ArgumentNullException(nameof(sinkConfiguration));
        if (string.IsNullOrEmpty(endpoint)) throw new ArgumentNullException(nameof(endpoint));
        if (string.IsNullOrEmpty(serviceName)) throw new ArgumentNullException(nameof(serviceName));

        var config = new OpenTelemetryConfiguration
        {
            Endpoint = endpoint,
            ServiceName = serviceName,
            ServiceVersion = serviceVersion ?? "1.0.0",
            Environment = environment ?? "development"
        };

        return sinkConfiguration.Sink(new OpenTelemetryLogSink(config));
    }

    /// <summary>
    /// Adds the OpenTelemetry log sink with configuration action
    /// </summary>
    public static LoggerConfiguration OpenTelemetry(
        this LoggerSinkConfiguration sinkConfiguration,
        Action<OpenTelemetryConfiguration> configureAction)
    {
        if (sinkConfiguration == null) throw new ArgumentNullException(nameof(sinkConfiguration));
        if (configureAction == null) throw new ArgumentNullException(nameof(configureAction));

        var config = new OpenTelemetryConfiguration();
        configureAction(config);

        return sinkConfiguration.Sink(new OpenTelemetryLogSink(config));
    }
}

