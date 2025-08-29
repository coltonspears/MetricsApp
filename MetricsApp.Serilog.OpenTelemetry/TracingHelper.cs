using System.Diagnostics;
using System.Text.Json;
using System.Text;
using MetricsApp.Serilog.OpenTelemetry.Helpers;

namespace MetricsApp.Serilog.OpenTelemetry;

public class TracingHelper : IDisposable
{
    private readonly OpenTelemetryConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly ActivitySource _activitySource;
    private volatile bool _disposed;

    public TracingHelper(OpenTelemetryConfiguration config)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _httpClient = new HttpClient { Timeout = _config.HttpTimeout };
        _activitySource = new ActivitySource(_config.ServiceName);

        // Add custom headers
        foreach (var header in _config.Headers)
        {
            _httpClient.DefaultRequestHeaders.Add(header.Key, header.Value);
        }
    }

    /// <summary>
    /// Starts a new activity/span with the given name
    /// </summary>
    public Activity? StartActivity(string name, ActivityKind kind = ActivityKind.Internal, string? parentId = null)
    {
        if (_disposed || !_config.EnableTraces)
            return null;

        var activity = _activitySource.StartActivity(name, kind, parentId);
        
        // Add default tags
        activity?.SetTag("service.name", _config.ServiceName);
        activity?.SetTag("service.version", _config.ServiceVersion);
        
        if (!string.IsNullOrEmpty(_config.Environment))
            activity?.SetTag("deployment.environment", _config.Environment);

        return activity;
    }

    /// <summary>
    /// Creates and executes an activity around the given action
    /// </summary>
    public T TraceOperation<T>(string operationName, Func<Activity?, T> operation, ActivityKind kind = ActivityKind.Internal)
    {
        if (_disposed || !_config.EnableTraces)
            return operation(null);

        using var activity = StartActivity(operationName, kind);
        
        try
        {
            var result = operation(activity);
            activity?.SetStatus(ActivityStatusCode.Ok);
            return result;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag("exception.type", ex.GetType().FullName);
            activity?.SetTag("exception.message", ex.Message);
            if (ex.StackTrace != null)
                activity?.SetTag("exception.stacktrace", ex.StackTrace);
            throw;
        }
    }

    /// <summary>
    /// Creates and executes an async activity around the given action
    /// </summary>
    public async Task<T> TraceOperationAsync<T>(string operationName, Func<Activity?, Task<T>> operation, ActivityKind kind = ActivityKind.Internal)
    {
        if (_disposed || !_config.EnableTraces)
            return await operation(null);

        using var activity = StartActivity(operationName, kind);
        
        try
        {
            var result = await operation(activity);
            activity?.SetStatus(ActivityStatusCode.Ok);
            return result;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag("exception.type", ex.GetType().FullName);
            activity?.SetTag("exception.message", ex.Message);
            if (ex.StackTrace != null)
                activity?.SetTag("exception.stacktrace", ex.StackTrace);
            throw;
        }
    }

    /// <summary>
    /// Creates and executes an async activity around the given action (no return value)
    /// </summary>
    public async Task TraceOperationAsync(string operationName, Func<Activity?, Task> operation, ActivityKind kind = ActivityKind.Internal)
    {
        if (_disposed || !_config.EnableTraces)
        {
            await operation(null);
            return;
        }

        using var activity = StartActivity(operationName, kind);
        
        try
        {
            await operation(activity);
            activity?.SetStatus(ActivityStatusCode.Ok);
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.SetTag("exception.type", ex.GetType().FullName);
            activity?.SetTag("exception.message", ex.Message);
            if (ex.StackTrace != null)
                activity?.SetTag("exception.stacktrace", ex.StackTrace);
            throw;
        }
    }

    /// <summary>
    /// Manually sends a completed span to the backend
    /// </summary>
    public async Task SendSpanAsync(string traceId, string spanId, string name, DateTimeOffset startTime, DateTimeOffset endTime, 
        Dictionary<string, string>? tags = null, ActivityKind kind = ActivityKind.Internal, ActivityStatusCode status = ActivityStatusCode.Ok, string? statusMessage = null)
    {
        if (_disposed || !_config.EnableTraces)
            return;

        var span = new
        {
            traceId = traceId,
            spanId = spanId,
            name = name,
            kind = GetSpanKind(kind),
            startTimeUnixNano = startTime.ToUnixTimeNanoseconds().ToString(),
            endTimeUnixNano = endTime.ToUnixTimeNanoseconds().ToString(),
            attributes = (tags ?? new Dictionary<string, string>()).Select(tag => new
            {
                key = tag.Key,
                value = new { stringValue = tag.Value }
            }).ToArray(),
            status = new
            {
                code = (int)status,
                message = statusMessage ?? ""
            }
        };

        var payload = CreateOtlpTracesPayload(new[] { span });
        await SendTracesAsync(payload);
    }

    private object CreateOtlpTracesPayload(object[] spans)
    {
        return new
        {
            resourceSpans = new[]
            {
                new
                {
                    resource = new
                    {
                        attributes = GetResourceAttributesArray()
                    },
                    scopeSpans = new[]
                    {
                        new
                        {
                            scope = new
                            {
                                name = _config.ServiceName + "-traces",
                                version = _config.ServiceVersion
                            },
                            spans = spans
                        }
                    }
                }
            }
        };
    }

    private async Task SendTracesAsync(object payload)
    {
        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.PostAsync($"{_config.Endpoint}/v1/traces", content);

            if (!response.IsSuccessStatusCode && _config.LogFailures)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Failed to send traces to OpenTelemetry backend: {response.StatusCode} - {responseContent}");
            }
        }
        catch (Exception ex)
        {
            if (_config.LogFailures)
            {
                Console.WriteLine($"Network error sending traces to OpenTelemetry backend: {ex.Message}");
            }
        }
    }

    private object[] GetResourceAttributesArray()
    {
        var attributes = new List<object>
        {
            new { key = "service.name", value = new { stringValue = _config.ServiceName } },
            new { key = "service.version", value = new { stringValue = _config.ServiceVersion } }
        };

        if (!string.IsNullOrEmpty(_config.Environment))
        {
            attributes.Add(new { key = "deployment.environment", value = new { stringValue = _config.Environment } });
        }

        if (!string.IsNullOrEmpty(_config.HostName))
        {
            attributes.Add(new { key = "host.name", value = new { stringValue = _config.HostName } });
        }

        foreach (var attr in _config.ResourceAttributes)
        {
            attributes.Add(new { key = attr.Key, value = new { stringValue = attr.Value } });
        }

        return attributes.ToArray();
    }

    private static string GetSpanKind(ActivityKind kind)
    {
        return kind switch
        {
            ActivityKind.Internal => "SPAN_KIND_INTERNAL",
            ActivityKind.Server => "SPAN_KIND_SERVER",
            ActivityKind.Client => "SPAN_KIND_CLIENT",
            ActivityKind.Producer => "SPAN_KIND_PRODUCER",
            ActivityKind.Consumer => "SPAN_KIND_CONSUMER",
            _ => "SPAN_KIND_UNSPECIFIED"
        };
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;
        _activitySource?.Dispose();
        _httpClient?.Dispose();
    }
}
