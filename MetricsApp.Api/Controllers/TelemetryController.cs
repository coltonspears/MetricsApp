using Microsoft.AspNetCore.Mvc;
using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.Caching;
using MetricsApp.Core.Models;
using MetricsApp.Api.Models;
using System.Text.Json;

namespace MetricsApp.Api.Controllers;

/// <summary>
/// Unified telemetry API for frontend consumption.
/// Provides querying capabilities for metrics, logs, and traces.
/// </summary>
[ApiController]
[Route("api/v1/[controller]")]
public class TelemetryController : ControllerBase
{
    private readonly IDataRepository _dataRepository;
    private readonly ICachingService _cachingService;
    private readonly ILogger<TelemetryController> _logger;

    public TelemetryController(
        IDataRepository dataRepository,
        ICachingService cachingService,
        ILogger<TelemetryController> logger)
    {
        _dataRepository = dataRepository;
        _cachingService = cachingService;
        _logger = logger;
    }

    /// <summary>
    /// Query metrics data with time range and filters
    /// </summary>
    [HttpGet("metrics")]
    [ProducesResponseType(typeof(QueryApiSuccessResponse<TelemetryMetricsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> QueryMetrics(
        [FromQuery] DateTimeOffset startTime,
        [FromQuery] DateTimeOffset endTime,
        [FromQuery] string[]? metricNames = null,
        [FromQuery] int limit = 1000,
        [FromQuery] string? step = null)
    {
        if (startTime == default || endTime == default || startTime >= endTime)
        {
            return BadRequest(new QueryApiErrorResponse("Invalid time range", "InvalidInput"));
        }

        try
        {
            var cacheKey = $"telemetry-metrics-{startTime:O}-{endTime:O}-{string.Join(",", metricNames ?? Array.Empty<string>())}-{limit}";
            
            var cachedResult = await _cachingService.GetAsync<TelemetryMetricsResponse>(cacheKey, HttpContext.RequestAborted);
            if (cachedResult != null)
            {
                return Ok(new QueryApiSuccessResponse<TelemetryMetricsResponse>(cachedResult));
            }

            var criteria = new MetricQueryCriteria
            {
                StartTime = startTime,
                EndTime = endTime,
                Query = BuildMetricQuery(metricNames),
                Limit = Math.Min(limit, 10000)
            };

            var result = await _dataRepository.QueryMetricsAsync(criteria, HttpContext.RequestAborted);
            var response = ConvertToTelemetryResponse(result);

            await _cachingService.SetAsync(cacheKey, response, TimeSpan.FromMinutes(1), cancellationToken: HttpContext.RequestAborted);
            
            return Ok(new QueryApiSuccessResponse<TelemetryMetricsResponse>(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying telemetry metrics");
            return StatusCode(500, new QueryApiErrorResponse("Failed to query metrics", "InternalServerError"));
        }
    }

    /// <summary>
    /// Get metric metadata including available metrics, labels, and types
    /// </summary>
    [HttpGet("metrics/metadata")]
    [ProducesResponseType(typeof(QueryApiSuccessResponse<MetricMetadataResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetMetricMetadata()
    {
        try
        {
            var schema = await _dataRepository.GetMetricSchemaAsync(HttpContext.RequestAborted);
            var response = new MetricMetadataResponse
            {
                Metrics = ConvertSchemaToMetadata(schema),
                LastUpdated = DateTimeOffset.UtcNow
            };

            return Ok(new QueryApiSuccessResponse<MetricMetadataResponse>(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting metric metadata");
            return StatusCode(500, new QueryApiErrorResponse("Failed to get metadata", "InternalServerError"));
        }
    }

    /// <summary>
    /// Query logs with time range and filters
    /// </summary>
    [HttpGet("logs")]
    [ProducesResponseType(typeof(QueryApiSuccessResponse<TelemetryLogsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> QueryLogs(
        [FromQuery] DateTimeOffset startTime,
        [FromQuery] DateTimeOffset endTime,
        [FromQuery] string? level = null,
        [FromQuery] string? search = null,
        [FromQuery] int limit = 1000)
    {
        if (startTime == default || endTime == default || startTime >= endTime)
        {
            return BadRequest(new QueryApiErrorResponse("Invalid time range", "InvalidInput"));
        }

        try
        {
            var criteria = new LogQueryCriteria
            {
                StartTime = startTime,
                EndTime = endTime,
                Query = search, // Use Query property instead of SearchText
                Limit = Math.Min(limit, 10000)
            };

            var result = await _dataRepository.QueryLogsAsync(criteria, HttpContext.RequestAborted);
            var response = ConvertLogsToTelemetryResponse(result);

            return Ok(new QueryApiSuccessResponse<TelemetryLogsResponse>(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying telemetry logs");
            return StatusCode(500, new QueryApiErrorResponse("Failed to query logs", "InternalServerError"));
        }
    }

    /// <summary>
    /// Query traces with time range and filters
    /// </summary>
    [HttpGet("traces")]
    [ProducesResponseType(typeof(QueryApiSuccessResponse<TelemetryTracesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> QueryTraces(
        [FromQuery] DateTimeOffset startTime,
        [FromQuery] DateTimeOffset endTime,
        [FromQuery] string? traceId = null,
        [FromQuery] string? serviceName = null,
        [FromQuery] int limit = 100)
    {
        if (startTime == default || endTime == default || startTime >= endTime)
        {
            return BadRequest(new QueryApiErrorResponse("Invalid time range", "InvalidInput"));
        }

        try
        {
            // TODO: Implement trace querying when repository supports it
            var response = new TelemetryTracesResponse
            {
                Traces = new List<TelemetryTrace>(),
                TimeRange = new TelemetryTimeRange
                {
                    StartTime = startTime,
                    EndTime = endTime
                }
            };

            return Ok(new QueryApiSuccessResponse<TelemetryTracesResponse>(response));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying telemetry traces");
            return StatusCode(500, new QueryApiErrorResponse("Failed to query traces", "InternalServerError"));
        }
    }

    /// <summary>
    /// Health check for telemetry services
    /// </summary>
    [HttpGet("health")]
    [ProducesResponseType(typeof(TelemetryHealthResponse), StatusCodes.Status200OK)]
    public IActionResult GetHealth()
    {
        var health = new TelemetryHealthResponse
        {
            Status = "healthy",
            Services = new Dictionary<string, string>
            {
                ["metrics"] = "available",
                ["logs"] = "available", 
                ["traces"] = "available",
                ["otlp"] = "available"
            },
            Timestamp = DateTimeOffset.UtcNow
        };

        return Ok(health);
    }

    /// <summary>
    /// Get telemetry statistics
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(TelemetryStatsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            // TODO: Implement real statistics from repository
            var stats = new TelemetryStatsResponse
            {
                Metrics = new TelemetryDataStats { Count = 0, LastReceived = null },
                Logs = new TelemetryDataStats { Count = 0, LastReceived = null },
                Traces = new TelemetryDataStats { Count = 0, LastReceived = null },
                Timestamp = DateTimeOffset.UtcNow
            };

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting telemetry stats");
            return StatusCode(500, new QueryApiErrorResponse("Failed to get stats", "InternalServerError"));
        }
    }

    private string BuildMetricQuery(string[]? metricNames)
    {
        if (metricNames?.Length > 0)
        {
            return $"metricName={string.Join("|", metricNames)}";
        }
        return string.Empty;
    }

    private TelemetryMetricsResponse ConvertToTelemetryResponse(MetricQueryResult result)
    {
        var metrics = new List<TelemetryMetric>();

        if (result.Result is IEnumerable<MetricTimeSeries> timeSeries)
        {
            foreach (var series in timeSeries)
            {
                var metric = new TelemetryMetric
                {
                    Name = series.MetricInfo.Name,
                    Type = DetermineMetricType(series.MetricInfo),
                    Unit = series.MetricInfo.Attributes.TryGetValue("unit", out var unit) ? unit?.ToString() : null,
                    Description = series.MetricInfo.Attributes.TryGetValue("description", out var desc) ? desc?.ToString() : null,
                    Samples = series.Values.Select(v => new TelemetryMetricSample
                    {
                        Timestamp = v.Item1,
                        Value = ParseValue(v.Item2),
                        Labels = ExtractLabels(series.MetricInfo)
                    }).ToList()
                };

                metrics.Add(metric);
            }
        }

        return new TelemetryMetricsResponse
        {
            Metrics = metrics,
            TimeRange = new TelemetryTimeRange
            {
                StartTime = DateTimeOffset.MinValue, // MetricQueryResult doesn't have QueryTimeRange
                EndTime = DateTimeOffset.MaxValue
            }
        };
    }

    private TelemetryLogsResponse ConvertLogsToTelemetryResponse(LogQueryResult result)
    {
        var logs = result.Logs.Select(log => new TelemetryLogEntry
        {
            Timestamp = log.Timestamp,
            Level = log.SeverityText ?? "INFO",
            Message = log.Body?.ToString() ?? "",
            Source = log.Attributes.TryGetValue("source", out var source) ? source?.ToString() ?? "" : "",
            TraceId = log.TraceId,
            SpanId = log.SpanId,
            Attributes = log.Attributes ?? new Dictionary<string, object>()
        }).ToList();

        return new TelemetryLogsResponse
        {
            Logs = logs,
            TimeRange = new TelemetryTimeRange
            {
                StartTime = DateTimeOffset.MinValue, // LogQueryResult doesn't have QueryTimeRange
                EndTime = DateTimeOffset.MaxValue
            }
        };
    }

    private List<TelemetryMetricMetadata> ConvertSchemaToMetadata(RepositoryMetricSchema schema)
    {
        return schema.MetricNames.Select(name => new TelemetryMetricMetadata
        {
            Name = name,
            Type = "gauge", // Default type, can be enhanced
            Description = null,
            Unit = null,
            Labels = schema.AttributeKeys.ToList(),
            LastSeen = DateTimeOffset.UtcNow,
            SampleCount = 0 // TODO: Get from repository
        }).ToList();
    }

    private string DetermineMetricType(MetricDefinition metricInfo)
    {
        // Try to determine type from attributes or name patterns
        if (metricInfo.Attributes.TryGetValue("type", out var type) && type != null)
        {
            return type.ToString();
        }

        var name = metricInfo.Name.ToLower();
        if (name.Contains("counter") || name.Contains("count") || name.Contains("total"))
        {
            return "counter";
        }
        if (name.Contains("histogram") || name.Contains("duration") || name.Contains("size"))
        {
            return "histogram";
        }

        return "gauge";
    }

    private double ParseValue(string value)
    {
        return double.TryParse(value, out var result) ? result : 0.0;
    }

    private Dictionary<string, string> ExtractLabels(MetricDefinition metricInfo)
    {
        var labels = new Dictionary<string, string>();
        
        // Add resource labels
        foreach (var (key, value) in metricInfo.Resource)
        {
            if (value != null)
            {
                labels[$"resource.{key}"] = value.ToString()!;
            }
        }
        
        // Add attribute labels (excluding internal metadata)
        foreach (var (key, value) in metricInfo.Attributes)
        {
            if (value != null && !key.StartsWith("__"))
            {
                labels[key] = value.ToString()!;
            }
        }
        
        return labels;
    }
}

// Response DTOs for telemetry endpoints
public class TelemetryMetricsResponse
{
    public List<TelemetryMetric> Metrics { get; set; } = new();
    public TelemetryTimeRange TimeRange { get; set; } = new();
}

public class TelemetryMetric
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public string? Description { get; set; }
    public List<TelemetryMetricSample> Samples { get; set; } = new();
}

public class TelemetryMetricSample
{
    public long Timestamp { get; set; }
    public double Value { get; set; }
    public Dictionary<string, string> Labels { get; set; } = new();
}

public class MetricMetadataResponse
{
    public List<TelemetryMetricMetadata> Metrics { get; set; } = new();
    public DateTimeOffset LastUpdated { get; set; }
}

public class TelemetryMetricMetadata
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public List<string> Labels { get; set; } = new();
    public DateTimeOffset LastSeen { get; set; }
    public int SampleCount { get; set; }
}

public class TelemetryLogsResponse
{
    public List<TelemetryLogEntry> Logs { get; set; } = new();
    public TelemetryTimeRange TimeRange { get; set; } = new();
}

public class TelemetryLogEntry
{
    public DateTimeOffset Timestamp { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Source { get; set; }
    public string? TraceId { get; set; }
    public string? SpanId { get; set; }
    public Dictionary<string, object> Attributes { get; set; } = new();
}

public class TelemetryTracesResponse
{
    public List<TelemetryTrace> Traces { get; set; } = new();
    public TelemetryTimeRange TimeRange { get; set; } = new();
}

public class TelemetryTrace
{
    public string TraceId { get; set; } = string.Empty;
    public List<TelemetrySpan> Spans { get; set; } = new();
}

public class TelemetrySpan
{
    public string SpanId { get; set; } = string.Empty;
    public string? ParentSpanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset EndTime { get; set; }
    public Dictionary<string, object> Attributes { get; set; } = new();
}

public class TelemetryTimeRange
{
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset EndTime { get; set; }
}

public class TelemetryHealthResponse
{
    public string Status { get; set; } = string.Empty;
    public Dictionary<string, string> Services { get; set; } = new();
    public DateTimeOffset Timestamp { get; set; }
}

public class TelemetryStatsResponse
{
    public TelemetryDataStats Metrics { get; set; } = new();
    public TelemetryDataStats Logs { get; set; } = new();
    public TelemetryDataStats Traces { get; set; } = new();
    public DateTimeOffset Timestamp { get; set; }
}

public class TelemetryDataStats
{
    public long Count { get; set; }
    public DateTimeOffset? LastReceived { get; set; }
}
