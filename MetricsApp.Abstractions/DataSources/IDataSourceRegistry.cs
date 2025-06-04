using MetricsApp.Core.Models;
using System.Text.Json.Serialization;

namespace MetricsApp.Abstractions.DataSources;

/// <summary>
/// Registry for managing available datasource types
/// </summary>
public interface IDataSourceRegistry
{
    /// <summary>
    /// Register a datasource type
    /// </summary>
    void RegisterDataSource<T>() where T : class, IDataSource;
    
    /// <summary>
    /// Register a datasource type with a factory function
    /// </summary>
    void RegisterDataSource(string dataSourceType, Func<IServiceProvider, IDataSource> factory);
    
    /// <summary>
    /// Get all available datasource types
    /// </summary>
    IEnumerable<DataSourceTypeInfo> GetAvailableDataSourceTypes();
    
    /// <summary>
    /// Get a specific datasource type info
    /// </summary>
    DataSourceTypeInfo? GetDataSourceTypeInfo(string dataSourceType);
    
    /// <summary>
    /// Create a datasource instance
    /// </summary>
    IDataSource? CreateDataSource(string dataSourceType, IServiceProvider serviceProvider);
    
    /// <summary>
    /// Check if a datasource type is registered
    /// </summary>
    bool IsRegistered(string dataSourceType);
}

/// <summary>
/// Information about a registered datasource type
/// </summary>
public class DataSourceTypeInfo
{
    /// <summary>
    /// Datasource type identifier
    /// </summary>
    public string DataSourceType { get; set; } = string.Empty;
    
    /// <summary>
    /// Display name
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;
    
    /// <summary>
    /// Description
    /// </summary>
    public string Description { get; set; } = string.Empty;
    
    /// <summary>
    /// Version
    /// </summary>
    public string Version { get; set; } = string.Empty;
    
    /// <summary>
    /// Configuration schema
    /// </summary>
    public DataSourceConfigurationSchema ConfigurationSchema { get; set; } = new();
    
    /// <summary>
    /// Factory function to create instances
    /// </summary>
    [JsonIgnore]
    public Func<IServiceProvider, IDataSource> Factory { get; set; } = _ => throw new NotImplementedException();
} 