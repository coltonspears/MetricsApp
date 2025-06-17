using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.DataSources;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace MetricsApp.DataSources.Core;

/// <summary>
/// Implementation of the datasource manager
/// </summary>
public class DataSourceManager : IDataSourceManager
{
    private readonly IDataSourceRegistry _registry;
    private readonly IDataRepository _repository;
    private readonly IConfigurationRepository _configurationRepository;
    private readonly ILogger<DataSourceManager> _logger;
    private readonly ConcurrentDictionary<string, IDataSource> _instances = new();
    private readonly IServiceProvider _serviceProvider;

    public DataSourceManager(
        IDataSourceRegistry registry,
        IDataRepository repository,
        IConfigurationRepository configurationRepository,
        IServiceProvider serviceProvider,
        ILogger<DataSourceManager> logger)
    {
        _registry = registry;
        _repository = repository;
        _configurationRepository = configurationRepository;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task<IEnumerable<DataSourceConfiguration>> GetDataSourcesAsync(CancellationToken cancellationToken = default)
    {
        return await _configurationRepository.GetDataSourceConfigurationsAsync(cancellationToken);
    }

    public async Task<DataSourceConfiguration?> GetDataSourceAsync(string id, CancellationToken cancellationToken = default)
    {
        return await _configurationRepository.GetDataSourceConfigurationAsync(id, cancellationToken);
    }

    public async Task<DataSourceConfiguration> CreateDataSourceAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        // Validate the datasource type is registered
        if (!_registry.IsRegistered(configuration.DataSourceType))
        {
            throw new ArgumentException($"Unknown datasource type: {configuration.DataSourceType}");
        }

        var created = await _configurationRepository.StoreDataSourceConfigurationAsync(configuration, cancellationToken);
        
        _logger.LogInformation("Created datasource configuration: {Id} ({Name})", 
            created.Id, created.Name);

        return created;
    }

    public async Task<DataSourceConfiguration> UpdateDataSourceAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        // Validate the datasource type is registered
        if (!_registry.IsRegistered(configuration.DataSourceType))
        {
            throw new ArgumentException($"Unknown datasource type: {configuration.DataSourceType}");
        }

        var updated = await _configurationRepository.UpdateDataSourceConfigurationAsync(configuration, cancellationToken);

        // Remove cached instance to force re-initialization
        _instances.TryRemove(configuration.Id, out var oldInstance);
        if (oldInstance != null)
        {
            await oldInstance.DisposeAsync();
        }

        _logger.LogInformation("Updated datasource configuration: {Id} ({Name})", 
            updated.Id, updated.Name);

        return updated;
    }

    public async Task DeleteDataSourceAsync(string id, CancellationToken cancellationToken = default)
    {
        await _configurationRepository.DeleteDataSourceConfigurationAsync(id, cancellationToken);
        
        // Dispose of any cached instance
        if (_instances.TryRemove(id, out var instance))
        {
            await instance.DisposeAsync();
        }

        _logger.LogInformation("Deleted datasource configuration: {Id}", id);
    }

    public async Task<DataSourceTestResult> TestDataSourceAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        var instance = _registry.CreateDataSource(configuration.DataSourceType, _serviceProvider);
        if (instance == null)
        {
            return DataSourceTestResult.Failure($"Failed to create datasource instance for type: {configuration.DataSourceType}");
        }

        try
        {
            return await instance.TestConnectionAsync(configuration, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing datasource connection: {Id}", configuration.Id);
            return DataSourceTestResult.Failure($"Connection test failed: {ex.Message}");
        }
        finally
        {
            await instance.DisposeAsync();
        }
    }

    public async Task<IDataSource?> GetDataSourceInstanceAsync(string id, CancellationToken cancellationToken = default)
    {
        // Return cached instance if available
        if (_instances.TryGetValue(id, out var cachedInstance))
        {
            return cachedInstance;
        }

        // Get configuration
        var configuration = await GetDataSourceAsync(id, cancellationToken);
        if (configuration is not { IsEnabled: true })
        {
            return null;
        }

        // Create new instance
        var instance = _registry.CreateDataSource(configuration.DataSourceType, _serviceProvider);
        if (instance == null)
        {
            return null;
        }

        try
        {
            await instance.InitializeAsync(configuration, cancellationToken);
            _instances[id] = instance;
            return instance;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize datasource: {Id}", id);
            await instance.DisposeAsync();
            return null;
        }
    }

    public async Task<LogQueryResult> QueryLogsAsync(string dataSourceId, LogQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        var instance = await GetDataSourceInstanceAsync(dataSourceId, cancellationToken);
        if (instance == null)
        {
            throw new ArgumentException($"Datasource not found or not available: {dataSourceId}");
        }

        return await instance.QueryLogsAsync(criteria, cancellationToken);
    }

    public async Task<MetricQueryResult> QueryMetricsAsync(string dataSourceId, MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        var instance = await GetDataSourceInstanceAsync(dataSourceId, cancellationToken);
        if (instance == null)
        {
            throw new ArgumentException($"Datasource not found or not available: {dataSourceId}");
        }

        return await instance.QueryMetricsAsync(criteria, cancellationToken);
    }

    public async Task<LogQueryResult> QueryLogsAsync(IEnumerable<string> dataSourceIds, LogQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        var tasks = dataSourceIds.Select(async id =>
        {
            try
            {
                return await QueryLogsAsync(id, criteria, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error querying logs from datasource: {Id}", id);
                return new LogQueryResult { Logs = new List<LogRecord>(), TotalHits = 0 };
            }
        });

        var results = await Task.WhenAll(tasks);
        
        // Merge results
        var allLogs = results.SelectMany(r => r.Logs).ToList();
        var totalHits = results.Sum(r => r.TotalHits);

        return new LogQueryResult
        {
            Logs = allLogs,
            TotalHits = totalHits
        };
    }

    public async Task<MetricQueryResult> QueryMetricsAsync(IEnumerable<string> dataSourceIds, MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        var tasks = dataSourceIds.Select(async id =>
        {
            try
            {
                return await QueryMetricsAsync(id, criteria, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error querying metrics from datasource: {Id}", id);
                return new MetricQueryResult { Result = new List<MetricTimeSeries>() };
            }
        });

        var results = await Task.WhenAll(tasks);
        
        // Merge results
        var allMetrics = results.SelectMany(r => r.Result).ToList();

        return new MetricQueryResult
        {
            Result = allMetrics,
            ResultType = "matrix"
        };
    }

    public async Task<DataSourceMetadata> GetDataSourceMetadataAsync(string dataSourceId, CancellationToken cancellationToken = default)
    {
        var instance = await GetDataSourceInstanceAsync(dataSourceId, cancellationToken);
        if (instance == null)
        {
            throw new ArgumentException($"Datasource not found or not available: {dataSourceId}");
        }

        return await instance.GetMetadataAsync(cancellationToken);
    }
    
    public async Task<RepositoryMetricSchema> GetInternalRepositoryMetricSchemaAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Fetching metric schema from internal data repository.");
        return await _repository.GetMetricSchemaAsync(cancellationToken);
    }
} 