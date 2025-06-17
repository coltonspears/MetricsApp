using MetricsApp.Core.Models;
using MetricsApp.Abstractions.Data;

namespace MetricsApp.Abstractions.DataSources;

/// <summary>
/// Manager for configured datasource instances
/// </summary>
public interface IDataSourceManager
{
    /// <summary>
    /// Get all configured datasources
    /// </summary>
    Task<IEnumerable<DataSourceConfiguration>> GetDataSourcesAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get a specific datasource configuration
    /// </summary>
    Task<DataSourceConfiguration?> GetDataSourceAsync(string id, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Create a new datasource configuration
    /// </summary>
    Task<DataSourceConfiguration> CreateDataSourceAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Update an existing datasource configuration
    /// </summary>
    Task<DataSourceConfiguration> UpdateDataSourceAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Delete a datasource configuration
    /// </summary>
    Task DeleteDataSourceAsync(string id, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Test a datasource connection
    /// </summary>
    Task<DataSourceTestResult> TestDataSourceAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get an initialized datasource instance
    /// </summary>
    Task<IDataSource?> GetDataSourceInstanceAsync(string id, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Query logs from a specific datasource
    /// </summary>
    Task<LogQueryResult> QueryLogsAsync(string dataSourceId, LogQueryCriteria criteria, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Query metrics from a specific datasource
    /// </summary>
    Task<MetricQueryResult> QueryMetricsAsync(string dataSourceId, MetricQueryCriteria criteria, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Query across multiple datasources
    /// </summary>
    Task<LogQueryResult> QueryLogsAsync(IEnumerable<string> dataSourceIds, LogQueryCriteria criteria, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Query metrics across multiple datasources
    /// </summary>
    Task<MetricQueryResult> QueryMetricsAsync(IEnumerable<string> dataSourceIds, MetricQueryCriteria criteria, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get metadata from a specific datasource
    /// </summary>
    Task<DataSourceMetadata> GetDataSourceMetadataAsync(string dataSourceId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Gets the metric schema from the internal data repository.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A <see cref="RepositoryMetricSchema"/> detailing available metrics in the internal repository.</returns>
    Task<RepositoryMetricSchema> GetInternalRepositoryMetricSchemaAsync(CancellationToken cancellationToken = default);
} 