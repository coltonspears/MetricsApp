using System.Text.Json;
using MetricsApp.Abstractions.Parsers;
using MetricsApp.Core.Models;

namespace MetricsApp.Api.Ingestion;

/// <summary>
/// Parses events emitted by <c>MetricsApp.Serilog.Sink</c> (SourceType = "serilog-sink")
/// into unified <see cref="LogRecord"/> instances so they get persisted by the worker.
/// </summary>
public sealed class SerilogSinkParser : IDataParser
{
    private const string SourceTypeId = "serilog-sink";
    private readonly ILogger<SerilogSinkParser> _logger;

    public SerilogSinkParser(ILogger<SerilogSinkParser> logger)
    {
        _logger = logger;
    }

    public bool CanParse(string sourceType) =>
        SourceTypeId.Equals(sourceType, StringComparison.OrdinalIgnoreCase);

    public IEnumerable<object> Parse(EventDto rawEvent)
    {
        if (rawEvent.Payload is null)
        {
            return Enumerable.Empty<object>();
        }

        try
        {
            var json = NormalizeToJsonElement(rawEvent.Payload);
            if (json is not { } element)
            {
                return Enumerable.Empty<object>();
            }

            var record = BuildLogRecord(element, rawEvent);
            return record is null ? Enumerable.Empty<object>() : new object[] { record };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to parse serilog-sink event from {Host}/{App}", rawEvent.HostName, rawEvent.AppId);
            return Enumerable.Empty<object>();
        }
    }

    private static JsonElement? NormalizeToJsonElement(object payload)
    {
        if (payload is JsonElement element)
        {
            return element;
        }

        if (payload is string str)
        {
            return JsonSerializer.Deserialize<JsonElement>(str);
        }

        var serialized = JsonSerializer.SerializeToElement(payload);
        return serialized;
    }

    private static LogRecord? BuildLogRecord(JsonElement payload, EventDto rawEvent)
    {
        var log = new LogRecord
        {
            Timestamp = rawEvent.Timestamp,
            ObservedTimestamp = DateTimeOffset.UtcNow,
            SeverityText = rawEvent.LogLevel,
            Body = string.Empty,
            Attributes = new Dictionary<string, object>(),
            Resource = new Dictionary<string, object>
            {
                ["service.name"] = rawEvent.AppId,
                ["host.name"] = rawEvent.HostName,
                ["tenant.id"] = rawEvent.TenantId,
            },
        };

        if (TryGetString(payload, "level", out var level))
        {
            log.SeverityText = level;
        }

        if (TryGetDateTimeOffset(payload, "timestamp", out var ts))
        {
            log.Timestamp = ts;
        }

        if (TryGetString(payload, "message", out var message))
        {
            log.Body = message;
        }

        if (TryGetString(payload, "messageTemplate", out var template) && !string.IsNullOrEmpty(template))
        {
            log.Attributes["log.template"] = template;
        }

        if (TryGetString(payload, "source", out var source) && !string.IsNullOrEmpty(source))
        {
            log.Attributes["log.source"] = source;
        }

        if (TryGetString(payload, "category", out var category) && !string.IsNullOrEmpty(category))
        {
            log.Attributes["log.category"] = category;
        }

        if (TryGetString(payload, "traceId", out var traceId) && !string.IsNullOrEmpty(traceId))
        {
            log.TraceId = traceId;
            log.Attributes["trace.id"] = traceId;
        }

        if (TryGetString(payload, "spanId", out var spanId) && !string.IsNullOrEmpty(spanId))
        {
            log.SpanId = spanId;
            log.Attributes["span.id"] = spanId;
        }

        if (payload.TryGetProperty("properties", out var props) && props.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in props.EnumerateObject())
            {
                log.Attributes[prop.Name] = ExtractPropertyValue(prop.Value);
            }
        }

        if (payload.TryGetProperty("exception", out var exception) && exception.ValueKind == JsonValueKind.Object)
        {
            if (TryGetString(exception, "type", out var exType))
                log.Attributes["exception.type"] = exType;
            if (TryGetString(exception, "message", out var exMsg))
                log.Attributes["exception.message"] = exMsg;
            if (TryGetString(exception, "stackTrace", out var exStack))
                log.Attributes["exception.stacktrace"] = exStack;
        }

        return log;
    }

    private static object ExtractPropertyValue(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.String => element.GetString() ?? string.Empty,
        JsonValueKind.Number => element.TryGetInt64(out var l) ? l : (object)element.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Null => string.Empty,
        _ => element.GetRawText(),
    };

    private static bool TryGetString(JsonElement element, string name, out string value)
    {
        if (element.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String)
        {
            value = prop.GetString() ?? string.Empty;
            return true;
        }
        value = string.Empty;
        return false;
    }

    private static bool TryGetDateTimeOffset(JsonElement element, string name, out DateTimeOffset value)
    {
        if (element.TryGetProperty(name, out var prop))
        {
            if (prop.ValueKind == JsonValueKind.String && prop.TryGetDateTimeOffset(out value))
            {
                return true;
            }
        }
        value = default;
        return false;
    }
}
