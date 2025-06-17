namespace MetricsApp.Core.Models;

public class RepositoryMetricSchema
{
    public List<string> MetricNames { get; set; } = new List<string>();
    public List<string> AttributeKeys { get; set; } = new List<string>();
    public List<string> ResourceKeys { get; set; } = new List<string>();
}