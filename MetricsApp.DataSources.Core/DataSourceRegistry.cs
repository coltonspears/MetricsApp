using MetricsApp.Abstractions.DataSources;
using MetricsApp.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace MetricsApp.DataSources.Core;

/// <summary>
/// Implementation of the datasource registry
/// </summary>
public class DataSourceRegistry : IDataSourceRegistry
{
    private readonly Dictionary<string, DataSourceTypeInfo> _dataSourceTypes = new();
    private readonly ILogger<DataSourceRegistry> _logger;

    public DataSourceRegistry(ILogger<DataSourceRegistry> logger)
    {
        _logger = logger;
    }

    public void RegisterDataSource<T>() where T : class, IDataSource
    {
        RegisterDataSource(typeof(T), serviceProvider => ActivatorUtilities.CreateInstance<T>(serviceProvider));
    }

    public void RegisterDataSource(string dataSourceType, Func<IServiceProvider, IDataSource> factory)
    {
        RegisterDataSource(null, factory, dataSourceType);
    }

    private void RegisterDataSource(Type? dataSourceType, Func<IServiceProvider, IDataSource> factory, string? explicitDataSourceType = null)
    {
        var typeInfo = new DataSourceTypeInfo
        {
            Factory = factory
        };

        // We'll populate the metadata lazily when first accessed
        // This avoids creating temporary instances during registration
        var dataSourceTypeName = explicitDataSourceType ?? GetDataSourceTypeName(dataSourceType!);
        
        _dataSourceTypes[dataSourceTypeName] = typeInfo;
        
        _logger.LogInformation("Registered datasource type: {DataSourceType}", dataSourceTypeName);
    }

    private static string GetDataSourceTypeName(Type type)
    {
        var name = type.Name;
        if (name.EndsWith("DataSource", StringComparison.OrdinalIgnoreCase))
        {
            name = name[..^10]; // Remove "DataSource"
        }
        return name.ToLowerInvariant();
    }

    public IEnumerable<DataSourceTypeInfo> GetAvailableDataSourceTypes()
    {
        // Ensure all type info is populated
        foreach (var kvp in _dataSourceTypes.ToList())
        {
            EnsureTypeInfoPopulated(kvp.Key, kvp.Value);
        }
        
        return _dataSourceTypes.Values.ToList();
    }

    public DataSourceTypeInfo? GetDataSourceTypeInfo(string dataSourceType)
    {
        if (!_dataSourceTypes.TryGetValue(dataSourceType, out var typeInfo))
        {
            return null;
        }

        EnsureTypeInfoPopulated(dataSourceType, typeInfo);
        return typeInfo;
    }

    public IDataSource? CreateDataSource(string dataSourceType, IServiceProvider serviceProvider)
    {
        if (!_dataSourceTypes.TryGetValue(dataSourceType, out var typeInfo))
        {
            _logger.LogWarning("Unknown datasource type: {DataSourceType}", dataSourceType);
            return null;
        }

        try
        {
            return typeInfo.Factory(serviceProvider);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create datasource instance for type: {DataSourceType}", dataSourceType);
            return null;
        }
    }

    public bool IsRegistered(string dataSourceType)
    {
        return _dataSourceTypes.ContainsKey(dataSourceType);
    }

    private void EnsureTypeInfoPopulated(string dataSourceType, DataSourceTypeInfo typeInfo)
    {
        // If metadata is already populated, nothing to do
        if (!string.IsNullOrEmpty(typeInfo.DisplayName))
        {
            return;
        }

        try
        {
            // Create a minimal service provider just for getting metadata
            using var serviceProvider = new ServiceCollection()
                .AddLogging()
                .AddHttpClient()
                .BuildServiceProvider();

            // Create instance only to get metadata
            var instance = typeInfo.Factory(serviceProvider);
            
            // Populate the metadata
            typeInfo.DataSourceType = dataSourceType;
            typeInfo.DisplayName = instance.DisplayName;
            typeInfo.Description = instance.Description;
            typeInfo.Version = instance.Version;
            typeInfo.ConfigurationSchema = instance.GetConfigurationSchema();

            switch (instance)
            {
                // Dispose the temporary instance
                case IAsyncDisposable asyncDisposable:
                    asyncDisposable.DisposeAsync().AsTask().Wait();
                    break;
                case IDisposable disposable:
                    disposable.Dispose();
                    break;
            }

            _logger.LogDebug("Populated metadata for datasource type: {DataSourceType} ({DisplayName})", 
                dataSourceType, typeInfo.DisplayName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to populate metadata for datasource type: {DataSourceType}", dataSourceType);
            
            // Set fallback values
            typeInfo.DataSourceType = dataSourceType;
            typeInfo.DisplayName = dataSourceType;
            typeInfo.Description = $"Datasource of type {dataSourceType}";
            typeInfo.Version = "Unknown";
            typeInfo.ConfigurationSchema = new DataSourceConfigurationSchema();
        }
    }
} 