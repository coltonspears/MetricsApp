namespace MetricsApp.Abstractions.Data;

public class MetricQueryResult
{
    public string ResultType { get; set; } = "matrix"; // e.g., "matrix", "vector", "scalar"
    public List<MetricTimeSeries> Result { get; set; } = new List<MetricTimeSeries>();
    public string? ErrorType { get; set; }
    public string? ErrorMessage { get; set; }
}