namespace MetricsApp.Core.Models;

/// <summary>
/// Configuration for a datasource instance
/// </summary>
public class DataSourceConfiguration
{
    /// <summary>
    /// Unique identifier for this datasource instance
    /// </summary>
    public string Id { get; set; } = string.Empty;
    
    /// <summary>
    /// User-friendly name for this datasource instance
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Type of datasource (e.g., "prometheus", "elasticsearch")
    /// </summary>
    public string DataSourceType { get; set; } = string.Empty;
    
    /// <summary>
    /// Connection URL or endpoint
    /// </summary>
    public string Url { get; set; } = string.Empty;
    
    /// <summary>
    /// Authentication settings
    /// </summary>
    public DataSourceAuthentication? Authentication { get; set; }
    
    /// <summary>
    /// Custom configuration properties specific to the datasource type
    /// </summary>
    public Dictionary<string, object> Properties { get; set; } = new();
    
    /// <summary>
    /// Connection timeout in seconds
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
    
    /// <summary>
    /// Whether this datasource is enabled
    /// </summary>
    public bool IsEnabled { get; set; } = true;
    
    /// <summary>
    /// When this configuration was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// When this configuration was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
} 