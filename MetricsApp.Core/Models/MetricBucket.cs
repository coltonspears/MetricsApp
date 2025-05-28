namespace MetricsApp.Core.Models;

public class MetricBucket
{
    public double UpperBoundary { get; set; }
    public long Count { get; set; }
}