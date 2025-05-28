namespace MetricsApp.Core.Models;

public class MetricQueryCriteria
{
    public string Query { get; set; } = string.Empty;
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset EndTime { get; set; }
    public string? Step { get; set; } // e.g., "30s", "1m", "5m"
    public string? Aggregator { get; set; } // e.g., "avg", "sum", "min", "max"
    public int Limit { get; set; } = 1000;

}