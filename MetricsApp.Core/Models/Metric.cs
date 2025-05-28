namespace MetricsApp.Core.Models;

/// <summary>
/// Unified Metric model.
/// </summary>
public class Metric
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public MetricType Type { get; set; }
    
    // Timestamp for the data point(s)
    public DateTimeOffset Timestamp { get; set; } 
    public Dictionary<string, object> Attributes { get; set; } = new Dictionary<string, object>();
    
    // Added for consistency, though not explicitly in OTel metric points directly, useful for context
    public Dictionary<string, object> Resource { get; set; } = new Dictionary<string, object>(); 

    // Fields specific to metric types
    public double? SumValue { get; set; } // For Sum and as part of Histogram
    public long? GaugeValueLong { get; set; } // For Gauge (long)
    public double? GaugeValueDouble { get; set; } // For Gauge (double)

    public bool? IsMonotonic { get; set; } // For Sum
    public AggregationTemporality? AggregationTemporality { get; set; } // For Sum, Histogram

    public long? HistogramCount { get; set; } // For Histogram
    // Histogram SumValue is already defined above
    public List<MetricBucket>? HistogramBuckets { get; set; } // For Histogram
}