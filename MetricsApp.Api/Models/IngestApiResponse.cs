namespace MetricsApp.Api.Models;

public class IngestApiResponse
{
    public string RequestId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ReceivedEventCount { get; set; }
}