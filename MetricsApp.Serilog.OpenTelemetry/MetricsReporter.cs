using System.Text.Json;
using System.Text;
using System.Collections.Concurrent;
using MetricsApp.Serilog.OpenTelemetry.Helpers;

namespace MetricsApp.Serilog.OpenTelemetry;

public class MetricsReporter : IDisposable
{
    private readonly OpenTelemetryConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly ConcurrentDictionary<string, MetricData> _metrics;
    private readonly Timer _reportTimer;
    private volatile bool _disposed;

    public MetricsReporter(OpenTelemetryConfiguration config)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _httpClient = new HttpClient { Timeout = _config.HttpTimeout };
        _metrics = new ConcurrentDictionary<string, MetricData>();

        // Add custom headers
        foreach (var header in _config.Headers)
        {
            _httpClient.DefaultRequestHeaders.Add(header.Key, header.Value);
        }

        // Set up periodic reporting
        _reportTimer = new Timer(
            async _ => await ReportMetricsAsync(),
            null,
            TimeSpan.FromSeconds(_config.FlushIntervalSeconds),
            TimeSpan.FromSeconds(_config.FlushIntervalSeconds));
    }

    /// <summary>
    /// Records a counter metric (monotonically increasing value)
    /// </summary>
    public void RecordCounter(string name, double value, Dictionary<string, string>? tags = null, string? description = null, string? unit = null)
    {
        if (_disposed || !_config.EnableMetrics) return;

        var metricData = new MetricData
        {
            Name = name,
            Type = "counter",
            Description = description,
            Unit = unit,
            Value = value,
            Tags = tags ?? new Dictionary<string, string>(),
            Timestamp = DateTimeOffset.UtcNow
        };

        _metrics.AddOrUpdate(GenerateMetricKey(name, tags), metricData, (_, existing) =>
        {
            existing.Value += value; // Counters are cumulative
            existing.Timestamp = DateTimeOffset.UtcNow;
            return existing;
        });
    }

    /// <summary>
    /// Records a gauge metric (current value)
    /// </summary>
    public void RecordGauge(string name, double value, Dictionary<string, string>? tags = null, string? description = null, string? unit = null)
    {
        if (_disposed || !_config.EnableMetrics) return;

        var metricData = new MetricData
        {
            Name = name,
            Type = "gauge",
            Description = description,
            Unit = unit,
            Value = value,
            Tags = tags ?? new Dictionary<string, string>(),
            Timestamp = DateTimeOffset.UtcNow
        };

        _metrics.AddOrUpdate(GenerateMetricKey(name, tags), metricData, (_, _) => metricData);
    }

    /// <summary>
    /// Records a histogram metric (for measuring distributions)
    /// </summary>
    public void RecordHistogram(string name, double value, Dictionary<string, string>? tags = null, string? description = null, string? unit = null)
    {
        if (_disposed || !_config.EnableMetrics) return;

        var metricData = new MetricData
        {
            Name = name,
            Type = "histogram",
            Description = description,
            Unit = unit,
            Value = value,
            Tags = tags ?? new Dictionary<string, string>(),
            Timestamp = DateTimeOffset.UtcNow
        };

        var key = GenerateMetricKey(name, tags);
        _metrics.AddOrUpdate(key, metricData, (_, existing) =>
        {
            // For histograms, we could implement bucket logic here
            // For now, just update with the latest value
            existing.Value = value;
            existing.Timestamp = DateTimeOffset.UtcNow;
            return existing;
        });
    }

    private async Task ReportMetricsAsync()
    {
        if (_disposed || _metrics.IsEmpty)
            return;

        try
        {
            var metricsToSend = new List<MetricData>();
            var keysToRemove = new List<string>();

            foreach (var kvp in _metrics)
            {
                metricsToSend.Add(kvp.Value);
                keysToRemove.Add(kvp.Key);
            }

            // Clear metrics after collecting them
            foreach (var key in keysToRemove)
            {
                _metrics.TryRemove(key, out _);
            }

            if (metricsToSend.Count == 0)
                return;

            var otlpPayload = CreateOtlpMetricsPayload(metricsToSend);
            await SendMetricsAsync(otlpPayload);
        }
        catch (Exception ex)
        {
            if (_config.LogFailures)
            {
                Console.WriteLine($"MetricsReporter error: {ex.Message}");
            }
        }
    }

    private object CreateOtlpMetricsPayload(List<MetricData> metrics)
    {
        var otlpMetrics = metrics.Select(metric => new
        {
            name = metric.Name,
            description = metric.Description ?? "",
            unit = metric.Unit ?? "",
            gauge = metric.Type == "gauge" ? new
            {
                dataPoints = new[]
                {
                    new
                    {
                        timeUnixNano = metric.Timestamp.ToUnixTimeNanoseconds().ToString(),
                        asDouble = metric.Value,
                        attributes = metric.Tags.Select(tag => new
                        {
                            key = tag.Key,
                            value = new { stringValue = tag.Value }
                        }).ToArray()
                    }
                }
            } : null,
            sum = metric.Type == "counter" ? new
            {
                dataPoints = new[]
                {
                    new
                    {
                        timeUnixNano = metric.Timestamp.ToUnixTimeNanoseconds().ToString(),
                        asDouble = metric.Value,
                        attributes = metric.Tags.Select(tag => new
                        {
                            key = tag.Key,
                            value = new { stringValue = tag.Value }
                        }).ToArray()
                    }
                },
                aggregationTemporality = 2, // CUMULATIVE
                isMonotonic = true
            } : null,
            histogram = metric.Type == "histogram" ? new
            {
                dataPoints = new[]
                {
                    new
                    {
                        timeUnixNano = metric.Timestamp.ToUnixTimeNanoseconds().ToString(),
                        count = 1L,
                        sum = metric.Value,
                        bucketCounts = new long[] { 0, 1, 0 },
                        explicitBounds = new double[] { 0, 100 },
                        attributes = metric.Tags.Select(tag => new
                        {
                            key = tag.Key,
                            value = new { stringValue = tag.Value }
                        }).ToArray()
                    }
                },
                aggregationTemporality = 2 // CUMULATIVE
            } : null
        }).ToArray();

        return new
        {
            resourceMetrics = new[]
            {
                new
                {
                    resource = new
                    {
                        attributes = GetResourceAttributesArray()
                    },
                    scopeMetrics = new[]
                    {
                        new
                        {
                            scope = new
                            {
                                name = _config.ServiceName + "-metrics",
                                version = _config.ServiceVersion
                            },
                            metrics = otlpMetrics
                        }
                    }
                }
            }
        };
    }

    private async Task SendMetricsAsync(object payload)
    {
        var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.PostAsync($"{_config.Endpoint}/api/v1/ingest/otlp/metrics", content);

            if (!response.IsSuccessStatusCode && _config.LogFailures)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"Failed to send metrics to OpenTelemetry backend: {response.StatusCode} - {responseContent}");
            }
        }
        catch (Exception ex)
        {
            if (_config.LogFailures)
            {
                Console.WriteLine($"Network error sending metrics to OpenTelemetry backend: {ex.Message}");
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

    private static string GenerateMetricKey(string name, Dictionary<string, string>? tags)
    {
        if (tags == null || tags.Count == 0)
            return name;

        var sortedTags = tags.OrderBy(kvp => kvp.Key);
        var tagString = string.Join(",", sortedTags.Select(kvp => $"{kvp.Key}={kvp.Value}"));
        return $"{name}|{tagString}";
    }

    /// <summary>
    /// Immediately sends all pending metrics
    /// </summary>
    public async Task FlushAsync()
    {
        await ReportMetricsAsync();
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;

        // Flush any remaining metrics
        ReportMetricsAsync().Wait(TimeSpan.FromSeconds(5));

        _reportTimer?.Dispose();
        _httpClient?.Dispose();
    }

    private class MetricData
    {
        public string Name { get; set; } = "";
        public string Type { get; set; } = "";
        public string? Description { get; set; }
        public string? Unit { get; set; }
        public double Value { get; set; }
        public Dictionary<string, string> Tags { get; set; } = new();
        public DateTimeOffset Timestamp { get; set; }
    }
}

