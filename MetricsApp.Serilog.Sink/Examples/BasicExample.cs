using Serilog;
using MetricsApp.Serilog.Sink.Extensions;

namespace MetricsApp.Serilog.Sink.Examples;

/// <summary>
/// Basic example showing how to use the MetricsApp Serilog sink in a console application
/// </summary>
public class BasicExample
{
    public static async Task RunExample()
    {
        // Configure Serilog with MetricsApp sink
        Log.Logger = new LoggerConfiguration()
            .WriteTo.Console()
            .WriteTo.MetricsAppTelemetry(
                apiBaseUrl: "https://localhost:7201",
                serviceName: "basic-example",
                serviceVersion: "1.0.0",
                environment: "development")
            .CreateLogger();

        // Basic logging examples
        Log.Information("Application starting up");
        
        // Structured logging
        var userId = 12345;
        var action = "Login";
        Log.Information("User {UserId} performed {Action}", userId, action);

        // Warning with context
        Log.Warning("High memory usage detected: {MemoryUsage}MB", 1024);

        // Error with exception
        try
        {
            throw new InvalidOperationException("Something went wrong!");
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to process request for user {UserId}", userId);
        }

        // Contextual logging
        Log.ForContext("OrderId", "ORD-001")
           .ForContext("CustomerId", "CUST-123")
           .Information("Order processing completed successfully");

        // Allow time for logs to be sent
        await Task.Delay(2000);
        
        Log.Information("Application shutting down");
        
        // Dispose logger to flush remaining logs
        Log.CloseAndFlush();
    }
}

/// <summary>
/// Example targeting different MetricsApp endpoints
/// </summary>
public class MultiEndpointExample
{
    public static void ConfigureMultipleEndpoints()
    {
        // Example 1: Telemetry endpoint
        var telemetryLogger = new LoggerConfiguration()
            .WriteTo.MetricsAppTelemetry(
                "https://localhost:7201", 
                "my-service-telemetry")
            .CreateLogger();

        // Example 2: OpenTelemetry endpoint with OTLP format
        var otelLogger = new LoggerConfiguration()
            .WriteTo.MetricsAppOtel(
                "https://localhost:7201", 
                "my-service-otel",
                useOtlpFormat: true)
            .CreateLogger();

        // Example 3: Jaeger endpoint
        var jaegerLogger = new LoggerConfiguration()
            .WriteTo.MetricsAppJaeger(
                "https://localhost:7201", 
                "my-service-jaeger")
            .CreateLogger();

        // Example 4: Multiple sinks in one logger
        var multiLogger = new LoggerConfiguration()
            .WriteTo.Console()
            .WriteTo.MetricsAppTelemetry("https://localhost:7201", "multi-service")
            .WriteTo.MetricsAppOtel("https://otel.company.com", "multi-service")
            .CreateLogger();

        // Use the loggers...
        telemetryLogger.Information("Sent to Telemetry API");
        otelLogger.Information("Sent to OpenTelemetry API");
        jaegerLogger.Information("Sent to Jaeger API");
        multiLogger.Information("Sent to multiple endpoints");
    }
}

/// <summary>
/// Advanced configuration example
/// </summary>
public class AdvancedConfigurationExample
{
    public static void ConfigureAdvanced()
    {
        Log.Logger = new LoggerConfiguration()
            .WriteTo.Console()
            .WriteTo.MetricsAppAdvanced(config =>
            {
                config.ApiBaseUrl = "https://localhost:7201";
                config.ServiceName = "advanced-service";
                config.ServiceVersion = "2.1.0";
                config.Environment = "production";
                config.TargetEndpoint = "telemetry";
                
                // Performance tuning
                config.BatchSize = 50;
                config.FlushIntervalSeconds = 3;
                config.TimeoutSeconds = 45;
                
                // Custom headers for authentication
                config.CustomHeaders["Authorization"] = "Bearer YOUR_TOKEN_HERE";
                config.CustomHeaders["X-Tenant-ID"] = "tenant-123";
                
                // Include all structured data
                config.IncludeStructuredProperties = true;
                config.IncludeExceptionDetails = true;
                config.IncludeScopeInformation = true;
                
                // Debugging
                config.LogSinkFailures = true;
                config.MaxRetries = 5;
            })
            .CreateLogger();
    }
}

/// <summary>
/// Example with trace correlation
/// </summary>
public class TracingExample
{
    public static async Task RunWithTracing()
    {
        Log.Logger = new LoggerConfiguration()
            .WriteTo.Console()
            .WriteTo.MetricsAppOtel(
                "https://localhost:7201",
                "tracing-example",
                useOtlpFormat: true)
            .CreateLogger();

        // Simulate distributed tracing context
        using var activity = new System.Diagnostics.Activity("ProcessOrder");
        activity.SetTag("order.id", "ORD-12345");
        activity.SetTag("customer.id", "CUST-67890");
        activity.Start();

        Log.Information("Starting order processing for {OrderId}", "ORD-12345");
        
        // Simulate some work
        await Task.Delay(100);
        
        Log.Information("Order validation completed");
        
        // Simulate error
        try
        {
            throw new ApplicationException("Payment service unavailable");
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Failed to process payment for order {OrderId}", "ORD-12345");
        }
        
        Log.Information("Order processing completed");
        
        Log.CloseAndFlush();
    }
}
