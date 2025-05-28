# MetricsApp.Cache.InMemory

## Overview

The InMemory Cache library provides a high-performance, in-memory caching implementation for the MetricsApp project. It implements the `ICachingService` interface using .NET's built-in `IMemoryCache` for fast, local caching scenarios.

## Features

- **High Performance**: In-memory storage with minimal overhead
- **Type Safety**: Generic methods with automatic serialization
- **Expiration Support**: Both absolute and sliding expiration
- **Memory Management**: Automatic cleanup of expired entries
- **Thread Safe**: Concurrent access support

## Implementation

### InMemoryCachingService

The main implementation of `ICachingService` using `IMemoryCache`.

```csharp
public class InMemoryCachingService : ICachingService
{
    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken) where T : class;
    public async Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpirationRelativeToNow = null, 
                                  TimeSpan? slidingExpiration = null, CancellationToken cancellationToken = default) where T : class;
    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default);
}
```

## Configuration

### Dependency Injection

```csharp
// Basic registration
services.AddSingleton<ICachingService, InMemoryCachingService>();

// With configuration
services.Configure<MemoryCacheOptions>(options =>
{
    options.SizeLimit = 1000;
    options.CompactionPercentage = 0.25;
});
services.AddSingleton<ICachingService, InMemoryCachingService>();
```

### Extension Methods

```csharp
// Convenient extension method
services.AddInMemoryCache();

// With options
services.AddInMemoryCache(options =>
{
    options.SizeLimit = 1000;
    options.CompactionPercentage = 0.25;
});
```

### Configuration Options

```json
{
  "MemoryCache": {
    "SizeLimit": 1000,
    "CompactionPercentage": 0.25,
    "ExpirationScanFrequency": "00:05:00"
  }
}
```

**Options:**
- `SizeLimit`: Maximum number of cache entries
- `CompactionPercentage`: Percentage of entries to remove when limit is reached
- `ExpirationScanFrequency`: How often to scan for expired entries

## Usage

### Basic Operations

```csharp
public class QueryService
{
    private readonly ICachingService _cache;

    public QueryService(ICachingService cache)
    {
        _cache = cache;
    }

    public async Task<LogQueryResult> GetLogsAsync(LogQueryCriteria criteria)
    {
        var cacheKey = $"logs:{criteria.GetHashCode()}";
        
        // Try to get from cache
        var cached = await _cache.GetAsync<LogQueryResult>(cacheKey);
        if (cached != null)
            return cached;

        // Get from repository
        var result = await _repository.QueryLogsAsync(criteria);
        
        // Cache the result
        await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));
        
        return result;
    }
}
```

### Cache Key Strategies

```csharp
public static class CacheKeys
{
    public static string LogQuery(LogQueryCriteria criteria) =>
        $"logs:{criteria.StartTime:yyyyMMddHHmm}:{criteria.EndTime:yyyyMMddHHmm}:{criteria.HostName}:{criteria.SeverityLevel}";

    public static string MetricQuery(MetricQueryCriteria criteria) =>
        $"metrics:{criteria.StartTime:yyyyMMddHHmm}:{criteria.EndTime:yyyyMMddHHmm}:{criteria.MetricName}:{criteria.HostName}";
}
```

### Expiration Strategies

```csharp
// Absolute expiration (expires at specific time)
await _cache.SetAsync("key", value, TimeSpan.FromMinutes(30));

// Sliding expiration (extends on access)
await _cache.SetAsync("key", value, null, TimeSpan.FromMinutes(10));

// Both (expires at 1 hour OR 10 minutes after last access)
await _cache.SetAsync("key", value, TimeSpan.FromHours(1), TimeSpan.FromMinutes(10));
```

## Performance Characteristics

### Advantages
- **Ultra-fast access**: Direct memory access with no serialization
- **Low latency**: Sub-millisecond response times
- **No network overhead**: Local memory storage
- **Simple deployment**: No external dependencies

### Limitations
- **Single instance**: Cache is not shared across processes
- **Memory bound**: Limited by available system memory
- **Volatile**: Cache is lost on application restart
- **No persistence**: Data is not persisted to disk

## Memory Management

### Automatic Cleanup
- Expired entries are automatically removed
- Background scanning for expired entries
- Configurable scan frequency

### Memory Pressure Handling
- Automatic compaction when memory pressure is detected
- Configurable compaction percentage
- LRU (Least Recently Used) eviction policy

### Monitoring

```csharp
public class CacheMetrics
{
    private readonly IMemoryCache _memoryCache;

    public int EntryCount => GetEntryCount();
    public long EstimatedSize => GetEstimatedSize();
    
    private int GetEntryCount()
    {
        // Implementation to get entry count
    }
}
```

## Best Practices

### Cache Key Design
- Use consistent naming conventions
- Include relevant parameters in keys
- Avoid overly long keys
- Use hierarchical naming for related data

### Expiration Strategy
- Use sliding expiration for frequently accessed data
- Use absolute expiration for time-sensitive data
- Consider data freshness requirements
- Monitor cache hit rates

### Memory Usage
- Monitor memory consumption
- Set appropriate size limits
- Use cache-aside pattern
- Implement cache warming for critical data

## Troubleshooting

### High Memory Usage
- Check cache size limits
- Review expiration settings
- Monitor entry count
- Consider data size per entry

### Low Hit Rates
- Review cache key generation
- Check expiration times
- Analyze access patterns
- Consider cache warming

### Performance Issues
- Monitor GC pressure
- Check for memory leaks
- Review serialization overhead
- Consider cache partitioning

## Dependencies

```xml
<PackageReference Include="Microsoft.Extensions.Caching.Memory" Version="9.0.5" />
<PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="9.0.5" />
<PackageReference Include="MetricsApp.Abstractions" />
``` 