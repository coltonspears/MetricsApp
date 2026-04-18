namespace MetricsApp.Core.Models;

/// <summary>
/// Common envelope for any telemetry event entering the ingestion pipeline.
/// All fields except <see cref="Payload"/> have safe defaults so partial payloads
/// from senders (Serilog, raw HTTP, OTLP) can be normalized server-side.
/// </summary>
public class EventDto
{
    /// <summary>UTC timestamp when the source produced the event. Defaults to "now" when missing.</summary>
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>Logical tenant. Single-tenant deployments leave this as "default".</summary>
    public string TenantId { get; set; } = "default";

    /// <summary>Logical application or service that produced the event.</summary>
    public string AppId { get; set; } = "unknown-service";

    /// <summary>Coarse signal kind: "log", "metric", "trace", or sender-specific.</summary>
    public string Type { get; set; } = "log";

    /// <summary>
    /// Discriminator used by parsers to route the event. Examples:
    /// "otlp-traces", "otlp-metrics", "otlp-logs", "serilog-sink", "raw-event".
    /// </summary>
    public string SourceType { get; set; } = "raw-event";

    /// <summary>Originating host (machine/container name).</summary>
    public string HostName { get; set; } = "unknown-host";

    /// <summary>Originating IP, if known.</summary>
    public string Ip { get; set; } = "unknown";

    /// <summary>Severity / log level.</summary>
    public string LogLevel { get; set; } = "INFO";

    /// <summary>
    /// Sender-defined payload. May be a <c>JsonElement</c>, a JSON string,
    /// a CLR object that serializes to JSON, or raw bytes for protobuf transports.
    /// Parsers are responsible for understanding the shape based on
    /// <see cref="SourceType"/>.
    /// </summary>
    public object? Payload { get; set; }
}
