using Microsoft.Extensions.DependencyInjection;
using MetricsApp.Abstractions.Parsers;

namespace MetricsApp.Parser.OpenTelemetry.Extensions;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds OpenTelemetry parsers to the dependency injection container.
    /// This registers parsers for OTLP metrics, logs, and traces.
    /// </summary>
    /// <param name="services">The service collection to add parsers to.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddOpenTelemetryParsers(this IServiceCollection services)
    {
        services.AddSingleton<IDataParser, OtlpMetricsParser>();
        services.AddSingleton<IDataParser, OtlpLogsParser>();
        services.AddSingleton<IDataParser, OtlpTracesParser>();
        
        return services;
    }
}
