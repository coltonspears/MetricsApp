# Prometheus DataSource HTTP Client Registration Solution

## Problem

The `PrometheusDataSource` requires `IHttpClientFactory` in its constructor, but this dependency wasn't being registered in the API project, causing runtime errors when trying to create Prometheus datasource instances.

```csharp
public class PrometheusDataSource : IDataSource
{
    private readonly IHttpClientFactory _httpClientFactory; // ❌ Not registered
    private readonly ILogger<PrometheusDataSource> _logger;

    public PrometheusDataSource(IHttpClientFactory httpClientFactory, ILogger<PrometheusDataSource> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }
}
```

## Solution: Prometheus-Specific Extension Method

### 1. Created Dedicated Extension Method

**File**: `MetricsApp.DataSources.Prometheus/Extensions/ServiceCollectionExtensions.cs`

```csharp
using MetricsApp.DataSources.Prometheus;
using Microsoft.Extensions.DependencyInjection;

namespace Microsoft.Extensions.DependencyInjection;

public static class PrometheusDataSourceServiceCollectionExtensions
{
    /// <summary>
    /// Add Prometheus datasource with all required dependencies
    /// </summary>
    public static IServiceCollection AddPrometheusDataSource(this IServiceCollection services)
    {
        // ✅ Ensure HTTP client is registered
        services.AddHttpClient();
        
        // ✅ Register the Prometheus datasource
        services.AddDataSource<PrometheusDataSource>();
        
        return services;
    }
    
    /// <summary>
    /// Add Prometheus datasource with custom HTTP client configuration
    /// </summary>
    public static IServiceCollection AddPrometheusDataSource(this IServiceCollection services, 
        Action<HttpClient> configureHttpClient)
    {
        // ✅ Register HTTP client with custom configuration
        services.AddHttpClient<PrometheusDataSource>(configureHttpClient);
        
        // ✅ Register the Prometheus datasource
        services.AddDataSource<PrometheusDataSource>();
        
        return services;
    }
}
```

### 2. Updated Project Dependencies

**File**: `MetricsApp.DataSources.Prometheus/MetricsApp.DataSources.Prometheus.csproj`

```xml
<ItemGroup>
  <ProjectReference Include="..\MetricsApp.Abstractions\MetricsApp.Abstractions.csproj" />
  <ProjectReference Include="..\MetricsApp.Core\MetricsApp.Core.csproj" />
  <ProjectReference Include="..\MetricsApp.DataSources.Core\MetricsApp.DataSources.Core.csproj" />
</ItemGroup>

<ItemGroup>
  <PackageReference Include="Microsoft.Extensions.DependencyInjection.Abstractions" Version="9.0.5" />
  <PackageReference Include="Microsoft.Extensions.Http" Version="9.0.5" />
  <PackageReference Include="Microsoft.Extensions.Logging.Abstractions" Version="9.0.5" />
  <PackageReference Include="System.Text.Json" Version="9.0.5" />
</ItemGroup>
```

### 3. Updated API Registration

**File**: `MetricsApp.Api/Program.cs`

```csharp
// Before: Manual registration with missing dependencies
builder.Services.AddDataSources();
builder.Services.AddDataSource<PrometheusDataSource>(); // ❌ Missing IHttpClientFactory

// After: Clean registration with all dependencies
builder.Services.AddDataSources();
builder.Services.AddPrometheusDataSource(); // ✅ Includes HTTP client
```

## Registration Options

### Option 1: Simple Registration (Recommended)
```csharp
builder.Services.AddDataSources();
builder.Services.AddPrometheusDataSource();
```

### Option 2: Custom HTTP Client Configuration
```csharp
builder.Services.AddDataSources();
builder.Services.AddPrometheusDataSource(httpClient =>
{
    httpClient.Timeout = TimeSpan.FromSeconds(60);
    httpClient.DefaultRequestHeaders.Add("User-Agent", "MetricsApp/1.0");
});
```

### Option 3: Manual Registration (Advanced)
```csharp
builder.Services.AddHttpClient();
builder.Services.AddDataSource<PrometheusDataSource>();
```

## Benefits

### 1. **Encapsulation**
- ✅ All Prometheus dependencies are handled internally
- ✅ Users don't need to remember to register `IHttpClientFactory`
- ✅ Follows single responsibility principle

### 2. **Flexibility**
- ✅ Simple registration for basic use cases
- ✅ Custom HTTP client configuration for advanced scenarios
- ✅ Manual registration still available for edge cases

### 3. **Developer Experience**
- ✅ Clear, intuitive API: `AddPrometheusDataSource()`
- ✅ Self-documenting code
- ✅ Reduces configuration errors

### 4. **Consistency**
- ✅ Follows .NET extension method patterns
- ✅ Similar to other service registrations (`AddHttpClient`, `AddLogging`)
- ✅ Integrates cleanly with existing DI patterns

## Pattern for Other DataSources

This pattern can be extended to other datasources that have specific dependencies:

```csharp
// ElasticsearchDataSource extension
public static IServiceCollection AddElasticsearchDataSource(this IServiceCollection services)
{
    services.AddHttpClient();
    services.AddDataSource<ElasticsearchDataSource>();
    return services;
}

// InfluxDbDataSource extension
public static IServiceCollection AddInfluxDbDataSource(this IServiceCollection services, 
    Action<InfluxDbOptions>? configureOptions = null)
{
    services.AddHttpClient();
    if (configureOptions != null)
        services.Configure(configureOptions);
    services.AddDataSource<InfluxDbDataSource>();
    return services;
}
```

## Testing

Both projects build successfully:

```bash
✅ dotnet build MetricsApp.DataSources.Prometheus
✅ dotnet build MetricsApp.Api
```

## Documentation

Created comprehensive README at `MetricsApp.DataSources.Prometheus/README.md` with:
- Registration examples
- Configuration schema
- API usage examples
- Troubleshooting guide
- Performance considerations

## Summary

The solution provides a clean, extensible pattern for datasource registration that:
1. **Handles dependencies automatically** - No more missing `IHttpClientFactory` errors
2. **Provides flexibility** - Simple and advanced registration options
3. **Follows .NET conventions** - Familiar extension method patterns
4. **Scales well** - Pattern can be applied to other datasources
5. **Improves DX** - Clear, self-documenting API

This approach ensures that datasource plugins are easy to register and configure while maintaining the flexibility needed for different deployment scenarios. 