namespace MetricsApp.Core.Models;

/// <summary>
/// Represents the common envelope for events sent to the ingestion API.
/// </summary>
public class EventDto
{
    public DateTimeOffset Timestamp { get; set; }
    public string TenantId { get; set; }
    public string AppId { get; set; }
    public string Type { get; set; } // "log" or "metric"
    public string SourceType { get; set; }
    public string HostName { get; set; }
    public string Ip { get; set; }
    public string LogLevel { get; set; }
    public object Payload { get; set; }
}