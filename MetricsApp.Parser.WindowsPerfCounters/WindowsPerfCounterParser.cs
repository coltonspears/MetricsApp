using System.Text.Json;
using MetricsApp.Abstractions.Parsers;
using MetricsApp.Core.Models;
using MetricsApp.Parser.WindowsPerfCounters.Models;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Parser.WindowsPerfCounters;

public class WindowsPerfCounterParser : IDataParser
{
    private readonly ILogger<WindowsPerfCounterParser> _logger;
    private const string SourceTypeWinPerfCounter = "WindowsPerfCounter";

    public WindowsPerfCounterParser(ILogger<WindowsPerfCounterParser> logger)
    {
        _logger = logger;
        _logger.LogInformation("WindowsPerfCounterParser initialized.");
    }

    public bool CanParse(string sourceType)
    {
        return SourceTypeWinPerfCounter.Equals(sourceType, StringComparison.OrdinalIgnoreCase);
    }

    public IEnumerable<object> Parse(EventDto rawEvent)
    {
        if (rawEvent.Payload == null)
        {
            _logger.LogWarning("WindowsPerfCounter event payload is null for event from host {HostName} at {Timestamp}.", rawEvent.HostName, rawEvent.Timestamp);
            return Enumerable.Empty<object>();
        }

        WindowsPerfCounterPayload? perfPayload = null;

        if (rawEvent.Payload is JsonElement jsonElement)
        {
            try
            {
                perfPayload = JsonSerializer.Deserialize<WindowsPerfCounterPayload>(jsonElement.GetRawText(), new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to deserialize WindowsPerfCounter payload from JsonElement for host {HostName}.", rawEvent.HostName);
                return Enumerable.Empty<object>();
            }
        }
        else if (rawEvent.Payload is WindowsPerfCounterPayload directPayload)
        {
            perfPayload = directPayload;
        }
        else if (rawEvent.Payload is IDictionary<string, object> dictPayload) // If payload is dictionary
        {
             try
            {
                perfPayload = new WindowsPerfCounterPayload
                {
                    CounterSet = dictPayload.TryGetValue("counterSet", out var cs) ? cs?.ToString() : null,
                    CounterName = dictPayload.TryGetValue("counterName", out var cn) ? cn?.ToString() : null,
                    InstanceName = dictPayload.TryGetValue("instanceName", out var ins) ? ins?.ToString() : null,
                    Value = dictPayload.TryGetValue("value", out var val) && val is IConvertible ? Convert.ToDouble(val) : 0.0
                };
            }
            catch (Exception ex)
            {
                 _logger.LogError(ex, "Failed to map dictionary payload to WindowsPerfCounterPayload for host {HostName}.", rawEvent.HostName);
                return Enumerable.Empty<object>();
            }
        }
        else
        {
             _logger.LogWarning("Unsupported payload type '{PayloadType}' for WindowsPerfCounter event from host {HostName}.", rawEvent.Payload.GetType().FullName, rawEvent.HostName);
            return Enumerable.Empty<object>();
        }


        if (perfPayload == null || string.IsNullOrWhiteSpace(perfPayload.CounterSet) || string.IsNullOrWhiteSpace(perfPayload.CounterName))
        {
            _logger.LogWarning("Invalid or incomplete WindowsPerfCounter payload for host {HostName}: {@Payload}", rawEvent.HostName, perfPayload);
            return Enumerable.Empty<object>();
        }

        // Metric Naming Convention (example from MVP doc)
        // "windows.perf.{counterSet}.{counterName}.{instanceName}"
        // Normalize names: lowercase, replace spaces with underscores, handle "%"
        var normalizedCounterSet = perfPayload.CounterSet.ToLowerInvariant().Replace(" ", "_");
        var normalizedCounterName = perfPayload.CounterName.ToLowerInvariant()
                                        .Replace("% ", "percent_")
                                        .Replace(" ", "_")
                                        .Replace("(", "")
                                        .Replace(")", "");
        var normalizedInstanceNameSegment = string.IsNullOrWhiteSpace(perfPayload.InstanceName)
                                        ? ""
                                        : $".{perfPayload.InstanceName.ToLowerInvariant().Replace(" ", "_").Replace("\\", "_").Replace("/", "_").Replace("#", "num_")}";

        var metricName = $"windows.perf.{normalizedCounterSet}.{normalizedCounterName}{normalizedInstanceNameSegment}";

        // Determine unit (simplified for MVP)
        string? unit = null;
        if (perfPayload.CounterName.Contains("%"))
        {
            unit = "%";
        }
        else if (perfPayload.CounterName.ToLower().Contains("bytes"))
        {
            unit = "bytes";
        }
        else if (perfPayload.CounterName.ToLower().Contains("seconds"))
        {
            unit = "s";
        }


        var metric = new Metric
        {
            Name = metricName,
            Unit = unit,
            Type = MetricType.Gauge,
            Timestamp = rawEvent.Timestamp,
            GaugeValueDouble = perfPayload.Value,
            Resource = new Dictionary<string, object>
            {
                { "host.name", rawEvent.HostName }
            },
            Attributes = new Dictionary<string, object>
            {
                { "counterSet", perfPayload.CounterSet }, // Original counterSet name
                { "originalCounterName", perfPayload.CounterName } // Original counter name
            }
        };
        if (!string.IsNullOrWhiteSpace(perfPayload.InstanceName))
        {
            metric.Attributes.Add("instance", perfPayload.InstanceName);
        }


        _logger.LogDebug("Parsed WindowsPerfCounter: {MetricName} from host {HostName} with value {Value}", metric.Name, rawEvent.HostName, metric.GaugeValueDouble);
        return new List<object> { metric };
    }
}
