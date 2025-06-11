# Simplified DataSource Registration

## Before: Complex Registration with Temporary Instances

The original implementation had several issues:

### Problems with Original Approach
```csharp
public void RegisterDataSource<T>() where T : class, IDataSource
{
    // ❌ Creates unnecessary temporary instance
    var tempInstance = Activator.CreateInstance<T>();
    
    // ❌ Duplicated metadata extraction logic
    var typeInfo = new DataSourceTypeInfo
    {
        DataSourceType = tempInstance.DataSourceType,
        DisplayName = tempInstance.DisplayName,
        Description = tempInstance.Description,
        Version = tempInstance.Version,
        ConfigurationSchema = tempInstance.GetConfigurationSchema(),
        Factory = serviceProvider => ActivatorUtilities.CreateInstance<T>(serviceProvider)
    };
    
    // ❌ Potential issues with parameterless constructor requirement
    _dataSourceTypes[tempInstance.DataSourceType] = typeInfo;
}

public void RegisterDataSource(string dataSourceType, Func<IServiceProvider, IDataSource> factory)
{
    // ❌ Creates temporary service provider and instance
    var tempInstance = factory(new ServiceCollection().BuildServiceProvider());
    
    // ❌ Same duplicated logic
    var typeInfo = new DataSourceTypeInfo { /* ... */ };
}
```

### Issues:
1. **Wasteful**: Creates temporary instances just for metadata
2. **Fragile**: Requires parameterless constructors
3. **Duplicated**: Same logic in both methods
4. **Resource Heavy**: Creates service providers unnecessarily
5. **Timing Issues**: Registration happens during DI setup

## After: Simplified Lazy Registration

### ✅ New Simplified Approach

```csharp
public void RegisterDataSource<T>() where T : class, IDataSource
{
    // ✅ Single method handles both cases
    RegisterDataSource(typeof(T), serviceProvider => ActivatorUtilities.CreateInstance<T>(serviceProvider));
}

public void RegisterDataSource(string dataSourceType, Func<IServiceProvider, IDataSource> factory)
{
    // ✅ Single method handles both cases
    RegisterDataSource(null, factory, dataSourceType);
}

private void RegisterDataSource(Type? dataSourceType, Func<IServiceProvider, IDataSource> factory, string? explicitDataSourceType = null)
{
    var typeInfo = new DataSourceTypeInfo { Factory = factory };
    var dataSourceTypeName = explicitDataSourceType ?? GetDataSourceTypeName(dataSourceType!);
    
    // ✅ Store factory only, populate metadata lazily
    _dataSourceTypes[dataSourceTypeName] = typeInfo;
}

private void EnsureTypeInfoPopulated(string dataSourceType, DataSourceTypeInfo typeInfo)
{
    if (!string.IsNullOrEmpty(typeInfo.DisplayName)) return; // Already populated
    
    // ✅ Create instance only when metadata is actually needed
    using var serviceProvider = new ServiceCollection().AddLogging().AddHttpClient().BuildServiceProvider();
    var instance = typeInfo.Factory(serviceProvider);
    
    // ✅ Populate metadata from actual instance
    typeInfo.DataSourceType = dataSourceType;
    typeInfo.DisplayName = instance.DisplayName;
    typeInfo.Description = instance.Description;
    typeInfo.Version = instance.Version;
    typeInfo.ConfigurationSchema = instance.GetConfigurationSchema();
    
    // ✅ Properly dispose temporary instance
    if (instance is IAsyncDisposable asyncDisposable)
        asyncDisposable.DisposeAsync().AsTask().Wait();
    else if (instance is IDisposable disposable)
        disposable.Dispose();
}
```

## Usage Examples

### Simple Registration
```csharp
// Before: Complex DI setup with marker interfaces
services.AddSingleton<IDataSourceRegistration>(provider =>
{
    var registry = provider.GetRequiredService<IDataSourceRegistry>();
    registry.RegisterDataSource<PrometheusDataSource>();
    return new DataSourceRegistration<PrometheusDataSource>();
});

// After: Clean and simple
services.AddDataSource<PrometheusDataSource>();
```

### Custom Factory Registration
```csharp
// Before: Manual registry access
services.AddSingleton<IDataSourceRegistration>(provider =>
{
    var registry = provider.GetRequiredService<IDataSourceRegistry>();
    registry.RegisterDataSource("custom", sp => new CustomDataSource(sp.GetService<ISpecialService>()));
    return new DataSourceRegistration();
});

// After: Clean extension method
services.AddDataSource("custom", sp => new CustomDataSource(sp.GetService<ISpecialService>()));
```

### Complete Setup
```csharp
// Program.cs
builder.Services.AddDataSources();
builder.Services.AddDataSource<PrometheusDataSource>();
builder.Services.AddDataSource<ElasticsearchDataSource>();
builder.Services.AddDataSource("custom", sp => new CustomDataSource(sp.GetService<ILogger>()));

var app = builder.Build();
// ✅ All datasources are automatically registered on startup
```

## Benefits of New Approach

### 1. **Performance**
- ✅ No temporary instances during registration
- ✅ Lazy metadata loading only when needed
- ✅ Proper resource disposal

### 2. **Flexibility**
- ✅ No parameterless constructor requirement
- ✅ Works with complex dependency injection
- ✅ Supports custom factories easily

### 3. **Simplicity**
- ✅ Single registration method internally
- ✅ Clean extension methods
- ✅ Automatic naming conventions

### 4. **Reliability**
- ✅ Proper error handling and fallbacks
- ✅ Resource cleanup
- ✅ Startup-time registration

### 5. **Developer Experience**
- ✅ Simple `AddDataSource<T>()` call
- ✅ Automatic type name inference
- ✅ Clear error messages

## Automatic Naming Convention

The new system automatically generates datasource type names:

```csharp
// Class name -> Datasource type
PrometheusDataSource -> "prometheus"
ElasticsearchDataSource -> "elasticsearch"
InfluxDbDataSource -> "influxdb"
CustomMetricsDataSource -> "custommetrics"

// Manual override still supported
services.AddDataSource("my-custom-name", factory);
```

## Migration Path

Existing code continues to work, but you can now use the simpler approach:

```csharp
// Old way (still works)
var registry = serviceProvider.GetRequiredService<IDataSourceRegistry>();
registry.RegisterDataSource<PrometheusDataSource>();

// New way (recommended)
services.AddDataSource<PrometheusDataSource>();
``` 