using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Serilog;

namespace MetricsApp.Serilog.OpenTelemetry;

/// <summary>
/// Main client for sending logs, metrics, and traces to OpenTelemetry backend
/// </summary>
public class OpenTelemetryTelemetryClient : IDisposable
{
    private readonly OpenTelemetryConfiguration _config;
    private readonly MetricsReporter _metricsReporter;
    private readonly TracingHelper _tracingHelper;
    private readonly ILogger _logger;
    private volatile bool _disposed;

    public OpenTelemetryTelemetryClient(OpenTelemetryConfiguration config, ILogger? logger = null)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        
        // Create internal logger if not provided
        _logger = logger ?? new LoggerConfiguration()
            .WriteTo.OpenTelemetry(_config)
            .CreateLogger();

        _metricsReporter = new MetricsReporter(_config);
        _tracingHelper = new TracingHelper(_config);
    }

    #region Logging Methods

    /// <summary>
    /// Logs an information message
    /// </summary>
    public void LogInformation(string message, params object[] args)
    {
        _logger.Information(message, args);
    }

    /// <summary>
    /// Logs a warning message
    /// </summary>
    public void LogWarning(string message, params object[] args)
    {
        _logger.Warning(message, args);
    }

    /// <summary>
    /// Logs an error message
    /// </summary>
    public void LogError(string message, params object[] args)
    {
        _logger.Error(message, args);
    }

    /// <summary>
    /// Logs an error with exception
    /// </summary>
    public void LogError(Exception exception, string message, params object[] args)
    {
        _logger.Error(exception, message, args);
    }

    /// <summary>
    /// Logs a debug message
    /// </summary>
    public void LogDebug(string message, params object[] args)
    {
        _logger.Debug(message, args);
    }

    /// <summary>
    /// Logs a verbose message
    /// </summary>
    public void LogVerbose(string message, params object[] args)
    {
        _logger.Verbose(message, args);
    }

    /// <summary>
    /// Logs a fatal message
    /// </summary>
    public void LogFatal(string message, params object[] args)
    {
        _logger.Fatal(message, args);
    }

    /// <summary>
    /// Logs a fatal message with exception
    /// </summary>
    public void LogFatal(Exception exception, string message, params object[] args)
    {
        _logger.Fatal(exception, message, args);
    }

    #endregion

    #region Metrics Methods

    /// <summary>
    /// Records a counter metric
    /// </summary>
    public void RecordCounter(string name, double value = 1.0, Dictionary<string, string>? tags = null, string? description = null, string? unit = null)
    {
        _metricsReporter.RecordCounter(name, value, tags, description, unit);
    }

    /// <summary>
    /// Records a gauge metric
    /// </summary>
    public void RecordGauge(string name, double value, Dictionary<string, string>? tags = null, string? description = null, string? unit = null)
    {
        _metricsReporter.RecordGauge(name, value, tags, description, unit);
    }

    /// <summary>
    /// Records a histogram metric
    /// </summary>
    public void RecordHistogram(string name, double value, Dictionary<string, string>? tags = null, string? description = null, string? unit = null)
    {
        _metricsReporter.RecordHistogram(name, value, tags, description, unit);
    }

    /// <summary>
    /// Times an operation and records it as a histogram
    /// </summary>
    public T TimeOperation<T>(string operationName, Func<T> operation, Dictionary<string, string>? tags = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var result = operation();
            stopwatch.Stop();
            
            var finalTags = new Dictionary<string, string>(tags ?? new Dictionary<string, string>())
            {
                ["status"] = "success"
            };
            
            RecordHistogram($"{operationName}.duration", stopwatch.Elapsed.TotalMilliseconds, finalTags, 
                $"Duration of {operationName} operation", "milliseconds");
            
            return result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            
            var finalTags = new Dictionary<string, string>(tags ?? new Dictionary<string, string>())
            {
                ["status"] = "error",
                ["error.type"] = ex.GetType().Name
            };
            
            RecordHistogram($"{operationName}.duration", stopwatch.Elapsed.TotalMilliseconds, finalTags, 
                $"Duration of {operationName} operation", "milliseconds");
            
            throw;
        }
    }

    /// <summary>
    /// Times an async operation and records it as a histogram
    /// </summary>
    public async Task<T> TimeOperationAsync<T>(string operationName, Func<Task<T>> operation, Dictionary<string, string>? tags = null)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var result = await operation();
            stopwatch.Stop();
            
            var finalTags = new Dictionary<string, string>(tags ?? new Dictionary<string, string>())
            {
                ["status"] = "success"
            };
            
            RecordHistogram($"{operationName}.duration", stopwatch.Elapsed.TotalMilliseconds, finalTags, 
                $"Duration of {operationName} operation", "milliseconds");
            
            return result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            
            var finalTags = new Dictionary<string, string>(tags ?? new Dictionary<string, string>())
            {
                ["status"] = "error",
                ["error.type"] = ex.GetType().Name
            };
            
            RecordHistogram($"{operationName}.duration", stopwatch.Elapsed.TotalMilliseconds, finalTags, 
                $"Duration of {operationName} operation", "milliseconds");
            
            throw;
        }
    }

    #endregion

    #region Tracing Methods

    /// <summary>
    /// Traces an operation
    /// </summary>
    public T TraceOperation<T>(string operationName, Func<System.Diagnostics.Activity?, T> operation, System.Diagnostics.ActivityKind kind = System.Diagnostics.ActivityKind.Internal)
    {
        return _tracingHelper.TraceOperation(operationName, operation, kind);
    }

    /// <summary>
    /// Traces an async operation
    /// </summary>
    public async Task<T> TraceOperationAsync<T>(string operationName, Func<System.Diagnostics.Activity?, Task<T>> operation, System.Diagnostics.ActivityKind kind = System.Diagnostics.ActivityKind.Internal)
    {
        return await _tracingHelper.TraceOperationAsync(operationName, operation, kind);
    }

    /// <summary>
    /// Traces an async operation (no return value)
    /// </summary>
    public async Task TraceOperationAsync(string operationName, Func<System.Diagnostics.Activity?, Task> operation, System.Diagnostics.ActivityKind kind = System.Diagnostics.ActivityKind.Internal)
    {
        await _tracingHelper.TraceOperationAsync(operationName, operation, kind);
    }

    /// <summary>
    /// Starts a new activity/span
    /// </summary>
    public System.Diagnostics.Activity? StartActivity(string name, System.Diagnostics.ActivityKind kind = System.Diagnostics.ActivityKind.Internal)
    {
        return _tracingHelper.StartActivity(name, kind);
    }

    #endregion

    #region Combined Operations

    /// <summary>
    /// Traces and times an operation, recording both span and duration metric
    /// </summary>
    public T TraceAndTimeOperation<T>(string operationName, Func<System.Diagnostics.Activity?, T> operation, 
        Dictionary<string, string>? tags = null, System.Diagnostics.ActivityKind kind = System.Diagnostics.ActivityKind.Internal)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        return _tracingHelper.TraceOperation(operationName, activity =>
        {
            // Add tags to the activity
            if (tags != null)
            {
                foreach (var tag in tags)
                {
                    activity?.SetTag(tag.Key, tag.Value);
                }
            }

            try
            {
                var result = operation(activity);
                stopwatch.Stop();
                
                var finalTags = new Dictionary<string, string>(tags ?? new Dictionary<string, string>())
                {
                    ["status"] = "success"
                };
                
                RecordHistogram($"{operationName}.duration", stopwatch.Elapsed.TotalMilliseconds, finalTags, 
                    $"Duration of {operationName} operation", "milliseconds");
                
                return result;
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                
                var finalTags = new Dictionary<string, string>(tags ?? new Dictionary<string, string>())
                {
                    ["status"] = "error",
                    ["error.type"] = ex.GetType().Name
                };
                
                RecordHistogram($"{operationName}.duration", stopwatch.Elapsed.TotalMilliseconds, finalTags, 
                    $"Duration of {operationName} operation", "milliseconds");
                
                throw;
            }
        }, kind);
    }

    /// <summary>
    /// Traces and times an async operation, recording both span and duration metric
    /// </summary>
    public async Task<T> TraceAndTimeOperationAsync<T>(string operationName, Func<System.Diagnostics.Activity?, Task<T>> operation, 
        Dictionary<string, string>? tags = null, System.Diagnostics.ActivityKind kind = System.Diagnostics.ActivityKind.Internal)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        return await _tracingHelper.TraceOperationAsync(operationName, async activity =>
        {
            // Add tags to the activity
            if (tags != null)
            {
                foreach (var tag in tags)
                {
                    activity?.SetTag(tag.Key, tag.Value);
                }
            }

            try
            {
                var result = await operation(activity);
                stopwatch.Stop();
                
                var finalTags = new Dictionary<string, string>(tags ?? new Dictionary<string, string>())
                {
                    ["status"] = "success"
                };
                
                RecordHistogram($"{operationName}.duration", stopwatch.Elapsed.TotalMilliseconds, finalTags, 
                    $"Duration of {operationName} operation", "milliseconds");
                
                return result;
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                
                var finalTags = new Dictionary<string, string>(tags ?? new Dictionary<string, string>())
                {
                    ["status"] = "error",
                    ["error.type"] = ex.GetType().Name
                };
                
                RecordHistogram($"{operationName}.duration", stopwatch.Elapsed.TotalMilliseconds, finalTags, 
                    $"Duration of {operationName} operation", "milliseconds");
                
                throw;
            }
        }, kind);
    }

    #endregion

    #region Utility Methods

    /// <summary>
    /// Flushes all pending telemetry data
    /// </summary>
    public async Task FlushAsync()
    {
        await _metricsReporter.FlushAsync();
        // Note: Traces are sent immediately, logs are handled by Serilog sink
    }

    /// <summary>
    /// Gets the underlying Serilog logger
    /// </summary>
    public ILogger GetLogger() => _logger;

    /// <summary>
    /// Gets the configuration
    /// </summary>
    public OpenTelemetryConfiguration GetConfiguration() => _config;

    #endregion

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;

        // Flush before disposing
        FlushAsync().Wait(TimeSpan.FromSeconds(5));

        _metricsReporter?.Dispose();
        _tracingHelper?.Dispose();
        (_logger as IDisposable)?.Dispose();
    }
}

/// <summary>
/// Extensions for dependency injection
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Adds OpenTelemetry telemetry client to the service collection
    /// </summary>
    public static IServiceCollection AddOpenTelemetryClient(this IServiceCollection services, 
        OpenTelemetryConfiguration configuration)
    {
        services.AddSingleton(configuration);
        services.AddSingleton<OpenTelemetryTelemetryClient>();
        return services;
    }

    /// <summary>
    /// Adds OpenTelemetry telemetry client to the service collection with configuration from appsettings
    /// </summary>
    public static IServiceCollection AddOpenTelemetryClient(this IServiceCollection services, 
        IConfiguration configuration, string configSection = "OpenTelemetry")
    {
        var config = new OpenTelemetryConfiguration();
        configuration.GetSection(configSection).Bind(config);
        
        return services.AddOpenTelemetryClient(config);
    }

    /// <summary>
    /// Adds OpenTelemetry telemetry client to the service collection with configuration action
    /// </summary>
    public static IServiceCollection AddOpenTelemetryClient(this IServiceCollection services,
        Action<OpenTelemetryConfiguration> configureAction)
    {
        var config = new OpenTelemetryConfiguration();
        configureAction(config);
        
        return services.AddOpenTelemetryClient(config);
    }
}

