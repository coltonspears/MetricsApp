using System.Collections.Concurrent;
using MetricsApp.Abstractions.Data;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Repository.InMemory;

/// <summary>
/// In-memory implementation of configuration repository
/// </summary>
public class InMemoryConfigurationRepository : IConfigurationRepository
{
    private readonly ConcurrentDictionary<string, DataSourceConfiguration> _dataSourceConfigurations = new();
    private readonly ILogger<InMemoryConfigurationRepository> _logger;

    public InMemoryConfigurationRepository(ILogger<InMemoryConfigurationRepository> logger)
    {
        _logger = logger;
        _logger.LogInformation("InMemoryConfigurationRepository initialized.");
    }

    public Task<DataSourceConfiguration> StoreDataSourceConfigurationAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        
        if (string.IsNullOrEmpty(configuration.Id))
        {
            configuration.Id = Guid.NewGuid().ToString();
        }

        configuration.CreatedAt = DateTime.UtcNow;
        configuration.UpdatedAt = DateTime.UtcNow;

        _dataSourceConfigurations[configuration.Id] = configuration;
        
        _logger.LogInformation("Stored datasource configuration: {Id} ({Name})", 
            configuration.Id, configuration.Name);

        return Task.FromResult(configuration);
    }

    public Task<IEnumerable<DataSourceConfiguration>> GetDataSourceConfigurationsAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        
        var configurations = _dataSourceConfigurations.Values.ToList();
        
        _logger.LogDebug("Retrieved {Count} datasource configurations", configurations.Count);
        
        return Task.FromResult<IEnumerable<DataSourceConfiguration>>(configurations);
    }

    public Task<DataSourceConfiguration?> GetDataSourceConfigurationAsync(string id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        
        _dataSourceConfigurations.TryGetValue(id, out var configuration);
        
        if (configuration != null)
        {
            _logger.LogDebug("Retrieved datasource configuration: {Id} ({Name})", 
                configuration.Id, configuration.Name);
        }
        else
        {
            _logger.LogDebug("Datasource configuration not found: {Id}", id);
        }

        return Task.FromResult(configuration);
    }

    public Task<DataSourceConfiguration> UpdateDataSourceConfigurationAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        
        if (!_dataSourceConfigurations.ContainsKey(configuration.Id))
        {
            throw new ArgumentException($"Datasource configuration not found: {configuration.Id}");
        }

        configuration.UpdatedAt = DateTime.UtcNow;
        _dataSourceConfigurations[configuration.Id] = configuration;

        _logger.LogInformation("Updated datasource configuration: {Id} ({Name})", 
            configuration.Id, configuration.Name);

        return Task.FromResult(configuration);
    }

    public Task DeleteDataSourceConfigurationAsync(string id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        
        var removed = _dataSourceConfigurations.TryRemove(id, out var configuration);
        
        if (removed && configuration != null)
        {
            _logger.LogInformation("Deleted datasource configuration: {Id} ({Name})", 
                configuration.Id, configuration.Name);
        }
        else
        {
            _logger.LogWarning("Attempted to delete non-existent datasource configuration: {Id}", id);
        }

        return Task.CompletedTask;
    }

    public Task<bool> DataSourceConfigurationExistsAsync(string id, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        
        var exists = _dataSourceConfigurations.ContainsKey(id);
        
        _logger.LogDebug("Datasource configuration exists check for {Id}: {Exists}", id, exists);
        
        return Task.FromResult(exists);
    }
} 