using System.Text.Json;
using MetricsApp.Abstractions.Parsers;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Parser.OpenTelemetry;

public class OtlpMetricsParser : IDataParser
{
    private readonly ILogger<OtlpMetricsParser> _logger;
    private const string SourceType = "otlp-metric";

    public OtlpMetricsParser(ILogger<OtlpMetricsParser> logger)
    {
        _logger = logger;
        _logger.LogInformation("OtlpMetricsParser initialized.");
    }

    public bool CanParse(string sourceType)
    {
        return SourceType.Equals(sourceType, StringComparison.OrdinalIgnoreCase);
    }

    public IEnumerable<object> Parse(EventDto rawEvent)
    {
        if (rawEvent.Payload == null)
        {
            _logger.LogWarning("OTLP metrics event payload is null for event from host {HostName} at {Timestamp}.", 
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
                _logger.LogWarning("Unsupported OTLP metrics payload type '{PayloadType}' for event from host {HostName}.", 
                    rawEvent.Payload.GetType().FullName, rawEvent.HostName);
                return Enumerable.Empty<object>();
            }

            return ParseOtlpMetrics(jsonPayload, rawEvent);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to deserialize OTLP metrics payload from host {HostName}.", rawEvent.HostName);
            return Enumerable.Empty<object>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error parsing OTLP metrics from host {HostName}.", rawEvent.HostName);
            return Enumerable.Empty<object>();
        }
    }

    private IEnumerable<object> ParseOtlpMetrics(JsonElement jsonPayload, EventDto rawEvent)
    {
        var metrics = new List<object>();

        // Parse OTLP metrics structure: resourceMetrics[] -> scopeMetrics[] -> metrics[]
        if (jsonPayload.TryGetProperty("resourceMetrics", out var resourceMetrics))
        {
            foreach (var resourceMetric in resourceMetrics.EnumerateArray())
            {
                var resource = ExtractResourceAttributes(resourceMetric);
                
                if (resourceMetric.TryGetProperty("scopeMetrics", out var scopeMetrics))
                {
                    foreach (var scopeMetric in scopeMetrics.EnumerateArray())
                    {
                        if (scopeMetric.TryGetProperty("metrics", out var otlpMetrics))
                        {
                            foreach (var otlpMetric in otlpMetrics.EnumerateArray())
                            {
                                var parsedMetrics = ParseIndividualMetric(otlpMetric, resource, rawEvent);
                                metrics.AddRange(parsedMetrics);
                            }
                        }
                    }
                }
            }
        }

        _logger.LogDebug("Parsed {Count} OTLP metrics from host {HostName}", metrics.Count, rawEvent.HostName);
        return metrics;
    }

    private List<object> ParseIndividualMetric(JsonElement otlpMetric, Dictionary<string, object> resource, EventDto rawEvent)
    {
        var metrics = new List<object>();

        if (!otlpMetric.TryGetProperty("name", out var nameElement))
        {
            _logger.LogWarning("OTLP metric missing 'name' property from host {HostName}", rawEvent.HostName);
            return metrics;
        }

        var metricName = nameElement.GetString();
        if (string.IsNullOrEmpty(metricName))
        {
            _logger.LogWarning("OTLP metric has empty name from host {HostName}", rawEvent.HostName);
            return metrics;
        }

        var description = otlpMetric.TryGetProperty("description", out var descElement) ? descElement.GetString() : null;
        var unit = otlpMetric.TryGetProperty("unit", out var unitElement) ? unitElement.GetString() : null;

        // Handle different metric types: gauge, sum, histogram
        if (otlpMetric.TryGetProperty("gauge", out var gauge))
        {
            metrics.AddRange(ParseGaugeMetric(metricName, description, unit, gauge, resource, rawEvent));
        }
        else if (otlpMetric.TryGetProperty("sum", out var sum))
        {
            metrics.AddRange(ParseSumMetric(metricName, description, unit, sum, resource, rawEvent));
        }
        else if (otlpMetric.TryGetProperty("histogram", out var histogram))
        {
            metrics.AddRange(ParseHistogramMetric(metricName, description, unit, histogram, resource, rawEvent));
        }
        else
        {
            _logger.LogWarning("Unknown OTLP metric type for metric '{MetricName}' from host {HostName}", 
                metricName, rawEvent.HostName);
        }

        return metrics;
    }

    private List<object> ParseGaugeMetric(string name, string? description, string? unit, JsonElement gauge, 
        Dictionary<string, object> resource, EventDto rawEvent)
    {
        var metrics = new List<object>();

        if (gauge.TryGetProperty("dataPoints", out var dataPoints))
        {
            foreach (var dataPoint in dataPoints.EnumerateArray())
            {
                var metric = CreateBaseMetric(name, description, unit, MetricType.Gauge, resource, rawEvent);
                
                if (dataPoint.TryGetProperty("timeUnixNano", out var timeElement))
                {
                    var timestamp = ParseUnixNanoTimestamp(timeElement);
                    if (timestamp.HasValue)
                    {
                        metric.Timestamp = timestamp.Value;
                    }
                }

                // Extract value
                if (dataPoint.TryGetProperty("asDouble", out var doubleValue))
                {
                    metric.GaugeValueDouble = doubleValue.GetDouble();
                }
                else if (dataPoint.TryGetProperty("asInt", out var intValue) && intValue.TryGetInt64(out var intVal))
                {
                    metric.GaugeValueDouble = intVal;
                }

                // Extract attributes
                if (dataPoint.TryGetProperty("attributes", out var attributes))
                {
                    ExtractAttributes(attributes, metric.Attributes);
                }

                metrics.Add(metric);
            }
        }

        return metrics;
    }

    private List<object> ParseSumMetric(string name, string? description, string? unit, JsonElement sum, 
        Dictionary<string, object> resource, EventDto rawEvent)
    {
        var metrics = new List<object>();

        // All sum metrics use the Sum type, with monotonic flag stored separately
        var metricType = MetricType.Sum;
        var isMonotonic = sum.TryGetProperty("isMonotonic", out var monotonicElement) && monotonicElement.GetBoolean();

        if (sum.TryGetProperty("dataPoints", out var dataPoints))
        {
            foreach (var dataPoint in dataPoints.EnumerateArray())
            {
                var metric = CreateBaseMetric(name, description, unit, metricType, resource, rawEvent);
                
                if (dataPoint.TryGetProperty("timeUnixNano", out var timeElement))
                {
                    var timestamp = ParseUnixNanoTimestamp(timeElement);
                    if (timestamp.HasValue)
                    {
                        metric.Timestamp = timestamp.Value;
                    }
                }

                // Store monotonic flag
                metric.IsMonotonic = isMonotonic;

                // Extract value
                if (dataPoint.TryGetProperty("asDouble", out var doubleValue))
                {
                    metric.SumValue = doubleValue.GetDouble();
                }
                else if (dataPoint.TryGetProperty("asInt", out var intValue) && intValue.TryGetInt64(out var intVal))
                {
                    metric.SumValue = intVal;
                }

                // Extract attributes
                if (dataPoint.TryGetProperty("attributes", out var attributes))
                {
                    ExtractAttributes(attributes, metric.Attributes);
                }

                metrics.Add(metric);
            }
        }

        return metrics;
    }

    private List<object> ParseHistogramMetric(string name, string? description, string? unit, JsonElement histogram, 
        Dictionary<string, object> resource, EventDto rawEvent)
    {
        var metrics = new List<object>();

        if (histogram.TryGetProperty("dataPoints", out var dataPoints))
        {
            foreach (var dataPoint in dataPoints.EnumerateArray())
            {
                var metric = CreateBaseMetric(name, description, unit, MetricType.Histogram, resource, rawEvent);
                
                if (dataPoint.TryGetProperty("timeUnixNano", out var timeElement))
                {
                    var timestamp = ParseUnixNanoTimestamp(timeElement);
                    if (timestamp.HasValue)
                    {
                        metric.Timestamp = timestamp.Value;
                    }
                }

                // Extract histogram values
                if (dataPoint.TryGetProperty("count", out var countElement) && countElement.TryGetInt64(out var count))
                {
                    metric.HistogramCount = count;
                }

                if (dataPoint.TryGetProperty("sum", out var sumElement))
                {
                    if (sumElement.TryGetDouble(out var sum))
                    {
                        metric.SumValue = sum; // Store sum value
                    }
                }

                // Extract bucket counts and bounds
                if (dataPoint.TryGetProperty("bucketCounts", out var bucketCounts))
                {
                    var buckets = new List<long>();
                    foreach (var bucketCount in bucketCounts.EnumerateArray())
                    {
                        if (bucketCount.TryGetInt64(out var bucketVal))
                            buckets.Add(bucketVal);
                    }
                    metric.Attributes["histogram.bucket_counts"] = string.Join(",", buckets);
                }

                if (dataPoint.TryGetProperty("explicitBounds", out var explicitBounds))
                {
                    var bounds = new List<double>();
                    foreach (var bound in explicitBounds.EnumerateArray())
                    {
                        if (bound.TryGetDouble(out var boundVal))
                            bounds.Add(boundVal);
                    }
                    metric.Attributes["histogram.explicit_bounds"] = string.Join(",", bounds);
                }

                // Extract attributes
                if (dataPoint.TryGetProperty("attributes", out var attributes))
                {
                    ExtractAttributes(attributes, metric.Attributes);
                }

                metrics.Add(metric);
            }
        }

        return metrics;
    }

    private Metric CreateBaseMetric(string name, string? description, string? unit, MetricType type, 
        Dictionary<string, object> resource, EventDto rawEvent)
    {
        var metric = new Metric
        {
            Name = name,
            Type = type,
            Unit = unit,
            Timestamp = rawEvent.Timestamp,
            Resource = new Dictionary<string, object>(resource),
            Attributes = new Dictionary<string, object>()
        };

        if (!string.IsNullOrEmpty(description))
        {
            metric.Attributes["description"] = description;
        }

        return metric;
    }

    private Dictionary<string, object> ExtractResourceAttributes(JsonElement resourceMetric)
    {
        var resource = new Dictionary<string, object>();

        if (resourceMetric.TryGetProperty("resource", out var resourceElement) &&
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
