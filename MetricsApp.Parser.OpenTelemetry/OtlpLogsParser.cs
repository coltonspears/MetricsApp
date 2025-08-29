using System.Text.Json;
using MetricsApp.Abstractions.Parsers;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Parser.OpenTelemetry;

public class OtlpLogsParser : IDataParser
{
    private readonly ILogger<OtlpLogsParser> _logger;
    private const string SourceType = "otlp-logs";

    public OtlpLogsParser(ILogger<OtlpLogsParser> logger)
    {
        _logger = logger;
        _logger.LogInformation("OtlpLogsParser initialized.");
    }

    public bool CanParse(string sourceType)
    {
        return SourceType.Equals(sourceType, StringComparison.OrdinalIgnoreCase);
    }

    public IEnumerable<object> Parse(EventDto rawEvent)
    {
        if (rawEvent.Payload == null)
        {
            _logger.LogWarning("OTLP logs event payload is null for event from host {HostName} at {Timestamp}.", 
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
                _logger.LogWarning("Unsupported OTLP logs payload type '{PayloadType}' for event from host {HostName}.", 
                    rawEvent.Payload.GetType().FullName, rawEvent.HostName);
                return Enumerable.Empty<object>();
            }

            return ParseOtlpLogs(jsonPayload, rawEvent);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize OTLP logs payload from host {HostName}.", rawEvent.HostName);
            return Enumerable.Empty<object>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error parsing OTLP logs from host {HostName}.", rawEvent.HostName);
            return Enumerable.Empty<object>();
        }
    }

    private IEnumerable<object> ParseOtlpLogs(JsonElement jsonPayload, EventDto rawEvent)
    {
        var logs = new List<object>();

        // Parse OTLP logs structure: resourceLogs[] -> scopeLogs[] -> logRecords[]
        if (jsonPayload.TryGetProperty("resourceLogs", out var resourceLogs))
        {
            foreach (var resourceLog in resourceLogs.EnumerateArray())
            {
                var resource = ExtractResourceAttributes(resourceLog);
                
                if (resourceLog.TryGetProperty("scopeLogs", out var scopeLogs))
                {
                    foreach (var scopeLog in scopeLogs.EnumerateArray())
                    {
                        if (scopeLog.TryGetProperty("logRecords", out var logRecords))
                        {
                            foreach (var logRecord in logRecords.EnumerateArray())
                            {
                                var parsedLog = ParseIndividualLogRecord(logRecord, resource, rawEvent);
                                if (parsedLog != null)
                                {
                                    logs.Add(parsedLog);
                                }
                            }
                        }
                    }
                }
            }
        }

        _logger.LogDebug("Parsed {Count} OTLP log records from host {HostName}", logs.Count, rawEvent.HostName);
        return logs;
    }

    private LogRecord? ParseIndividualLogRecord(JsonElement logRecord, Dictionary<string, object> resource, EventDto rawEvent)
    {
        try
        {
            var log = new LogRecord
            {
                Timestamp = rawEvent.Timestamp,
                SeverityText = "INFO", // Default level
                Body = "",
                Attributes = new Dictionary<string, object>(),
                Resource = new Dictionary<string, object>(resource)
            };

            // Extract timestamp (handle both string and number formats)
            if (logRecord.TryGetProperty("timeUnixNano", out var timeElement))
            {
                var timestamp = ParseUnixNanoTimestamp(timeElement);
                if (timestamp.HasValue)
                {
                    log.Timestamp = timestamp.Value;
                }
            }

            // Extract severity/level
            if (logRecord.TryGetProperty("severityText", out var severityText))
            {
                var level = severityText.GetString();
                if (!string.IsNullOrEmpty(level))
                {
                    log.SeverityText = level;
                }
            }
            else if (logRecord.TryGetProperty("severityNumber", out var severityNumber))
            {
                int severityNum = 0;
                if (severityNumber.ValueKind == JsonValueKind.Number && severityNumber.TryGetInt32(out severityNum))
                {
                    log.SeverityNumber = severityNum;
                    log.SeverityText = MapSeverityNumberToLevel(severityNum);
                }
                else if (severityNumber.ValueKind == JsonValueKind.String)
                {
                    var severityStr = severityNumber.GetString();
                    if (!string.IsNullOrEmpty(severityStr) && int.TryParse(severityStr, out severityNum))
                    {
                        log.SeverityNumber = severityNum;
                        log.SeverityText = MapSeverityNumberToLevel(severityNum);
                    }
                }
            }

            // Extract message body
            if (logRecord.TryGetProperty("body", out var body))
            {
                if (body.TryGetProperty("stringValue", out var stringValue))
                {
                    log.Body = stringValue.GetString() ?? "";
                }
                else if (body.ValueKind == JsonValueKind.String)
                {
                    log.Body = body.GetString() ?? "";
                }
                else
                {
                    // Handle complex body structures by serializing to JSON
                    log.Body = body.GetRawText();
                }
            }

            // Extract attributes
            if (logRecord.TryGetProperty("attributes", out var attributes))
            {
                ExtractAttributes(attributes, log.Attributes);
            }

            // Extract trace context
            if (logRecord.TryGetProperty("traceId", out var traceId))
            {
                var traceIdStr = traceId.GetString();
                if (!string.IsNullOrEmpty(traceIdStr))
                {
                    log.Attributes["trace.id"] = traceIdStr;
                }
            }

            if (logRecord.TryGetProperty("spanId", out var spanId))
            {
                var spanIdStr = spanId.GetString();
                if (!string.IsNullOrEmpty(spanIdStr))
                {
                    log.Attributes["span.id"] = spanIdStr;
                }
            }

            // Extract flags
            if (logRecord.TryGetProperty("flags", out var flags) && flags.TryGetInt32(out var flagsValue))
            {
                log.Attributes["flags"] = flagsValue;
            }

            return log;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse individual OTLP log record from host {HostName}", rawEvent.HostName);
            return null;
        }
    }

    private string MapSeverityNumberToLevel(int severityNumber)
    {
        // Map OTLP severity numbers to standard log levels
        // Based on OpenTelemetry specification
        return severityNumber switch
        {
            >= 1 and <= 4 => "TRACE",
            >= 5 and <= 8 => "DEBUG", 
            >= 9 and <= 12 => "INFO",
            >= 13 and <= 16 => "WARN",
            >= 17 and <= 20 => "ERROR",
            >= 21 and <= 24 => "FATAL",
            _ => "INFO"
        };
    }

    private Dictionary<string, object> ExtractResourceAttributes(JsonElement resourceLog)
    {
        var resource = new Dictionary<string, object>();

        if (resourceLog.TryGetProperty("resource", out var resourceElement) &&
            resourceElement.TryGetProperty("attributes", out var attributes))
        {
            ExtractAttributes(attributes, resource);
        }

        return resource;
    }

    private void ExtractAttributes(JsonElement attributes, Dictionary<string, object> targetDict)
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
                    targetDict[key] = value;
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
