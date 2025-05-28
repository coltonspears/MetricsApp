namespace MetricsApp.Abstractions.Data;

/// <summary>
/// Represents a single time series in a metric query result.
/// Inspired by Prometheus matrix result type.
/// </summary>
public class MetricTimeSeries
{
    /// <summary>
    /// Describes the metric series (name, attributes).
    /// </summary>
    public MetricDefinition MetricInfo { get; set; } = new MetricDefinition();

    /// <summary>
    /// List of data points [timestamp_unix_epoch_seconds, value_as_string].
    /// Value is string to accommodate various numeric types without precision loss.
    /// </summary>
    public List<Tuple<long, string>> Values { get; set; } = new List<Tuple<long, string>>();
}