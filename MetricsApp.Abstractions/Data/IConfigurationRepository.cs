using MetricsApp.Core.Models;

namespace MetricsApp.Abstractions.Data;

/// <summary>
/// Interface for storing and retrieving configuration data
/// </summary>
public interface IConfigurationRepository
{
    /// <summary>
    /// Store a datasource configuration
    /// </summary>
    Task<DataSourceConfiguration> StoreDataSourceConfigurationAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get all datasource configurations
    /// </summary>
    Task<IEnumerable<DataSourceConfiguration>> GetDataSourceConfigurationsAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get a specific datasource configuration by ID
    /// </summary>
    Task<DataSourceConfiguration?> GetDataSourceConfigurationAsync(string id, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Update an existing datasource configuration
    /// </summary>
    Task<DataSourceConfiguration> UpdateDataSourceConfigurationAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Delete a datasource configuration
    /// </summary>
    Task DeleteDataSourceConfigurationAsync(string id, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Check if a datasource configuration exists
    /// </summary>
    Task<bool> DataSourceConfigurationExistsAsync(string id, CancellationToken cancellationToken = default);
} 