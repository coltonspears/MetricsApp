using MetricsApp.Abstractions.DataSources;
using MetricsApp.Core.Models;

namespace MetricsApp.Abstractions.Plugins.Capabilities;

/// <summary>
/// Capability for plugins that provide data source integrations.
/// </summary>
public interface IDataSourceCapability : IPluginCapability
{
    /// <summary>
    /// Unique identifier for this data source type (e.g., "prometheus", "sqlserver", "elasticsearch")
    /// </summary>
    string DataSourceType { get; }
    
    /// <summary>
    /// Human-readable display name
    /// </summary>
    string DisplayName { get; }
    
    /// <summary>
    /// Description of what this data source provides
    /// </summary>
    string Description { get; }
    
    /// <summary>
    /// Icon identifier (used by frontend to display appropriate icon)
    /// </summary>
    string IconName { get; }
    
    /// <summary>
    /// Categories/tags for this data source (e.g., "database", "metrics", "logs", "traces")
    /// </summary>
    IReadOnlyList<string> Categories { get; }
    
    /// <summary>
    /// Creates a new instance of the data source
    /// </summary>
    IDataSource CreateDataSource(IServiceProvider services);
    
    /// <summary>
    /// Gets the configuration schema for this data source type
    /// </summary>
    DataSourceConfigurationSchema GetConfigurationSchema();
    
    /// <summary>
    /// Tests the connection with the provided configuration
    /// </summary>
    Task<DataSourceTestResult> TestConnectionAsync(
        DataSourceConfiguration configuration, 
        IServiceProvider services,
        CancellationToken cancellationToken = default);
}

