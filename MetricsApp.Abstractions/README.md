# MetricsApp.Abstractions

## Overview

The Abstractions library defines the core interfaces and contracts used throughout the MetricsApp ecosystem. This package enables dependency inversion and allows for multiple implementations of key components like caching, queuing, data storage, and parsing.

## Key Interfaces

### Data Access

#### IDataRepository
Central interface for data storage and retrieval operations.

```csharp
public interface IDataRepository
{
    Task StoreLogsAsync(IEnumerable<LogRecord> logs, CancellationToken cancellationToken = default);
    Task StoreMetricsAsync(IEnumerable<Metric> metrics, CancellationToken cancellationToken = default);
    Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default);
    Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default);
}
```

**Implementations:**
- `MetricsApp.Repository.InMemory`
- Future: `MetricsApp.Repository.EntityFramework`, `MetricsApp.Repository.Elasticsearch`

### Caching

#### ICachingService
Generic caching interface supporting typed operations.

```csharp
public interface ICachingService
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken) where T : class;
    Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpirationRelativeToNow = null, 
                     TimeSpan? slidingExpiration = null, CancellationToken cancellationToken = default) where T : class;
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
}
```

**Implementations:**
- `MetricsApp.Cache.InMemory`
- `MetricsApp.Cache.Redis`

### Message Queuing

#### IMessageQueueProducer<T>
Interface for producing messages to a queue.

```csharp
public interface IMessageQueueProducer<T> where T : class
{
    Task EnqueueAsync(T message, CancellationToken cancellationToken = default);
    Task EnqueueBatchAsync(IEnumerable<T> messages, CancellationToken cancellationToken = default);
}
```

#### IMessageQueueConsumer<T>
Interface for consuming messages from a queue.

```csharp
public interface IMessageQueueConsumer<T> where T : class
{
    Task<T?> DequeueAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<T>> DequeueBatchAsync(int maxCount, CancellationToken cancellationToken = default);
    event EventHandler<T> MessageReceived;
    Task StartListeningAsync(CancellationToken cancellationToken = default);
    Task StopListeningAsync();
}
```

**Implementations:**
- `MetricsApp.Queue.InMemory`
- Future: `MetricsApp.Queue.RabbitMQ`, `MetricsApp.Queue.AzureServiceBus`

### Data Parsing

#### IDataParser
Interface for transforming raw event data into unified models.

```csharp
public interface IDataParser
{
    bool CanParse(string sourceType);
    IEnumerable<object> Parse(EventDto rawEvent);
}
```

#### IDataParserFactory
Factory for creating appropriate parsers based on source type.

```csharp
public interface IDataParserFactory
{
    IDataParser? GetParser(string sourceType);
}
```

**Implementations:**
- `MetricsApp.Parser.WindowsPerfCounters`
- Future: `MetricsApp.Parser.Syslog`, `MetricsApp.Parser.Json`

## Usage

Include this package in any project that needs to work with MetricsApp abstractions:

```xml
<PackageReference Include="MetricsApp.Abstractions" Version="1.0.0" />
```

## Dependency Injection

All interfaces are designed to work with .NET's built-in dependency injection container:

```csharp
services.AddScoped<IDataRepository, InMemoryDataRepository>();
services.AddSingleton<ICachingService, InMemoryCachingService>();
services.AddScoped<IMessageQueueProducer<EventDto>, InMemoryMessageQueueProducer<EventDto>>();
```

## Design Principles

- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: Depend on abstractions, not concretions
- **Generic where appropriate**: Type-safe operations
- **Async by default**: All operations support cancellation
- **Extensible**: Easy to add new implementations 