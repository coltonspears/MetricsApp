# MetricsApp.DataSources.Core

## Overview

The DataSources.Core library provides a Grafana-style plugin system for connecting to external data sources. This enables MetricsApp to query logs and metrics from various systems like Prometheus, Elasticsearch, InfluxDB, and more.

## Architecture

### Core Components

#### IDataSource
The main interface that all datasource plugins must implement:

```csharp
public interface IDataSource
{
    string DataSourceType { get; }
    string DisplayName { get; }
    string Description { get; }
    string Version { get; }
    
    DataSourceConfigurationSchema GetConfigurationSchema();
    Task<DataSourceTestResult> TestConnectionAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    Task InitializeAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default);
    Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default);
    Task<DataSourceMetadata> GetMetadataAsync(CancellationToken cancellationToken = default);
    ValueTask DisposeAsync();
}
```

#### IDataSourceRegistry
Manages available datasource types and creates instances:

```csharp
public interface IDataSourceRegistry
{
    void RegisterDataSource<T>() where T : class, IDataSource;
    void RegisterDataSource(string dataSourceType, Func<IServiceProvider, IDataSource> factory);
    IEnumerable<DataSourceTypeInfo> GetAvailableDataSourceTypes();
    DataSourceTypeInfo? GetDataSourceTypeInfo(string dataSourceType);
    IDataSource? CreateDataSource(string dataSourceType, IServiceProvider serviceProvider);
    bool IsRegistered(string dataSourceType);
}
```

#### IDataSourceManager
Manages configured datasource instances and provides querying capabilities:

```csharp
public interface IDataSourceManager
{
    Task<IEnumerable<DataSourceConfiguration>> GetDataSourcesAsync(CancellationToken cancellationToken = default);
    Task<DataSourceConfiguration?> GetDataSourceAsync(string id, CancellationToken cancellationToken = default);
    Task<DataSourceConfiguration> CreateDataSourceAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    Task<DataSourceConfiguration> UpdateDataSourceAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    Task DeleteDataSourceAsync(string id, CancellationToken cancellationToken = default);
    Task<DataSourceTestResult> TestDataSourceAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    Task<IDataSource?> GetDataSourceInstanceAsync(string id, CancellationToken cancellationToken = default);
    // ... query methods
}
```

## Usage

### 1. Register Datasource Services

In your `Program.cs` or startup configuration:

```csharp
using MetricsApp.DataSources.Core.Extensions;

// Register the core datasource services
builder.Services.AddDataSources();

// Register specific datasource types
builder.Services.AddDataSource<PrometheusDataSource>();
builder.Services.AddDataSource<ElasticsearchDataSource>();
```

### 2. Create a Datasource Plugin

```csharp
public class MyDataSource : IDataSource
{
    public string DataSourceType => "my-datasource";
    public string DisplayName => "My Data Source";
    public string Description => "Custom datasource implementation";
    public string Version => "1.0.0";

    public DataSourceConfigurationSchema GetConfigurationSchema()
    {
        return new DataSourceConfigurationSchema
        {
            Fields = new List<ConfigurationField>
            {
                new ConfigurationField
                {
                    Name = "url",
                    Label = "Server URL",
                    Type = ConfigurationFieldType.Url,
                    Required = true
                },
                new ConfigurationField
                {
                    Name = "apiKey",
                    Label = "API Key",
                    Type = ConfigurationFieldType.Password,
                    Required = true
                }
            }
        };
    }

    public async Task<DataSourceTestResult> TestConnectionAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        // Test the connection
        try
        {
            // Your connection test logic here
            return DataSourceTestResult.Success(responseTimeMs: 150);
        }
        catch (Exception ex)
        {
            return DataSourceTestResult.Failure($"Connection failed: {ex.Message}");
        }
    }

    public async Task InitializeAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        // Initialize your datasource with the configuration
    }

    public async Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        // Implement log querying
        return new LogQueryResult();
    }

    public async Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        // Implement metric querying
        return new MetricQueryResult();
    }

    public async Task<DataSourceMetadata> GetMetadataAsync(CancellationToken cancellationToken = default)
    {
        // Return available metrics and fields
        return new DataSourceMetadata();
    }

    public async ValueTask DisposeAsync()
    {
        // Clean up resources
    }
}
```

### 3. Use the API

The system provides REST endpoints for managing datasources:

#### Get Available Datasource Types
```http
GET /api/v1/datasources/types
```

#### Create a Datasource
```http
POST /api/v1/datasources
Content-Type: application/json

{
  "name": "My Prometheus",
  "dataSourceType": "prometheus",
  "url": "http://localhost:9090",
  "authentication": {
    "type": "Basic",
    "username": "admin",
    "password": "password"
  },
  "properties": {
    "timeout": 30
  }
}
```

#### Test a Datasource
```http
POST /api/v1/datasources/test
Content-Type: application/json

{
  "dataSourceType": "prometheus",
  "url": "http://localhost:9090"
}
```

#### Query Metrics
```http
POST /api/v1/datasources/{id}/query/metrics
Content-Type: application/json

{
  "query": "up",
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T01:00:00Z",
  "step": "1m"
}
```

## Configuration Schema

Datasources define their configuration UI through schemas:

```csharp
public DataSourceConfigurationSchema GetConfigurationSchema()
{
    return new DataSourceConfigurationSchema
    {
        Fields = new List<ConfigurationField>
        {
            new ConfigurationField
            {
                Name = "url",
                Label = "Server URL",
                Description = "The URL of your server",
                Type = ConfigurationFieldType.Url,
                Required = true,
                Placeholder = "https://example.com"
            },
            new ConfigurationField
            {
                Name = "timeout",
                Label = "Timeout (seconds)",
                Type = ConfigurationFieldType.Number,
                DefaultValue = 30
            },
            new ConfigurationField
            {
                Name = "enableSsl",
                Label = "Enable SSL",
                Type = ConfigurationFieldType.Boolean,
                DefaultValue = true
            },
            new ConfigurationField
            {
                Name = "region",
                Label = "Region",
                Type = ConfigurationFieldType.Select,
                Options = new List<SelectOption>
                {
                    new SelectOption { Value = "us-east-1", Label = "US East 1" },
                    new SelectOption { Value = "us-west-2", Label = "US West 2" }
                }
            }
        },
        ValidationRules = new List<ValidationRule>
        {
            new ValidationRule
            {
                FieldName = "url",
                Type = ValidationType.Required,
                ErrorMessage = "URL is required"
            },
            new ValidationRule
            {
                FieldName = "url",
                Type = ValidationType.Url,
                ErrorMessage = "Please enter a valid URL"
            }
        }
    };
}
```

## Authentication

The system supports multiple authentication methods:

- **None**: No authentication
- **Basic**: Username/password authentication
- **Bearer**: Token-based authentication
- **ApiKey**: API key authentication
- **OAuth2**: OAuth2 authentication (future)

## Features

### Connection Testing
All datasources support connection testing before saving configurations.

### Metadata Discovery
Datasources can provide metadata about available metrics and fields for query building.

### Multi-Datasource Queries
The manager supports querying across multiple datasources simultaneously.

### Caching
Datasource instances are cached for performance.

### Error Handling
Comprehensive error handling with detailed error messages.

## Available Datasources

### Built-in Datasources
- **Prometheus**: Query metrics from Prometheus time-series database

### Planned Datasources
- **Elasticsearch**: Query logs and metrics from Elasticsearch
- **InfluxDB**: Query time-series data from InfluxDB
- **Grafana Loki**: Query logs from Loki
- **Azure Monitor**: Query Azure metrics and logs
- **AWS CloudWatch**: Query CloudWatch metrics and logs

## Extending the System

To add a new datasource:

1. Create a new project: `MetricsApp.DataSources.{YourDataSource}`
2. Implement the `IDataSource` interface
3. Register it in your application startup
4. The datasource will automatically appear in the UI

## Best Practices

1. **Connection Management**: Always dispose of connections properly
2. **Error Handling**: Provide meaningful error messages
3. **Configuration Validation**: Use the validation rules system
4. **Performance**: Implement efficient querying and caching
5. **Security**: Handle authentication securely
6. **Testing**: Implement comprehensive connection testing 