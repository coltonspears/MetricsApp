namespace MetricsApp.Core.Models;

/// <summary>
/// Extended information about a data source type
/// </summary>
public class DataSourceExtendedInfo
{
    /// <summary>
    /// Category of the data source (e.g., "Monitoring", "Database", "Logging")
    /// </summary>
    public string Category { get; set; } = string.Empty;
    
    /// <summary>
    /// URL to the source code repository
    /// </summary>
    public string? Repository { get; set; }
    
    /// <summary>
    /// URL to the documentation
    /// </summary>
    public string? Documentation { get; set; }
    
    /// <summary>
    /// License information
    /// </summary>
    public string License { get; set; } = "Unknown";
    
    /// <summary>
    /// Maintainer information
    /// </summary>
    public string Maintainer { get; set; } = "Unknown";
    
    /// <summary>
    /// List of capabilities this data source provides
    /// </summary>
    public List<string> Capabilities { get; set; } = new();
    
    /// <summary>
    /// List of tags for categorization
    /// </summary>
    public List<string> Tags { get; set; } = new();
    
    /// <summary>
    /// URLs to screenshots (if available)
    /// </summary>
    public List<string> Screenshots { get; set; } = new();
    
    /// <summary>
    /// Changelog entries (if available)
    /// </summary>
    public List<ChangelogEntry> Changelog { get; set; } = new();
}

/// <summary>
/// Represents a changelog entry
/// </summary>
public class ChangelogEntry
{
    /// <summary>
    /// Version number
    /// </summary>
    public string Version { get; set; } = string.Empty;
    
    /// <summary>
    /// Release date
    /// </summary>
    public DateTime ReleaseDate { get; set; }
    
    /// <summary>
    /// List of changes in this version
    /// </summary>
    public List<string> Changes { get; set; } = new();
    
    /// <summary>
    /// Type of release (Major, Minor, Patch, etc.)
    /// </summary>
    public string ReleaseType { get; set; } = "Patch";
} 