namespace MetricsApp.Core.Models;

/// <summary>
/// Metadata about available data in a datasource
/// </summary>
public class DataSourceMetadata
{
    /// <summary>
    /// Available metric names
    /// </summary>
    public List<string> AvailableMetrics { get; set; } = new();
    
    /// <summary>
    /// Available log fields
    /// </summary>
    public List<DataSourceField> AvailableFields { get; set; } = new();
    
    /// <summary>
    /// Available tags/labels
    /// </summary>
    public List<DataSourceTag> AvailableTags { get; set; } = new();
    
    /// <summary>
    /// Time range of available data
    /// </summary>
    public DataSourceTimeRange? TimeRange { get; set; }
    
    /// <summary>
    /// Additional metadata properties
    /// </summary>
    public Dictionary<string, object> Properties { get; set; } = new();
    
    /// <summary>
    /// When this metadata was last updated
    /// </summary>
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Field information from a datasource
/// </summary>
public class DataSourceField
{
    /// <summary>
    /// Field name
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Field type (string, number, boolean, datetime)
    /// </summary>
    public string Type { get; set; } = string.Empty;
    
    /// <summary>
    /// Field description
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Whether this field is searchable
    /// </summary>
    public bool IsSearchable { get; set; } = true;
    
    /// <summary>
    /// Whether this field can be aggregated
    /// </summary>
    public bool IsAggregatable { get; set; }
}

/// <summary>
/// Tag/label information from a datasource
/// </summary>
public class DataSourceTag
{
    /// <summary>
    /// Tag name
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Possible values for this tag
    /// </summary>
    public List<string> Values { get; set; } = new();
    
    /// <summary>
    /// Tag description
    /// </summary>
    public string? Description { get; set; }
}

/// <summary>
/// Time range of available data in a datasource
/// </summary>
public class DataSourceTimeRange
{
    /// <summary>
    /// Earliest available data timestamp
    /// </summary>
    public DateTime EarliestTime { get; set; }
    
    /// <summary>
    /// Latest available data timestamp
    /// </summary>
    public DateTime LatestTime { get; set; }
} 