# MetricsApp.DataSources.Prometheus

## Overview

The Prometheus datasource plugin allows MetricsApp to query metrics from Prometheus time-series databases. It provides a Grafana-style interface for connecting to and querying Prometheus instances.

## Features

- **Connection Testing**: Validate Prometheus connectivity before saving configurations
- **Metadata Discovery**: Automatically discover available metrics and labels
- **Query Support**: Execute PromQL queries and retrieve time-series data
- **Authentication**: Support for basic authentication
- **Configurable Timeouts**: Customizable query timeouts

## Registration

### Simple Registration
```csharp
// Program.cs
builder.Services.AddDataSources();
builder.Services.AddPrometheusDataSource();
```

### Custom HTTP Client Configuration
```csharp
// Program.cs
builder.Services.AddDataSources();
builder.Services.AddPrometheusDataSource(httpClient =>
{
    httpClient.Timeout = TimeSpan.FromSeconds(60);
    httpClient.DefaultRequestHeaders.Add("User-Agent", "MetricsApp/1.0");
});
```

### Manual Registration (Advanced)
```csharp
// If you need more control
builder.Services.AddHttpClient();
builder.Services.AddDataSource<PrometheusDataSource>();
```

## Configuration Schema

The Prometheus datasource supports the following configuration fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | URL | Yes | Prometheus server URL (e.g., `http://localhost:9090`) |
| `timeout` | Number | No | Query timeout in seconds (default: 30) |
| `basicAuth` | Boolean | No | Enable basic authentication (default: false) |

### Authentication

When `basicAuth` is enabled, provide credentials in the datasource configuration:

```json
{
  "name": "Production Prometheus",
  "url": "https://prometheus.company.com",
  "properties": {
    "timeout": 60,
    "basicAuth": true
  },
  "authentication": {
    "type": "Basic",
    "credentials": {
      "username": "your-username",
      "password": "your-password"
    }
  }
}
```

## API Usage

### Create Datasource Configuration
```http
POST /api/datasources
Content-Type: application/json

{
  "name": "Local Prometheus",
  "dataSourceType": "prometheus",
  "url": "http://localhost:9090",
  "properties": {
    "timeout": 30
  }
}
```

### Test Connection
```http
POST /api/datasources/test
Content-Type: application/json

{
  "dataSourceType": "prometheus",
  "url": "http://localhost:9090",
  "properties": {
    "timeout": 30
  }
}
```

### Query Metrics
```http
GET /api/datasources/{id}/query/metrics?query=up&start=2024-01-01T00:00:00Z&end=2024-01-01T01:00:00Z
```

## Supported Queries

The Prometheus datasource supports standard PromQL queries:

- **Instant queries**: `up`, `cpu_usage_percent`
- **Range queries**: `rate(http_requests_total[5m])`
- **Aggregations**: `sum(cpu_usage_percent) by (instance)`
- **Functions**: `increase()`, `rate()`, `avg_over_time()`

## Dependencies

- `Microsoft.Extensions.Http` - HTTP client factory
- `Microsoft.Extensions.Logging` - Logging support
- `System.Text.Json` - JSON parsing
- `MetricsApp.DataSources.Core` - Core datasource infrastructure

## Error Handling

The datasource provides detailed error information:

- **Connection errors**: Network connectivity issues
- **Authentication errors**: Invalid credentials
- **Query errors**: Invalid PromQL syntax
- **Timeout errors**: Query execution timeouts

## Performance Considerations

- HTTP connections are pooled via `IHttpClientFactory`
- Query results are not cached (implement caching at the application level)
- Large time ranges may impact performance
- Consider using appropriate step intervals for range queries

## Example Integration

```csharp
// Startup.cs or Program.cs
public void ConfigureServices(IServiceCollection services)
{
    // Add core datasource services
    services.AddDataSources();
    
    // Add Prometheus with custom configuration
    services.AddPrometheusDataSource(client =>
    {
        client.Timeout = TimeSpan.FromMinutes(2);
        client.DefaultRequestHeaders.Add("X-Custom-Header", "MetricsApp");
    });
    
    // Add other datasources
    services.AddDataSource<ElasticsearchDataSource>();
}
```

## Troubleshooting

### Common Issues

1. **Connection Refused**: Verify Prometheus URL and network connectivity
2. **Authentication Failed**: Check username/password in configuration
3. **Query Timeout**: Increase timeout value or optimize query
4. **No Metrics Found**: Verify Prometheus has data and is scraping targets

### Logging

Enable debug logging to see detailed HTTP requests:

```json
{
  "Logging": {
    "LogLevel": {
      "MetricsApp.DataSources.Prometheus": "Debug"
    }
  }
}
``` 