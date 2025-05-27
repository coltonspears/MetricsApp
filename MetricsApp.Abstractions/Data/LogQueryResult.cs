using MetricsApp.Core.Models;

namespace MetricsApp.Abstractions.Data;

public class LogQueryResult
{
    public long TotalHits { get; set; }
    public IEnumerable<LogRecord> Logs { get; set; } = new List<LogRecord>();
    public string? NextPageToken { get; set; }
    public string? ErrorMessage {get; set;}
}