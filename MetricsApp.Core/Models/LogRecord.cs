namespace MetricsApp.Core.Models;

/// <summary>
/// Unified LogRecord model.
/// </summary>
public class LogRecord
{
    public DateTimeOffset Timestamp { get; set; }
    public DateTimeOffset ObservedTimestamp { get; set; }
    public string? SeverityText { get; set; }
    
    // OpenTelemetry LogSeverity enum values
    public int? SeverityNumber { get; set; } 
    
    // Can be string or structured (e.g., Dictionary<string, object>)
    public object? Body { get; set; } 
    public Dictionary<string, object> Attributes { get; set; } = new Dictionary<string, object>();
    public Dictionary<string, object> Resource { get; set; } = new Dictionary<string, object>();
    public string? TraceId { get; set; }
    public string? SpanId { get; set; }
}