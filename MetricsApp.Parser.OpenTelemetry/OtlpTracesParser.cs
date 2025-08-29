using System.Text.Json;
using MetricsApp.Abstractions.Parsers;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Parser.OpenTelemetry;

public class OtlpTracesParser : IDataParser
{
    private readonly ILogger<OtlpTracesParser> _logger;
    private const string SourceType = "otlp-traces";

    public OtlpTracesParser(ILogger<OtlpTracesParser> logger)
    {
        _logger = logger;
        _logger.LogInformation("OtlpTracesParser initialized.");
    }

    public bool CanParse(string sourceType)
    {
        return SourceType.Equals(sourceType, StringComparison.OrdinalIgnoreCase);
    }

    public IEnumerable<object> Parse(EventDto rawEvent)
    {
        if (rawEvent.Payload == null)
        {
            _logger.LogWarning("OTLP traces event payload is null for event from host {HostName} at {Timestamp}.", 
                rawEvent.HostName, rawEvent.Timestamp);
            return Enumerable.Empty<object>();
        }

        try
        {
            JsonElement jsonPayload;
            
            if (rawEvent.Payload is JsonElement element)
            {
                jsonPayload = element;
            }
            else if (rawEvent.Payload is string jsonString)
            {
                jsonPayload = JsonSerializer.Deserialize<JsonElement>(jsonString);
            }
            else
            {
                _logger.LogWarning("Unsupported OTLP traces payload type '{PayloadType}' for event from host {HostName}.", 
                    rawEvent.Payload.GetType().FullName, rawEvent.HostName);
                return Enumerable.Empty<object>();
            }

            return ParseOtlpTraces(jsonPayload, rawEvent);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize OTLP traces payload from host {HostName}.", rawEvent.HostName);
            return Enumerable.Empty<object>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error parsing OTLP traces from host {HostName}.", rawEvent.HostName);
            return Enumerable.Empty<object>();
        }
    }

    private IEnumerable<object> ParseOtlpTraces(JsonElement jsonPayload, EventDto rawEvent)
    {
        var logs = new List<object>(); // Store traces as structured log records

        // Parse OTLP traces structure: resourceSpans[] -> scopeSpans[] -> spans[]
        if (jsonPayload.TryGetProperty("resourceSpans", out var resourceSpans))
        {
            foreach (var resourceSpan in resourceSpans.EnumerateArray())
            {
                var resource = ExtractResourceAttributes(resourceSpan);
                
                if (resourceSpan.TryGetProperty("scopeSpans", out var scopeSpans))
                {
                    foreach (var scopeSpan in scopeSpans.EnumerateArray())
                    {
                        var scope = ExtractScopeInfo(scopeSpan);
                        
                        if (scopeSpan.TryGetProperty("spans", out var spans))
                        {
                            foreach (var span in spans.EnumerateArray())
                            {
                                var parsedSpan = ParseIndividualSpan(span, resource, scope, rawEvent);
                                if (parsedSpan != null)
                                {
                                    logs.Add(parsedSpan);
                                }
                            }
                        }
                    }
                }
            }
        }

        _logger.LogDebug("Parsed {Count} OTLP spans as log records from host {HostName}", logs.Count, rawEvent.HostName);
        return logs;
    }

    private LogRecord? ParseIndividualSpan(JsonElement span, Dictionary<string, object> resource, 
        Dictionary<string, object> scope, EventDto rawEvent)
    {
        try
        {
            var log = new LogRecord
            {
                Timestamp = rawEvent.Timestamp,
                SeverityText = "INFO",
                Body = "",
                Attributes = new Dictionary<string, object>(),
                Resource = new Dictionary<string, object>(resource)
            };

            // Add scope information
            foreach (var scopeAttr in scope)
            {
                log.Attributes[$"scope.{scopeAttr.Key}"] = scopeAttr.Value;
            }

            // Extract basic span information
            if (span.TryGetProperty("name", out var nameElement))
            {
                var spanName = nameElement.GetString();
                if (!string.IsNullOrEmpty(spanName))
                {
                    log.Body = $"Span: {spanName}";
                    log.Attributes["span.name"] = spanName;
                }
            }

            // Extract trace and span IDs
            if (span.TryGetProperty("traceId", out var traceId))
            {
                var traceIdStr = traceId.GetString();
                if (!string.IsNullOrEmpty(traceIdStr))
                {
                    log.Attributes["trace.id"] = traceIdStr;
                }
            }

            if (span.TryGetProperty("spanId", out var spanId))
            {
                var spanIdStr = spanId.GetString();
                if (!string.IsNullOrEmpty(spanIdStr))
                {
                    log.Attributes["span.id"] = spanIdStr;
                }
            }

            if (span.TryGetProperty("parentSpanId", out var parentSpanId))
            {
                var parentSpanIdStr = parentSpanId.GetString();
                if (!string.IsNullOrEmpty(parentSpanIdStr))
                {
                    log.Attributes["span.parent_id"] = parentSpanIdStr;
                }
            }

            // Extract timing information
            if (span.TryGetProperty("startTimeUnixNano", out var startTimeElement))
            {
                var startTime = ParseUnixNanoTimestamp(startTimeElement);
                if (startTime.HasValue)
                {
                    log.Timestamp = startTime.Value;
                    log.Attributes["span.start_time"] = startTime.Value.ToString("O");
                }
            }

            if (span.TryGetProperty("endTimeUnixNano", out var endTimeElement))
            {
                var endTime = ParseUnixNanoTimestamp(endTimeElement);
                if (endTime.HasValue)
                {
                    log.Attributes["span.end_time"] = endTime.Value.ToString("O");
                    
                    // Calculate duration if we have both start and end times
                    if (span.TryGetProperty("startTimeUnixNano", out var startElement))
                    {
                        var startTime = ParseUnixNanoTimestamp(startElement);
                        if (startTime.HasValue)
                        {
                            var duration = endTime.Value - startTime.Value;
                            var durationMs = duration.TotalMilliseconds;
                            log.Attributes["span.duration_ms"] = durationMs;
                        }
                    }
                }
            }

            // Extract span kind
            if (span.TryGetProperty("kind", out var kindElement))
            {
                var kind = MapSpanKind(kindElement);
                log.Attributes["span.kind"] = kind;
            }

            // Extract span status
            if (span.TryGetProperty("status", out var status))
            {
                if (status.TryGetProperty("code", out var codeElement) && codeElement.TryGetInt32(out var statusCode))
                {
                    var statusText = MapSpanStatusCode(statusCode);
                    log.Attributes["span.status.code"] = statusCode;
                    log.Attributes["span.status.text"] = statusText;
                    
                    // Set log level based on span status
                    log.SeverityText = statusCode == 2 ? "ERROR" : "INFO"; // 2 = ERROR in OTLP
                    log.SeverityNumber = statusCode == 2 ? 17 : 9; // Map to OTLP severity numbers
                }
                
                if (status.TryGetProperty("message", out var messageElement))
                {
                    var statusMessage = messageElement.GetString();
                    if (!string.IsNullOrEmpty(statusMessage))
                    {
                        log.Attributes["span.status.message"] = statusMessage;
                        if (log.SeverityText == "ERROR")
                        {
                            log.Body += $" - Error: {statusMessage}";
                        }
                    }
                }
            }

            // Extract span attributes
            if (span.TryGetProperty("attributes", out var attributes))
            {
                ExtractAttributes(attributes, log.Attributes, "span.attr.");
            }

            // Extract span events (as additional context)
            if (span.TryGetProperty("events", out var events))
            {
                var eventCount = 0;
                var eventMessages = new List<string>();
                
                foreach (var spanEvent in events.EnumerateArray())
                {
                    eventCount++;
                    if (spanEvent.TryGetProperty("name", out var eventNameElement))
                    {
                        var eventName = eventNameElement.GetString();
                        if (!string.IsNullOrEmpty(eventName))
                        {
                            eventMessages.Add(eventName);
                        }
                    }
                }
                
                if (eventCount > 0)
                {
                    log.Attributes["span.events.count"] = eventCount;
                    log.Attributes["span.events.names"] = string.Join(", ", eventMessages);
                }
            }

            // Extract links information
            if (span.TryGetProperty("links", out var links))
            {
                var linkCount = 0;
                foreach (var _ in links.EnumerateArray())
                {
                    linkCount++;
                }
                
                if (linkCount > 0)
                {
                    log.Attributes["span.links.count"] = linkCount;
                }
            }

            return log;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse individual OTLP span from host {HostName}", rawEvent.HostName);
            return null;
        }
    }

    private string MapSpanKind(JsonElement kindElement)
    {
        if (kindElement.TryGetInt32(out var kindValue))
        {
            return kindValue switch
            {
                0 => "UNSPECIFIED",
                1 => "INTERNAL", 
                2 => "SERVER",
                3 => "CLIENT",
                4 => "PRODUCER",
                5 => "CONSUMER",
                _ => "UNKNOWN"
            };
        }
        else if (kindElement.ValueKind == JsonValueKind.String)
        {
            return kindElement.GetString() ?? "UNSPECIFIED";
        }
        
        return "UNSPECIFIED";
    }

    private string MapSpanStatusCode(int statusCode)
    {
        return statusCode switch
        {
            0 => "UNSET",
            1 => "OK", 
            2 => "ERROR",
            _ => "UNKNOWN"
        };
    }

    private Dictionary<string, object> ExtractResourceAttributes(JsonElement resourceSpan)
    {
        var resource = new Dictionary<string, object>();

        if (resourceSpan.TryGetProperty("resource", out var resourceElement) &&
            resourceElement.TryGetProperty("attributes", out var attributes))
        {
            ExtractAttributes(attributes, resource, "resource.");
        }

        return resource;
    }

    private Dictionary<string, object> ExtractScopeInfo(JsonElement scopeSpan)
    {
        var scope = new Dictionary<string, object>();

        if (scopeSpan.TryGetProperty("scope", out var scopeElement))
        {
            if (scopeElement.TryGetProperty("name", out var nameElement))
            {
                var name = nameElement.GetString();
                if (!string.IsNullOrEmpty(name))
                {
                    scope["name"] = name;
                }
            }

            if (scopeElement.TryGetProperty("version", out var versionElement))
            {
                var version = versionElement.GetString();
                if (!string.IsNullOrEmpty(version))
                {
                    scope["version"] = version;
                }
            }

            if (scopeElement.TryGetProperty("attributes", out var attributes))
            {
                ExtractAttributes(attributes, scope, "");
            }
        }

        return scope;
    }

    private void ExtractAttributes(JsonElement attributes, Dictionary<string, object> targetDict, string prefix = "")
    {
        foreach (var attribute in attributes.EnumerateArray())
        {
            if (attribute.TryGetProperty("key", out var keyElement) &&
                attribute.TryGetProperty("value", out var valueElement))
            {
                var key = keyElement.GetString();
                if (string.IsNullOrEmpty(key)) continue;

                object? value = null;
                
                if (valueElement.TryGetProperty("stringValue", out var stringVal))
                    value = stringVal.GetString();
                else if (valueElement.TryGetProperty("intValue", out var intVal) && intVal.TryGetInt64(out var intValue))
                    value = intValue;
                else if (valueElement.TryGetProperty("doubleValue", out var doubleVal))
                    value = doubleVal.GetDouble();
                else if (valueElement.TryGetProperty("boolValue", out var boolVal))
                    value = boolVal.GetBoolean();
                else if (valueElement.TryGetProperty("arrayValue", out var arrayVal))
                    value = arrayVal.GetRawText(); // Store complex arrays as JSON strings
                else if (valueElement.TryGetProperty("kvlistValue", out var kvListVal))
                    value = kvListVal.GetRawText(); // Store complex objects as JSON strings

                if (value != null)
                {
                    targetDict[$"{prefix}{key}"] = value;
                }
            }
        }
    }

    private DateTimeOffset? ParseUnixNanoTimestamp(JsonElement timeElement)
    {
        long timeNanos = 0;
        if (timeElement.ValueKind == JsonValueKind.Number && timeElement.TryGetInt64(out timeNanos))
        {
            return DateTimeOffset.FromUnixTimeMilliseconds(timeNanos / 1_000_000);
        }
        else if (timeElement.ValueKind == JsonValueKind.String)
        {
            var timeStr = timeElement.GetString();
            if (!string.IsNullOrEmpty(timeStr) && long.TryParse(timeStr, out timeNanos))
            {
                return DateTimeOffset.FromUnixTimeMilliseconds(timeNanos / 1_000_000);
            }
        }
        return null;
    }
}
