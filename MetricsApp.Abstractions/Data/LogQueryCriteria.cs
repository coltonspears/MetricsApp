namespace MetricsApp.Abstractions.Data;

public class LogQueryCriteria
{
    public string? Query { get; set; }
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset EndTime { get; set; }
    public int Limit { get; set; } = 100;
    public int Offset { get; set; } = 0; // For offset-based pagination
    public string? PageToken { get; set; } // For token-based pagination
    public string Sort { get; set; } = "timestamp_desc"; // e.g., "timestamp_desc", "timestamp_asc"
    public List<string>? Fields { get; set; } // Specific fields to return
}