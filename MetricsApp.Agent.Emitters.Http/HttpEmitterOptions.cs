namespace MetricsApp.Agent.Emitters.Http;

public class HttpEmitterOptions
{
    // e.g., "https://localhost:7001"
    public string BaseUrl { get; set; } = string.Empty; 
    // Default path
    public string IngestPath { get; set; } = "/api/v1/ingest"; 
    public TimeSpan TimeoutSeconds { get; set; } = TimeSpan.FromSeconds(30);
}