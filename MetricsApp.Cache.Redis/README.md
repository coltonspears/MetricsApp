# MetricsApp.Cache.Redis

## Overview

The Redis Cache library provides a distributed caching implementation for the MetricsApp project. It implements the `ICachingService` interface using Redis for scalable, shared caching across multiple application instances.

## Features

- **Distributed Caching**: Shared cache across multiple instances
- **High Performance**: Redis-optimized operations
- **Persistence**: Optional data persistence to disk
- **Scalability**: Horizontal scaling with Redis clustering
- **JSON Serialization**: Automatic object serialization/deserialization

## Implementation

### RedisCachingService

The main implementation of `ICachingService` using StackExchange.Redis.

```csharp
public class RedisCachingService : ICachingService
{
    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken) where T : class;
    public async Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpirationRelativeToNow = null, 
                                  TimeSpan? slidingExpiration = null, CancellationToken cancellationToken = default) where T : class;
    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default);
}
```

## Configuration

### Connection String

```json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379"
  },
  "Redis": {
    "KeyPrefix": "metricsapp:",
    "Database": 0,
    "ConnectTimeout": 5000,
    "SyncTimeout": 5000
  }
}
```

### Dependency Injection

```csharp
// Basic registration
services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = "localhost:6379";
});
services.AddSingleton<ICachingService, RedisCachingService>();

// With configuration
services.Configure<RedisCacheOptions>(Configuration.GetSection("Redis"));
services.AddSingleton<ICachingService, RedisCachingService>();
```

### Extension Methods

```csharp
// Convenient extension method
services.AddRedisCache(Configuration.GetConnectionString("Redis"));

// With options
services.AddRedisCache(options =>
{
    options.Configuration = "localhost:6379";
    options.InstanceName = "MetricsApp";
    options.KeyPrefix = "metricsapp:";
});
```

## Configuration Options

### RedisCacheOptions

```csharp
public class RedisCacheOptions
{
    public string Configuration { get; set; } = "localhost:6379";
    public string? InstanceName { get; set; }
    public string KeyPrefix { get; set; } = "metricsapp:";
    public int Database { get; set; } = 0;
    public int ConnectTimeout { get; set; } = 5000;
    public int SyncTimeout { get; set; } = 5000;
    public bool AbortOnConnectFail { get; set; } = false;
}
```

### Redis Configuration

```json
{
  "Redis": {
    "Configuration": "localhost:6379",
    "InstanceName": "MetricsApp",
    "KeyPrefix": "metricsapp:",
    "Database": 0,
    "ConnectTimeout": 5000,
    "SyncTimeout": 5000,
    "AbortOnConnectFail": false
  }
}
```

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
        
        // Cache the result with 5-minute expiration
        await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(5));
        
        return result;
    }
}
```

### Advanced Redis Operations

```csharp
public class AdvancedRedisCachingService : RedisCachingService
{
    private readonly IDatabase _database;

    public async Task<bool> ExistsAsync(string key)
    {
        return await _database.KeyExistsAsync(key);
    }

    public async Task<TimeSpan?> GetTtlAsync(string key)
    {
        return await _database.KeyTimeToLiveAsync(key);
    }

    public async Task<long> IncrementAsync(string key, long value = 1)
    {
        return await _database.StringIncrementAsync(key, value);
    }

    public async Task SetExpirationAsync(string key, TimeSpan expiration)
    {
        await _database.KeyExpireAsync(key, expiration);
    }
}
```

## Performance Characteristics

### Advantages
- **Distributed**: Shared across multiple instances
- **Persistent**: Optional data persistence
- **Scalable**: Supports clustering and replication
- **Feature Rich**: Advanced data structures and operations
- **High Throughput**: Optimized for high-performance scenarios

### Considerations
- **Network Latency**: Remote calls add latency
- **Serialization Overhead**: JSON serialization/deserialization
- **Connection Management**: Connection pooling and failover
- **Memory Usage**: Redis memory consumption

## Connection Management

### Connection Resilience

```csharp
public class RedisConnectionManager
{
    private readonly ConnectionMultiplexer _connection;
    private readonly ILogger<RedisConnectionManager> _logger;

    public async Task<IDatabase> GetDatabaseAsync()
    {
        if (!_connection.IsConnected)
        {
            _logger.LogWarning("Redis connection lost, attempting to reconnect...");
            // Implement reconnection logic
        }
        
        return _connection.GetDatabase();
    }
}
```

### Health Checks

```csharp
public class RedisHealthCheck : IHealthCheck
{
    private readonly IConnectionMultiplexer _connection;

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var database = _connection.GetDatabase();
            await database.PingAsync();
            return HealthCheckResult.Healthy("Redis is responsive");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Redis is not responsive", ex);
        }
    }
}

// Registration
services.AddHealthChecks()
    .AddCheck<RedisHealthCheck>("redis");
```

## Serialization

### JSON Serialization

```csharp
public class JsonSerializer
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static string Serialize<T>(T value)
    {
        return System.Text.Json.JsonSerializer.Serialize(value, Options);
    }

    public static T? Deserialize<T>(string json)
    {
        return System.Text.Json.JsonSerializer.Deserialize<T>(json, Options);
    }
}
```

## Monitoring and Metrics

### Redis Metrics

```csharp
public class RedisMetrics
{
    private readonly IConnectionMultiplexer _connection;

    public async Task<RedisInfo> GetInfoAsync()
    {
        var server = _connection.GetServer(_connection.GetEndPoints().First());
        var info = await server.InfoAsync();
        
        return new RedisInfo
        {
            ConnectedClients = info.FirstOrDefault(x => x.Key == "connected_clients")?.Value,
            UsedMemory = info.FirstOrDefault(x => x.Key == "used_memory")?.Value,
            TotalCommandsProcessed = info.FirstOrDefault(x => x.Key == "total_commands_processed")?.Value
        };
    }
}
```

### Performance Monitoring

```csharp
public class RedisCachingServiceWithMetrics : RedisCachingService
{
    private readonly IMetrics _metrics;

    public override async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken)
    {
        using var timer = _metrics.Measure.Timer.Time("redis.get");
        
        try
        {
            var result = await base.GetAsync<T>(key, cancellationToken);
            _metrics.Measure.Counter.Increment("redis.cache.hit", result != null ? 1 : 0);
            return result;
        }
        catch (Exception)
        {
            _metrics.Measure.Counter.Increment("redis.cache.error");
            throw;
        }
    }
}
```

## Best Practices

### Key Design
- Use consistent key prefixes
- Include version information in keys
- Avoid very long keys (>250 characters)
- Use hierarchical naming conventions

### Memory Management
- Set appropriate expiration times
- Monitor Redis memory usage
- Use Redis memory optimization features
- Consider data compression for large objects

### Connection Management
- Use connection pooling
- Implement proper error handling
- Monitor connection health
- Configure appropriate timeouts

## Troubleshooting

### Connection Issues
- Check Redis server availability
- Verify connection string
- Review firewall settings
- Monitor connection pool exhaustion

### Performance Issues
- Monitor network latency
- Check serialization overhead
- Review key distribution
- Analyze Redis slow log

### Memory Issues
- Monitor Redis memory usage
- Check for memory leaks
- Review expiration policies
- Consider data archival strategies

## Dependencies

```xml
<PackageReference Include="StackExchange.Redis" Version="2.8.16" />
<PackageReference Include="Microsoft.Extensions.Caching.StackExchangeRedis" Version="9.0.5" />
<PackageReference Include="System.Text.Json" Version="9.0.5" />
<PackageReference Include="MetricsApp.Abstractions" />
```

## Deployment Considerations

### Redis Setup
- Use Redis Cluster for high availability
- Configure persistence (RDB/AOF)
- Set up monitoring and alerting
- Implement backup strategies

### Security
- Enable Redis AUTH
- Use TLS encryption
- Restrict network access
- Regular security updates 