namespace MetricsApp.Parser.WindowsPerfCounters.Models;

public class WindowsPerfCounterPayloadV2
{
    /// <summary>
    /// Performance counter category (e.g., "Processor", "Memory")
    /// </summary>
    public string? CounterSet { get; set; }
    
    /// <summary>
    /// Counter name (e.g., "% Processor Time")
    /// </summary>
    public string? CounterName { get; set; }
    
    /// <summary>
    /// Instance name (if applicable)
    /// </summary>
    public string? InstanceName { get; set; }
    
    /// <summary>
    /// The collected value (after scaling)
    /// </summary>
    public double Value { get; set; }
    
    /// <summary>
    /// Unit of measurement (e.g., "percent", "bytes", "count")
    /// </summary>
    public string Unit { get; set; } = "value";
    
    /// <summary>
    /// Friendly display name for the metric
    /// </summary>
    public string? DisplayName { get; set; }
    
    /// <summary>
    /// Additional tags for filtering and grouping
    /// </summary>
    public Dictionary<string, string> Tags { get; set; } = new();
} 