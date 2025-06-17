namespace MetricsApp.Agent.Emitters.Http;

public class HttpEmitterOptions
{
    public string BaseUrl { get; set; } = string.Empty; 
    // Default path
    public string IngestPath { get; set; } = "/api/v1/ingest"; 
    public TimeSpan TimeoutSeconds { get; set; } = TimeSpan.FromSeconds(30);
    
    public ProxyOptions? Proxy { get; set; } = null; 
}

public class ProxyOptions
{
    public string Address { get; set; }
    public string Username { get; set; }
    public string Password { get; set; }
    public List<string> BypassList { get; set; } = new List<string>();
}