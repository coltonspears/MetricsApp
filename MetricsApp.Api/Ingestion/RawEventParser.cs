using System.Text.Json;
using MetricsApp.Abstractions.Parsers;
using MetricsApp.Core.Models;

namespace MetricsApp.Api.Ingestion;

/// <summary>
/// Parses generic raw HTTP events (SourceType = "raw-event") posted via
/// <c>/api/v1/ingest/events</c>. Treats the event as a log by default,
/// or as a metric when <c>EventDto.Type</c> is "metric" and the payload
/// contains a numeric "value" / "name".
/// </summary>
public sealed class RawEventParser : IDataParser
{
    private const string SourceTypeId = "raw-event";

    private readonly ILogger<RawEventParser> _logger;

    public RawEventParser(ILogger<RawEventParser> logger)
    {
        _logger = logger;
    }

    public bool CanParse(string sourceType) =>
        SourceTypeId.Equals(sourceType, StringComparison.OrdinalIgnoreCase);

    public IEnumerable<object> Parse(EventDto rawEvent)
    {
        try
        {
            var payload = NormalizeToJsonElement(rawEvent.Payload);

            if (string.Equals(rawEvent.Type, "metric", StringComparison.OrdinalIgnoreCase) &&
                TryBuildMetric(payload, rawEvent, out var metric))
            {
                return new object[] { metric! };
            }

            return new object[] { BuildLogRecord(payload, rawEvent) };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "Failed to parse raw event from {Host}/{App}", rawEvent.HostName, rawEvent.AppId);
            return Enumerable.Empty<object>();
        }
    }

    private static JsonElement NormalizeToJsonElement(object? payload)
    {
        if (payload is JsonElement element)
            return element;
        if (payload is null)
            return default;
        if (payload is string s)
            return JsonSerializer.Deserialize<JsonElement>(s);
        return JsonSerializer.SerializeToElement(payload);
    }

    private static LogRecord BuildLogRecord(JsonElement payload, EventDto rawEvent)
    {
        var body = payload.ValueKind switch
        {
            JsonValueKind.Undefined => string.Empty,
            JsonValueKind.Null => string.Empty,
            JsonValueKind.String => payload.GetString() ?? string.Empty,
            _ => payload.GetRawText(),
        };

        var record = new LogRecord
        {
            Timestamp = rawEvent.Timestamp,
            ObservedTimestamp = DateTimeOffset.UtcNow,
            SeverityText = rawEvent.LogLevel,
            Body = body,
            Resource = new Dictionary<string, object>
            {
                ["service.name"] = rawEvent.AppId,
                ["host.name"] = rawEvent.HostName,
                ["tenant.id"] = rawEvent.TenantId,
            },
            Attributes = new Dictionary<string, object>
            {
                ["source.type"] = rawEvent.SourceType,
                ["source.ip"] = rawEvent.Ip,
            },
        };

        if (payload.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in payload.EnumerateObject())
            {
                if (prop.NameEquals("message") || prop.NameEquals("body"))
                {
                    record.Body = prop.Value.ValueKind == JsonValueKind.String
                        ? (prop.Value.GetString() ?? string.Empty)
                        : prop.Value.GetRawText();
                    continue;
                }
                record.Attributes[prop.Name] = ExtractValue(prop.Value);
            }
        }

        return record;
    }

    private static bool TryBuildMetric(JsonElement payload, EventDto rawEvent, out Metric? metric)
    {
        metric = null;
        if (payload.ValueKind != JsonValueKind.Object)
            return false;

        if (!payload.TryGetProperty("name", out var nameProp) || nameProp.ValueKind != JsonValueKind.String)
            return false;

        if (!payload.TryGetProperty("value", out var valueProp) || valueProp.ValueKind != JsonValueKind.Number)
            return false;

        metric = new Metric
        {
            Name = nameProp.GetString() ?? "unknown",
            Timestamp = rawEvent.Timestamp,
            Type = MetricType.Gauge,
            Resource = new Dictionary<string, object>
            {
                ["service.name"] = rawEvent.AppId,
                ["host.name"] = rawEvent.HostName,
                ["tenant.id"] = rawEvent.TenantId,
            },
        };

        if (valueProp.TryGetInt64(out var longVal))
            metric.GaugeValueLong = longVal;
        else
            metric.GaugeValueDouble = valueProp.GetDouble();

        if (payload.TryGetProperty("unit", out var unit) && unit.ValueKind == JsonValueKind.String)
            metric.Unit = unit.GetString();
        if (payload.TryGetProperty("description", out var desc) && desc.ValueKind == JsonValueKind.String)
            metric.Description = desc.GetString();

        if (payload.TryGetProperty("attributes", out var attrs) && attrs.ValueKind == JsonValueKind.Object)
        {
            foreach (var prop in attrs.EnumerateObject())
            {
                metric.Attributes[prop.Name] = ExtractValue(prop.Value);
            }
        }

        return true;
    }

    private static object ExtractValue(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.String => element.GetString() ?? string.Empty,
        JsonValueKind.Number => element.TryGetInt64(out var l) ? l : (object)element.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Null => string.Empty,
        _ => element.GetRawText(),
    };
}
