namespace MetricsApp.Serilog.OpenTelemetry;

public class OpenTelemetryConfiguration
{
    /// <summary>
    /// The OpenTelemetry endpoint URL (e.g., "https://localhost:7201")
    /// </summary>
    public string Endpoint { get; set; } = "https://localhost:7201";

    /// <summary>
    /// Service name for telemetry data
    /// </summary>
    public string ServiceName { get; set; } = "unknown-service";

    /// <summary>
    /// Service version
    /// </summary>
    public string ServiceVersion { get; set; } = "1.0.0";

    /// <summary>
    /// Deployment environment (e.g., "production", "staging", "development")
    /// </summary>
    public string Environment { get; set; } = "development";

    /// <summary>
    /// Host name
    /// </summary>
    public string HostName { get; set; } = System.Environment.MachineName;

    /// <summary>
    /// Number of log events to batch before sending
    /// </summary>
    public int BatchSize { get; set; } = 50;

    /// <summary>
    /// Interval in seconds between automatic flushes
    /// </summary>
    public int FlushIntervalSeconds { get; set; } = 5;

    /// <summary>
    /// Whether to log failures to console
    /// </summary>
    public bool LogFailures { get; set; } = true;

    /// <summary>
    /// Additional resource attributes to include with all telemetry data
    /// </summary>
    public Dictionary<string, string> ResourceAttributes { get; set; } = new();

    /// <summary>
    /// HTTP timeout for sending data
    /// </summary>
    public TimeSpan HttpTimeout { get; set; } = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Whether to enable metrics collection
    /// </summary>
    public bool EnableMetrics { get; set; } = true;

    /// <summary>
    /// Whether to enable traces collection
    /// </summary>
    public bool EnableTraces { get; set; } = true;

    /// <summary>
    /// Whether to enable logs collection
    /// </summary>
    public bool EnableLogs { get; set; } = true;

    /// <summary>
    /// Additional headers to send with requests
    /// </summary>
    public Dictionary<string, string> Headers { get; set; } = new();
}

