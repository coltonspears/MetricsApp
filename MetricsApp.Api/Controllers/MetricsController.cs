using Microsoft.AspNetCore.Mvc;
using MetricsApp.Abstractions.Data;
using MetricsApp.Core.Models;
using MetricsApp.Parser.WindowsPerfCounters.Models;
using System.Text.Json;

namespace MetricsApp.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class MetricsController : ControllerBase
{
    private readonly IDataRepository _dataRepository;
    private readonly ILogger<MetricsController> _logger;

    public MetricsController(
        IDataRepository dataRepository,
        ILogger<MetricsController> logger)
    {
        _dataRepository = dataRepository;
        _logger = logger;
    }

    /// <summary>
    /// Get recent performance counter metrics for dashboards
    /// </summary>
    [HttpGet("performance-counters")]
    public async Task<ActionResult<PerformanceCounterMetricsResponse>> GetPerformanceCounters(
        [FromQuery] int minutes = 60,
        [FromQuery] string? counterName = null,
        [FromQuery] string? hostName = null)
    {
        try
        {
            var startTime = DateTime.UtcNow.AddMinutes(-minutes);
            var endTime = DateTime.UtcNow;

            var criteria = new MetricQueryCriteria
            {
                StartTime = startTime,
                EndTime = endTime,
                Query = $"metricName=win.perfcounter",
                Limit = 10000
            };

            var result = await _dataRepository.QueryMetricsAsync(criteria);
            
            var metrics = new List<PerformanceCounterMetric>();
            
            if (result.Result is IEnumerable<MetricTimeSeries> timeSeries)
            {
                foreach (var series in timeSeries)
                {
                    var metricName = series.MetricInfo.Name;
                    var attributes = series.MetricInfo.Attributes;
                    var resource = series.MetricInfo.Resource;
                    
                    // Extract performance counter information from attributes
                    var counterSet = attributes.TryGetValue("counter_set", out var cs) ? cs?.ToString() : null;
                    var counterNameAttr = attributes.TryGetValue("counter_name", out var cn) ? cn?.ToString() : null;
                    var instanceName = attributes.TryGetValue("instance_name", out var ins) ? ins?.ToString() : null;
                    var unit = attributes.TryGetValue("unit", out var u) ? u?.ToString() : "value";
                    var displayName = attributes.TryGetValue("display_name", out var dn) ? dn?.ToString() : null;
                    var host = resource.TryGetValue("host", out var h) ? h?.ToString() : "Unknown";

                    // Apply filters
                    if (hostName != null && !string.Equals(host, hostName, StringComparison.OrdinalIgnoreCase))
                        continue;
                    
                    if (counterName != null && (counterNameAttr == null || !counterNameAttr.Contains(counterName, StringComparison.OrdinalIgnoreCase)))
                        continue;

                    foreach (var (timestamp, value) in series.Values)
                    {
                        if (double.TryParse(value, out var doubleValue))
                        {
                            metrics.Add(new PerformanceCounterMetric
                            {
                                Timestamp = DateTimeOffset.FromUnixTimeSeconds(timestamp),
                                HostName = host,
                                CounterSet = counterSet,
                                CounterName = counterNameAttr,
                                InstanceName = instanceName,
                                Value = doubleValue,
                                Unit = unit,
                                DisplayName = displayName ?? $"{counterSet}\\{counterNameAttr}",
                                Tags = attributes.ToDictionary(kv => kv.Key, kv => kv.Value?.ToString() ?? string.Empty)
                            });
                        }
                    }
                }
            }

            var response = new PerformanceCounterMetricsResponse
            {
                Metrics = metrics.OrderBy(m => m.Timestamp).ToList(),
                TimeRange = new TimeRange
                {
                    StartTime = startTime,
                    EndTime = endTime
                },
                TotalCount = metrics.Count
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving performance counter metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get aggregated metrics for dashboard widgets
    /// </summary>
    [HttpGet("dashboard-summary")]
    public async Task<ActionResult<DashboardSummaryResponse>> GetDashboardSummary(
        [FromQuery] int minutes = 5)
    {
        try
        {
            var startTime = DateTime.UtcNow.AddMinutes(-minutes);
            var endTime = DateTime.UtcNow;

            var criteria = new MetricQueryCriteria
            {
                StartTime = startTime,
                EndTime = endTime,
                Query = $"metricName=win.perfcounter",
                Limit = 1000
            };

            var result = await _dataRepository.QueryMetricsAsync(criteria);
            
            var metrics = new List<PerformanceCounterMetric>();
            
            if (result.Result is IEnumerable<MetricTimeSeries> timeSeries)
            {
                foreach (var series in timeSeries)
                {
                    var attributes = series.MetricInfo.Attributes;
                    var resource = series.MetricInfo.Resource;
                    
                    var counterName = attributes.TryGetValue("counter_name", out var cn) ? cn?.ToString() : null;
                    var instanceName = attributes.TryGetValue("instance_name", out var ins) ? ins?.ToString() : null;
                    var host = resource.TryGetValue("host", out var h) ? h?.ToString() : "Unknown";

                    foreach (var (timestamp, value) in series.Values)
                    {
                        if (double.TryParse(value, out var doubleValue))
                        {
                            metrics.Add(new PerformanceCounterMetric
                            {
                                Timestamp = DateTimeOffset.FromUnixTimeSeconds(timestamp),
                                HostName = host,
                                CounterName = counterName,
                                InstanceName = instanceName,
                                Value = doubleValue
                            });
                        }
                    }
                }
            }

            var summary = new DashboardSummaryResponse
            {
                CpuUsage = GetLatestMetricValue(metrics, "% Processor Time", "_Total"),
                MemoryAvailableMB = GetLatestMetricValue(metrics, "Available MBytes"),
                DiskUsage = GetLatestMetricValue(metrics, "% Disk Time", "_Total"),
                LastUpdated = DateTime.UtcNow,
                MetricsCount = metrics.Count
            };

            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dashboard summary");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get available metric names and instances
    /// </summary>
    [HttpGet("available-metrics")]
    public async Task<ActionResult<AvailableMetricsResponse>> GetAvailableMetrics()
    {
        try
        {
            var startTime = DateTime.UtcNow.AddHours(-1);
            var criteria = new MetricQueryCriteria
            {
                StartTime = startTime,
                EndTime = DateTime.UtcNow,
                Query = $"metricName=win.perfcounter",
                Limit = 1000
            };

            var result = await _dataRepository.QueryMetricsAsync(criteria);
            
            var counterGroups = new List<AvailableMetric>();
            
            if (result.Result is IEnumerable<MetricTimeSeries> timeSeries)
            {
                var groupedSeries = timeSeries
                    .GroupBy(s => new 
                    { 
                        CounterSet = s.MetricInfo.Attributes.TryGetValue("counter_set", out var cs) ? cs?.ToString() : "Unknown",
                        CounterName = s.MetricInfo.Attributes.TryGetValue("counter_name", out var cn) ? cn?.ToString() : "Unknown"
                    })
                    .ToList();

                foreach (var group in groupedSeries)
                {
                    var instances = group
                        .SelectMany(s => s.MetricInfo.Attributes.TryGetValue("instance_name", out var ins) && ins != null ? new[] { ins.ToString()! } : Array.Empty<string>())
                        .Where(i => !string.IsNullOrEmpty(i))
                        .Distinct()
                        .ToList();

                    var unit = group.First().MetricInfo.Attributes.TryGetValue("unit", out var u) ? u?.ToString() : "value";
                    var sampleCount = group.Sum(g => g.Values.Count);

                    counterGroups.Add(new AvailableMetric
                    {
                        CounterSet = group.Key.CounterSet,
                        CounterName = group.Key.CounterName,
                        Instances = instances,
                        Unit = unit,
                        SampleCount = sampleCount
                    });
                }
            }

            var response = new AvailableMetricsResponse
            {
                Metrics = counterGroups.OrderBy(m => m.CounterSet).ThenBy(m => m.CounterName).ToList(),
                TotalMetricTypes = counterGroups.Count
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving available metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    private double? GetLatestMetricValue(List<PerformanceCounterMetric> metrics, string counterName, string? instanceName = null)
    {
        return metrics
            .Where(m => m.CounterName == counterName)
            .Where(m => instanceName == null || m.InstanceName == instanceName)
            .OrderByDescending(m => m.Timestamp)
            .FirstOrDefault()?.Value;
    }
}

// Response DTOs
public class PerformanceCounterMetricsResponse
{
    public List<PerformanceCounterMetric> Metrics { get; set; } = new();
    public TimeRange TimeRange { get; set; } = new();
    public int TotalCount { get; set; }
}

public class DashboardSummaryResponse
{
    public double? CpuUsage { get; set; }
    public double? MemoryAvailableMB { get; set; }
    public double? DiskUsage { get; set; }
    public DateTime LastUpdated { get; set; }
    public int MetricsCount { get; set; }
}

public class AvailableMetricsResponse
{
    public List<AvailableMetric> Metrics { get; set; } = new();
    public int TotalMetricTypes { get; set; }
}

public class PerformanceCounterMetric
{
    public DateTimeOffset Timestamp { get; set; }
    public string HostName { get; set; } = string.Empty;
    public string? CounterSet { get; set; }
    public string? CounterName { get; set; }
    public string? InstanceName { get; set; }
    public double Value { get; set; }
    public string? Unit { get; set; }
    public string? DisplayName { get; set; }
    public Dictionary<string, string> Tags { get; set; } = new();
}

public class AvailableMetric
{
    public string CounterSet { get; set; } = string.Empty;
    public string CounterName { get; set; } = string.Empty;
    public List<string> Instances { get; set; } = new();
    public string Unit { get; set; } = string.Empty;
    public int SampleCount { get; set; }
}

public class TimeRange
{
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
} 