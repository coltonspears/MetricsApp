using Serilog.Core;
using Serilog.Events;
using Serilog.Formatting.Json;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text;
using System.Text.Json;
using MetricsApp.Core.Models;
using MetricsApp.Serilog.Sink.Configuration;
using MetricsApp.Serilog.Sink.Models;

namespace MetricsApp.Serilog.Sink;

/// <summary>
/// Custom Serilog sink that sends log events to MetricsApp API endpoints
/// </summary>
public class MetricsAppSink : ILogEventSink, IDisposable
{
    private readonly MetricsAppSinkConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly ConcurrentQueue<LogEvent> _logQueue;
    private readonly Timer _flushTimer;
    private readonly SemaphoreSlim _flushSemaphore;
    private readonly JsonSerializerOptions _jsonOptions;
    private volatile bool _disposed;

    public MetricsAppSink(MetricsAppSinkConfiguration config)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        
        // Validate configuration
        var validationErrors = _config.Validate().ToList();
        if (validationErrors.Any())
        {
            throw new ArgumentException($"Invalid configuration: {string.Join(", ", validationErrors)}");
        }

        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(_config.TimeoutSeconds)
        };

        // Add custom headers
        foreach (var header in _config.CustomHeaders)
        {
            _httpClient.DefaultRequestHeaders.TryAddWithoutValidation(header.Key, header.Value);
        }

        _logQueue = new ConcurrentQueue<LogEvent>();
        _flushSemaphore = new SemaphoreSlim(1, 1);
        
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

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
            
            // Dequeue up to BatchSize events
            while (events.Count < _config.BatchSize && _logQueue.TryDequeue(out var logEvent))
            {
                events.Add(logEvent);
            }

            if (events.Count == 0)
                return;

            await SendLogsAsync(events);
        }
        catch (Exception ex)
        {
            if (_config.LogSinkFailures)
            {
                Console.WriteLine($"MetricsApp Sink Error: {ex.Message}");
            }
        }
        finally
        {
            _flushSemaphore.Release();
        }
    }

    private async Task SendLogsAsync(List<LogEvent> events)
    {
        var retryCount = 0;
        while (retryCount <= _config.MaxRetries)
        {
            try
            {
                await SendLogsToApiAsync(events);
                return; // Success
            }
            catch (Exception ex)
            {
                retryCount++;
                if (retryCount > _config.MaxRetries)
                {
                    if (_config.LogSinkFailures)
                    {
                        Console.WriteLine($"MetricsApp Sink: Failed to send logs after {_config.MaxRetries} retries: {ex.Message}");
                    }
                    return;
                }

                // Exponential backoff
                var delay = TimeSpan.FromMilliseconds(Math.Pow(2, retryCount - 1) * 1000);
                await Task.Delay(delay);
            }
        }
    }

    private async Task SendLogsToApiAsync(List<LogEvent> events)
    {
        string endpoint = _config.GetApiEndpointUrl();
        HttpContent content;

        switch (_config.TargetEndpoint.ToLowerInvariant())
        {
            case "telemetry":
                content = CreateTelemetryContent(events);
                break;
            case "otel":
                content = CreateOtlpContent(events);
                break;
            case "jaeger":
                content = CreateJaegerContent(events);
                break;
            default:
                content = CreateTelemetryContent(events);
                break;
        }

        var response = await _httpClient.PostAsync(endpoint, content);
        
        if (!response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException(
                $"API request failed with {response.StatusCode}: {responseContent}");
        }
    }

    private HttpContent CreateTelemetryContent(List<LogEvent> events)
    {
        // For TelemetryController, we can send logs directly to the logs endpoint
        // or we can send individual EventDto objects to match the existing queue pattern
        
        var eventDtos = events.Select(ConvertToEventDto).ToList();
        
        // Send as batch of EventDto objects (similar to how OtelController works)
        var json = JsonSerializer.Serialize(eventDtos, _jsonOptions);
        return new StringContent(json, Encoding.UTF8, "application/json");
    }

    private HttpContent CreateOtlpContent(List<LogEvent> events)
    {
        if (!_config.UseOtlpFormat)
        {
            // Send as simple EventDto for OtelController to process
            var eventDtos = events.Select(ConvertToEventDto).ToList();
            var json = JsonSerializer.Serialize(eventDtos, _jsonOptions);
            return new StringContent(json, Encoding.UTF8, "application/json");
        }

        // Create proper OTLP format
        var otlpPayload = new OtlpLogsPayload
        {
            ResourceLogs = new List<OtlpResourceLogs>
            {
                new OtlpResourceLogs
                {
                    Resource = new OtlpResource
                    {
                        Attributes = new List<OtlpKeyValue>
                        {
                            new() { Key = "service.name", Value = new OtlpAnyValue { StringValue = _config.ServiceName } },
                            new() { Key = "service.version", Value = new OtlpAnyValue { StringValue = _config.ServiceVersion } },
                            new() { Key = "deployment.environment", Value = new OtlpAnyValue { StringValue = _config.Environment } },
                            new() { Key = "host.name", Value = new OtlpAnyValue { StringValue = _config.HostName } }
                        }
                    },
                    ScopeLogs = new List<OtlpScopeLogs>
                    {
                        new OtlpScopeLogs
                        {
                            Scope = new OtlpInstrumentationScope
                            {
                                Name = "MetricsApp.Serilog.Sink",
                                Version = "1.0.0"
                            },
                            LogRecords = events.Select(ConvertToOtlpLogRecord).ToList()
                        }
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(otlpPayload, _jsonOptions);
        return new StringContent(json, Encoding.UTF8, "application/json");
    }

    private HttpContent CreateJaegerContent(List<LogEvent> events)
    {
        // For Jaeger endpoint, we might want to send trace-like events
        // For now, convert to EventDto format
        var eventDtos = events.Select(ConvertToEventDto).ToList();
        var json = JsonSerializer.Serialize(eventDtos, _jsonOptions);
        return new StringContent(json, Encoding.UTF8, "application/json");
    }

    private EventDto ConvertToEventDto(LogEvent logEvent)
    {
        var traceId = GetTraceId(logEvent);
        var spanId = GetSpanId(logEvent);

        return new EventDto
        {
            Timestamp = logEvent.Timestamp,
            TenantId = _config.TenantId,
            AppId = _config.ServiceName,
            Type = "log",
            SourceType = "serilog-sink",
            HostName = _config.HostName,
            Ip = GetLocalIpAddress(),
            LogLevel = logEvent.Level.ToString().ToUpperInvariant(),
            Payload = CreateTelemetryLogPayload(logEvent)
        };
    }

    private TelemetryLogPayload CreateTelemetryLogPayload(LogEvent logEvent)
    {
        var payload = new TelemetryLogPayload
        {
            Timestamp = logEvent.Timestamp,
            Level = logEvent.Level.ToString(),
            Message = logEvent.RenderMessage(),
            MessageTemplate = logEvent.MessageTemplate?.Text,
            Source = _config.ServiceName,
            TraceId = GetTraceId(logEvent),
            SpanId = GetSpanId(logEvent)
        };

        // Add exception details if present
        if (logEvent.Exception != null)
        {
            payload.Exception = ConvertException(logEvent.Exception);
        }

        // Add structured properties
        if (_config.IncludeStructuredProperties)
        {
            foreach (var property in logEvent.Properties)
            {
                payload.Properties[property.Key] = ConvertLogEventPropertyValue(property.Value);
            }
        }

        return payload;
    }

    private OtlpLogRecord ConvertToOtlpLogRecord(LogEvent logEvent)
    {
        var record = new OtlpLogRecord
        {
            TimeUnixNano = logEvent.Timestamp.ToUnixTimeMilliseconds() * 1_000_000,
            SeverityNumber = GetOtlpSeverityNumber(logEvent.Level),
            SeverityText = logEvent.Level.ToString(),
            Body = new OtlpAnyValue { StringValue = logEvent.RenderMessage() }
        };

        // Add trace context
        var traceId = GetTraceId(logEvent);
        var spanId = GetSpanId(logEvent);
        if (!string.IsNullOrEmpty(traceId))
            record.TraceId = traceId;
        if (!string.IsNullOrEmpty(spanId))
            record.SpanId = spanId;

        // Add properties as attributes
        if (_config.IncludeStructuredProperties)
        {
            foreach (var property in logEvent.Properties)
            {
                record.Attributes.Add(new OtlpKeyValue
                {
                    Key = property.Key,
                    Value = ConvertToOtlpAnyValue(property.Value)
                });
            }
        }

        // Add exception as attributes
        if (logEvent.Exception != null && _config.IncludeExceptionDetails)
        {
            record.Attributes.Add(new OtlpKeyValue
            {
                Key = "exception.type",
                Value = new OtlpAnyValue { StringValue = logEvent.Exception.GetType().FullName }
            });
            record.Attributes.Add(new OtlpKeyValue
            {
                Key = "exception.message",
                Value = new OtlpAnyValue { StringValue = logEvent.Exception.Message }
            });
            if (logEvent.Exception.StackTrace != null)
            {
                record.Attributes.Add(new OtlpKeyValue
                {
                    Key = "exception.stacktrace",
                    Value = new OtlpAnyValue { StringValue = logEvent.Exception.StackTrace }
                });
            }
        }

        return record;
    }

    private static int GetOtlpSeverityNumber(LogEventLevel level) => level switch
    {
        LogEventLevel.Verbose => 1,
        LogEventLevel.Debug => 5,
        LogEventLevel.Information => 9,
        LogEventLevel.Warning => 13,
        LogEventLevel.Error => 17,
        LogEventLevel.Fatal => 21,
        _ => 0
    };

    private static ExceptionDetails ConvertException(Exception ex)
    {
        var details = new ExceptionDetails
        {
            Type = ex.GetType().FullName ?? ex.GetType().Name,
            Message = ex.Message,
            StackTrace = ex.StackTrace
        };

        if (ex.InnerException != null)
        {
            details.InnerException = ConvertException(ex.InnerException);
        }

        if (ex.Data.Count > 0)
        {
            foreach (var key in ex.Data.Keys)
            {
                if (key != null && ex.Data[key] != null)
                {
                    details.Data[key.ToString()!] = ex.Data[key]!;
                }
            }
        }

        return details;
    }

    private static object ConvertLogEventPropertyValue(LogEventPropertyValue value)
    {
        return value switch
        {
            ScalarValue sv => sv.Value ?? string.Empty,
            SequenceValue seq => seq.Elements.Select(ConvertLogEventPropertyValue).ToArray(),
            StructureValue str => str.Properties.ToDictionary(p => p.Name, p => ConvertLogEventPropertyValue(p.Value)),
            DictionaryValue dict => dict.Elements.ToDictionary(kvp => kvp.Key.Value?.ToString() ?? "", kvp => ConvertLogEventPropertyValue(kvp.Value)),
            _ => value.ToString()
        };
    }

    private static OtlpAnyValue ConvertToOtlpAnyValue(LogEventPropertyValue value)
    {
        return value switch
        {
            ScalarValue { Value: string s } => new OtlpAnyValue { StringValue = s },
            ScalarValue { Value: int i } => new OtlpAnyValue { IntValue = i },
            ScalarValue { Value: long l } => new OtlpAnyValue { IntValue = l },
            ScalarValue { Value: double d } => new OtlpAnyValue { DoubleValue = d },
            ScalarValue { Value: float f } => new OtlpAnyValue { DoubleValue = f },
            ScalarValue { Value: bool b } => new OtlpAnyValue { BoolValue = b },
            ScalarValue sv => new OtlpAnyValue { StringValue = sv.Value?.ToString() ?? string.Empty },
            _ => new OtlpAnyValue { StringValue = value.ToString() }
        };
    }

    private static string? GetTraceId(LogEvent logEvent)
    {
        // Try to get trace ID from Activity context
        var activity = Activity.Current;
        if (activity != null && !string.IsNullOrEmpty(activity.TraceId.ToString()))
        {
            return activity.TraceId.ToString();
        }

        // Try to get from log properties
        if (logEvent.Properties.TryGetValue("TraceId", out var traceIdProperty))
        {
            return traceIdProperty.ToString().Trim('"');
        }

        return null;
    }

    private static string? GetSpanId(LogEvent logEvent)
    {
        // Try to get span ID from Activity context
        var activity = Activity.Current;
        if (activity != null && !string.IsNullOrEmpty(activity.SpanId.ToString()))
        {
            return activity.SpanId.ToString();
        }

        // Try to get from log properties
        if (logEvent.Properties.TryGetValue("SpanId", out var spanIdProperty))
        {
            return spanIdProperty.ToString().Trim('"');
        }

        return null;
    }

    private static string GetLocalIpAddress()
    {
        try
        {
            var host = System.Net.Dns.GetHostEntry(System.Net.Dns.GetHostName());
            foreach (var ip in host.AddressList)
            {
                if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
                {
                    return ip.ToString();
                }
            }
        }
        catch
        {
            // Ignore errors getting IP address
        }
        return "unknown";
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;

        // Final flush
        FlushAsync().GetAwaiter().GetResult();

        _flushTimer?.Dispose();
        _flushSemaphore?.Dispose();
        _httpClient?.Dispose();
    }
}
