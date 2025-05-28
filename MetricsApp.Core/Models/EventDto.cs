namespace MetricsApp.Core.Models;

/// <summary>
/// Represents the common envelope for events sent to the ingestion API.
/// </summary>
public class EventDto
{
    public string SourceType { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; }
    public string HostName { get; set; } = string.Empty;
    
    // Source-specific data structure
    public object Payload { get; set; } = new object(); 
}