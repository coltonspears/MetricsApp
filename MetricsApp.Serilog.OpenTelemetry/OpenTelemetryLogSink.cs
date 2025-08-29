using Serilog.Core;
using Serilog.Events;
using System.Text.Json;
using System.Text;
using System.Collections.Concurrent;
using MetricsApp.Serilog.OpenTelemetry.Helpers;

namespace MetricsApp.Serilog.OpenTelemetry;

public class OpenTelemetryLogSink : ILogEventSink, IDisposable
{
    private readonly OpenTelemetryConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly ConcurrentQueue<LogEvent> _logQueue;
    private readonly Timer _flushTimer;
    private readonly SemaphoreSlim _flushSemaphore;
    private volatile bool _disposed;

    public OpenTelemetryLogSink(OpenTelemetryConfiguration config)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _httpClient = new HttpClient();
        _logQueue = new ConcurrentQueue<LogEvent>();
        _flushSemaphore = new SemaphoreSlim(1, 1);

        // Set up periodic flushing
        _flushTimer = new Timer(
            async _ => await FlushAsync(),
            null,
            TimeSpan.FromSeconds(_config.FlushIntervalSeconds),
            TimeSpan.FromSeconds(_config.FlushIntervalSeconds));
    }

    public void Emit(LogEvent logEvent)
    {
        if (_disposed || logEvent == null)
            return;

        _logQueue.Enqueue(logEvent);

        // Flush immediately if we've reached the batch size
        if (_logQueue.Count >= _config.BatchSize)
        {
            _ = Task.Run(() => FlushAsync());
        }
    }

    private async Task FlushAsync()
    {
        if (_disposed || !await _flushSemaphore.WaitAsync(100))
            return;

        try
        {
            var events = new List<LogEvent>();
            
            // Dequeue up to batch size events
            while (events.Count < _config.BatchSize && _logQueue.TryDequeue(out var logEvent))
            {
                events.Add(logEvent);
            }

            if (events.Count == 0)
                return;

            var otlpPayload = CreateOtlpLogsPayload(events);
            await SendToBackendAsync(otlpPayload);
        }
        catch (Exception ex)
        {
            // Log to console or internal logger - avoid infinite loops
            Console.WriteLine($"OpenTelemetryLogSink error: {ex.Message}");
        }
        finally
        {
            _flushSemaphore.Release();
        }
    }

    private object CreateOtlpLogsPayload(List<LogEvent> events)
    {
        var logRecords = events.Select(logEvent => new
        {
            timeUnixNano = ((DateTimeOffset)logEvent.Timestamp).ToUnixTimeNanoseconds().ToString(),
            severityNumber = GetSeverityNumber(logEvent.Level),
            severityText = logEvent.Level.ToString(),
            body = new { stringValue = logEvent.RenderMessage() },
            attributes = ExtractAttributes(logEvent),
            resource = GetResourceAttributes(),
            traceId = ExtractTraceId(logEvent),
            spanId = ExtractSpanId(logEvent)
        }).ToArray();

        return new
        {
            resourceLogs = new[]
            {
                new
                {
                    resource = new
                    {
                        attributes = GetResourceAttributesArray()
                    },
                    scopeLogs = new[]
                    {
                        new
                        {
                            scope = new
                            {
                                name = _config.ServiceName,
                                version = _config.ServiceVersion
                            },
                            logRecords = logRecords
                        }
                    }
                }
            }
        };
    }

    private async Task SendToBackendAsync(object payload)
    {
        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var content = new StringContent(json, Encoding.UTF8, "application/json");
        
        try
        {
            var response = await _httpClient.PostAsync($"{_config.Endpoint}/v1/logs", content);
            
            if (!response.IsSuccessStatusCode && _config.LogFailures)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Failed to send logs to OpenTelemetry backend: {response.StatusCode} - {responseContent}");
            }
        }
        catch (Exception ex)
        {
            if (_config.LogFailures)
            {
                Console.WriteLine($"Network error sending logs to OpenTelemetry backend: {ex.Message}");
            }
        }
    }

    private static int GetSeverityNumber(LogEventLevel level)
    {
        return level switch
        {
            LogEventLevel.Verbose => 1,
            LogEventLevel.Debug => 5,
            LogEventLevel.Information => 9,
            LogEventLevel.Warning => 13,
            LogEventLevel.Error => 17,
            LogEventLevel.Fatal => 21,
            _ => 9
        };
    }

    private object[] ExtractAttributes(LogEvent logEvent)
    {
        var attributes = new List<object>();

        // Add exception details if present
        if (logEvent.Exception != null)
        {
            attributes.Add(new { key = "exception.type", value = new { stringValue = logEvent.Exception.GetType().FullName } });
            attributes.Add(new { key = "exception.message", value = new { stringValue = logEvent.Exception.Message } });
            if (logEvent.Exception.StackTrace != null)
            {
                attributes.Add(new { key = "exception.stacktrace", value = new { stringValue = logEvent.Exception.StackTrace } });
            }
        }

        // Add custom properties
        foreach (var property in logEvent.Properties)
        {
            var value = ExtractPropertyValue(property.Value);
            if (value != null)
            {
                attributes.Add(new { key = property.Key, value });
            }
        }

        // Add source context if available
        if (logEvent.Properties.TryGetValue("SourceContext", out var sourceContext))
        {
            var sourceValue = ExtractPropertyValue(sourceContext);
            if (sourceValue != null)
            {
                attributes.Add(new { key = "source.context", value = sourceValue });
            }
        }

        return attributes.ToArray();
    }

    private object? ExtractPropertyValue(LogEventPropertyValue propertyValue)
    {
        return propertyValue switch
        {
            ScalarValue scalar when scalar.Value is string str => new { stringValue = str },
            ScalarValue scalar when scalar.Value is int intVal => new { intValue = intVal },
            ScalarValue scalar when scalar.Value is long longVal => new { intValue = longVal },
            ScalarValue scalar when scalar.Value is double doubleVal => new { doubleValue = doubleVal },
            ScalarValue scalar when scalar.Value is float floatVal => new { doubleValue = (double)floatVal },
            ScalarValue scalar when scalar.Value is bool boolVal => new { boolValue = boolVal },
            ScalarValue scalar when scalar.Value != null => new { stringValue = scalar.Value.ToString() },
            _ => null
        };
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

        // Add custom resource attributes
        foreach (var attr in _config.ResourceAttributes)
        {
            attributes.Add(new { key = attr.Key, value = new { stringValue = attr.Value } });
        }

        return attributes.ToArray();
    }

    private Dictionary<string, string> GetResourceAttributes()
    {
        var attributes = new Dictionary<string, string>
        {
            ["service.name"] = _config.ServiceName,
            ["service.version"] = _config.ServiceVersion
        };

        if (!string.IsNullOrEmpty(_config.Environment))
            attributes["deployment.environment"] = _config.Environment;

        if (!string.IsNullOrEmpty(_config.HostName))
            attributes["host.name"] = _config.HostName;

        foreach (var attr in _config.ResourceAttributes)
        {
            attributes[attr.Key] = attr.Value;
        }

        return attributes;
    }

    private string? ExtractTraceId(LogEvent logEvent)
    {
        // Try to extract trace ID from various sources
        if (logEvent.Properties.TryGetValue("TraceId", out var traceIdProp) && 
            traceIdProp is ScalarValue traceIdScalar && 
            traceIdScalar.Value is string traceId &&
            !string.IsNullOrEmpty(traceId))
        {
            return traceId;
        }

        // Try Activity.Current if available
        if (System.Diagnostics.Activity.Current?.Id != null)
        {
            return System.Diagnostics.Activity.Current.TraceId.ToString();
        }

        return null;
    }

    private string? ExtractSpanId(LogEvent logEvent)
    {
        // Try to extract span ID from various sources
        if (logEvent.Properties.TryGetValue("SpanId", out var spanIdProp) && 
            spanIdProp is ScalarValue spanIdScalar && 
            spanIdScalar.Value is string spanId &&
            !string.IsNullOrEmpty(spanId))
        {
            return spanId;
        }

        // Try Activity.Current if available
        if (System.Diagnostics.Activity.Current?.Id != null)
        {
            return System.Diagnostics.Activity.Current.SpanId.ToString();
        }

        return null;
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;

        // Flush any remaining logs
        FlushAsync().Wait(TimeSpan.FromSeconds(5));

        _flushTimer?.Dispose();
        _httpClient?.Dispose();
        _flushSemaphore?.Dispose();
    }
}
