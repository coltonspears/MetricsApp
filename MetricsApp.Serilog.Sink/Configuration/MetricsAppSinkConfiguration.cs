namespace MetricsApp.Serilog.Sink.Configuration;

/// <summary>
/// Configuration options for the MetricsApp Serilog sink
/// </summary>
public class MetricsAppSinkConfiguration
{
    /// <summary>
    /// The base URL of the MetricsApp API (e.g., "https://localhost:7201")
    /// </summary>
    public string ApiBaseUrl { get; set; } = "https://localhost:7201";

    /// <summary>
    /// The service name to identify logs from this application
    /// </summary>
    public string ServiceName { get; set; } = "unknown-service";

    /// <summary>
    /// The service version for telemetry identification
    /// </summary>
    public string ServiceVersion { get; set; } = "1.0.0";

    /// <summary>
    /// The environment (development, staging, production)
    /// </summary>
    public string Environment { get; set; } = "development";

    /// <summary>
    /// The tenant ID for multi-tenant scenarios
    /// </summary>
    public string TenantId { get; set; } = "default";

    /// <summary>
    /// The host name to use for log entries
    /// </summary>
    public string HostName { get; set; } = System.Environment.MachineName;

    /// <summary>
    /// Which API endpoint to use for sending logs.
    /// - "events" (default): POSTs <c>EventDto[]</c> to <c>/api/v1/ingest/events</c>.
    /// - "otel":   POSTs OTLP-shaped JSON to <c>/api/v1/ingest/otlp/logs</c>.
    /// - "telemetry": legacy alias for "events".
    /// </summary>
    public string TargetEndpoint { get; set; } = "events";

    /// <summary>
    /// Number of log events to batch before sending
    /// </summary>
    public int BatchSize { get; set; } = 100;

    /// <summary>
    /// Interval in seconds between automatic flushes
    /// </summary>
    public int FlushIntervalSeconds { get; set; } = 5;

    /// <summary>
    /// HTTP timeout for API requests in seconds
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Whether to include structured properties as telemetry attributes
    /// </summary>
    public bool IncludeStructuredProperties { get; set; } = true;

    /// <summary>
    /// Whether to include exception details in log payloads
    /// </summary>
    public bool IncludeExceptionDetails { get; set; } = true;

    /// <summary>
    /// Whether to include scope information (correlation IDs, trace context)
    /// </summary>
    public bool IncludeScopeInformation { get; set; } = true;

    /// <summary>
    /// Custom headers to include with API requests
    /// </summary>
    public Dictionary<string, string> CustomHeaders { get; set; } = new();

    /// <summary>
    /// Whether to log sink failures to the console (for debugging)
    /// </summary>
    public bool LogSinkFailures { get; set; } = false;

    /// <summary>
    /// Maximum number of retries for failed API calls
    /// </summary>
    public int MaxRetries { get; set; } = 3;

    /// <summary>
    /// Whether to use OTLP format when targeting the OTEL endpoint
    /// </summary>
    public bool UseOtlpFormat { get; set; } = true;

    /// <summary>
    /// Gets the appropriate API endpoint URL based on the target endpoint configuration
    /// </summary>
    public string GetApiEndpointUrl()
    {
        var baseUrl = ApiBaseUrl.TrimEnd('/');

        return TargetEndpoint.ToLowerInvariant() switch
        {
            "events" => $"{baseUrl}/api/v1/ingest/events",
            "telemetry" => $"{baseUrl}/api/v1/ingest/events",
            "otel" => $"{baseUrl}/api/v1/ingest/otlp/logs",
            _ => $"{baseUrl}/api/v1/ingest/events",
        };
    }

    /// <summary>
    /// Validates the configuration and returns any validation errors
    /// </summary>
    public IEnumerable<string> Validate()
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(ApiBaseUrl))
            errors.Add("ApiBaseUrl is required");

        if (string.IsNullOrWhiteSpace(ServiceName))
            errors.Add("ServiceName is required");

        if (BatchSize <= 0)
            errors.Add("BatchSize must be greater than 0");

        if (FlushIntervalSeconds <= 0)
            errors.Add("FlushIntervalSeconds must be greater than 0");

        if (TimeoutSeconds <= 0)
            errors.Add("TimeoutSeconds must be greater than 0");

        if (!Uri.TryCreate(ApiBaseUrl, UriKind.Absolute, out _))
            errors.Add("ApiBaseUrl must be a valid URI");

        var validEndpoints = new[] { "events", "telemetry", "otel" };
        if (!validEndpoints.Contains(TargetEndpoint.ToLowerInvariant()))
            errors.Add($"TargetEndpoint must be one of: {string.Join(", ", validEndpoints)}");

        return errors;
    }
}

