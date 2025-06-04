namespace MetricsApp.Core.Models;

/// <summary>
/// Result of testing a datasource connection
/// </summary>
public class DataSourceTestResult
{
    /// <summary>
    /// Whether the connection test was successful
    /// </summary>
    public bool IsSuccess { get; set; }
    
    /// <summary>
    /// Error message if the test failed
    /// </summary>
    public string? ErrorMessage { get; set; }
    
    /// <summary>
    /// Additional details about the test
    /// </summary>
    public string? Details { get; set; }
    
    /// <summary>
    /// Response time in milliseconds
    /// </summary>
    public long ResponseTimeMs { get; set; }
    
    /// <summary>
    /// Version information from the datasource
    /// </summary>
    public string? Version { get; set; }
    
    /// <summary>
    /// Additional metadata from the connection test
    /// </summary>
    public Dictionary<string, object> Metadata { get; set; } = new();
    
    /// <summary>
    /// When the test was performed
    /// </summary>
    public DateTime TestedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Create a successful test result
    /// </summary>
    public static DataSourceTestResult Success(long responseTimeMs = 0, string? details = null)
    {
        return new DataSourceTestResult
        {
            IsSuccess = true,
            ResponseTimeMs = responseTimeMs,
            Details = details
        };
    }
    
    /// <summary>
    /// Create a failed test result
    /// </summary>
    public static DataSourceTestResult Failure(string errorMessage, string? details = null)
    {
        return new DataSourceTestResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage,
            Details = details
        };
    }
} 