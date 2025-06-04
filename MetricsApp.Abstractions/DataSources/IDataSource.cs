using MetricsApp.Core.Models;
using MetricsApp.Abstractions.Data;

namespace MetricsApp.Abstractions.DataSources;

/// <summary>
/// Core interface for all datasource plugins
/// </summary>
public interface IDataSource
{
    /// <summary>
    /// Unique identifier for this datasource type (e.g., "prometheus", "elasticsearch", "influxdb")
    /// </summary>
    string DataSourceType { get; }
    
    /// <summary>
    /// Human-readable name for this datasource type
    /// </summary>
    string DisplayName { get; }
    
    /// <summary>
    /// Description of what this datasource provides
    /// </summary>
    string Description { get; }
    
    /// <summary>
    /// Version of the datasource plugin
    /// </summary>
    string Version { get; }
    
    /// <summary>
    /// Configuration schema for this datasource type
    /// </summary>
    DataSourceConfigurationSchema GetConfigurationSchema();
    
    /// <summary>
    /// Test the connection with the provided configuration
    /// </summary>
    Task<DataSourceTestResult> TestConnectionAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Initialize the datasource with the provided configuration
    /// </summary>
    Task InitializeAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Query logs from this datasource
    /// </summary>
    Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Query metrics from this datasource
    /// </summary>
    Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get available metrics/fields from this datasource for query building
    /// </summary>
    Task<DataSourceMetadata> GetMetadataAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Dispose of any resources
    /// </summary>
    ValueTask DisposeAsync();
} 