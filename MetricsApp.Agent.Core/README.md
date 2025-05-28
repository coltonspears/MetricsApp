# MetricsApp.Agent.Core

## Overview

The Agent Core library provides the foundational framework for building metric collection agents in the MetricsApp project. It defines the core abstractions and services needed to collect metrics from various sources and emit them to different destinations.

## Features

- **Collector Framework**: Pluggable metric collectors for different data sources
- **Emitter Framework**: Pluggable emitters for different destinations
- **Scheduling**: Configurable collection intervals
- **Error Handling**: Robust error handling and retry logic
- **Hosting Integration**: Built on .NET Generic Host for easy deployment

## Core Abstractions

### IMetricCollector

Interface for components that collect metrics from specific sources.

```csharp
public interface IMetricCollector
{
    string CollectorName { get; }
    Task<IEnumerable<EventDto>> CollectAsync(CancellationToken cancellationToken = default);
}
```

**Implementations:**
- `MetricsApp.Agent.Collectors.WindowsPerfCounters`
- Future: `MetricsApp.Agent.Collectors.SystemMetrics`, `MetricsApp.Agent.Collectors.ApplicationMetrics`

### IMetricEmitter

Interface for components that emit collected metrics to destinations.

```csharp
public interface IMetricEmitter
{
    string EmitterName { get; }
    Task EmitAsync(IEnumerable<EventDto> events, CancellationToken cancellationToken = default);
}
```

**Implementations:**
- `MetricsApp.Agent.Emitters.Http`
- `MetricsApp.Agent.Emitters.Queue`
- Future: `MetricsApp.Agent.Emitters.File`, `MetricsApp.Agent.Emitters.Syslog`

## Services

### MetricCollectionService

The main orchestration service that coordinates collectors and emitters.

**Key Responsibilities:**
- Schedule metric collection from all registered collectors
- Aggregate collected metrics
- Route metrics to appropriate emitters
- Handle errors and retries

**Configuration:**
```json
{
  "MetricCollection": {
    "CollectionInterval": "00:00:30",
    "BatchSize": 100,
    "MaxRetries": 3,
    "RetryDelay": "00:00:10"
  }
}
```

## Extension Methods

### ServiceCollectionExtensions

Provides convenient extension methods for dependency injection setup.

```csharp
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddMetricCollection(this IServiceCollection services);
    public static IServiceCollection AddMetricCollector<T>(this IServiceCollection services) where T : class, IMetricCollector;
    public static IServiceCollection AddMetricEmitter<T>(this IServiceCollection services) where T : class, IMetricEmitter;
}
```

## Usage

### Basic Setup

```csharp
var builder = Host.CreateApplicationBuilder(args);

// Add core metric collection services
builder.Services.AddMetricCollection();

// Add specific collectors
builder.Services.AddMetricCollector<WindowsPerfCountersCollector>();

// Add specific emitters
builder.Services.AddMetricEmitter<HttpEmitter>();
builder.Services.AddMetricEmitter<QueueEmitter>();

var host = builder.Build();
await host.RunAsync();
```

### Configuration

```json
{
  "MetricCollection": {
    "CollectionInterval": "00:00:30",
    "BatchSize": 100,
    "MaxRetries": 3,
    "RetryDelay": "00:00:10",
    "EnabledCollectors": [
      "WindowsPerfCounters",
      "SystemMetrics"
    ],
    "EnabledEmitters": [
      "Http",
      "Queue"
    ]
  }
}
```

### Custom Collector

```csharp
public class CustomMetricCollector : IMetricCollector
{
    public string CollectorName => "CustomMetrics";

    public async Task<IEnumerable<EventDto>> CollectAsync(CancellationToken cancellationToken = default)
    {
        // Collect metrics from your custom source
        var events = new List<EventDto>();
        
        // Add your collection logic here
        
        return events;
    }
}

// Register in DI container
services.AddMetricCollector<CustomMetricCollector>();
```

### Custom Emitter

```csharp
public class CustomMetricEmitter : IMetricEmitter
{
    public string EmitterName => "CustomEmitter";

    public async Task EmitAsync(IEnumerable<EventDto> events, CancellationToken cancellationToken = default)
    {
        // Emit metrics to your custom destination
        foreach (var evt in events)
        {
            // Add your emission logic here
        }
    }
}

// Register in DI container
services.AddMetricEmitter<CustomMetricEmitter>();
```

## Dependencies

```xml
<PackageReference Include="Microsoft.Extensions.Hosting" Version="9.0.5" />
<PackageReference Include="MetricsApp.Core" />
```

## Deployment

### Console Application
```csharp
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddMetricCollection();
// Add collectors and emitters
var host = builder.Build();
await host.RunAsync();
```

### Windows Service
```csharp
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddWindowsService();
builder.Services.AddMetricCollection();
// Add collectors and emitters
var host = builder.Build();
await host.RunAsync();
```

### Docker
```dockerfile
FROM mcr.microsoft.com/dotnet/runtime:9.0
COPY . /app
WORKDIR /app
ENTRYPOINT ["dotnet", "YourAgent.dll"]
```

## Monitoring

### Built-in Metrics
- Collection success/failure rates
- Collection duration
- Emitter success/failure rates
- Queue depths and processing times

### Health Checks
- Collector health status
- Emitter connectivity
- Overall agent health

### Logging
- Structured logging with correlation IDs
- Performance metrics
- Error details and stack traces

## Best Practices

### Performance
- Use async/await throughout
- Implement proper cancellation token support
- Batch operations where possible
- Monitor memory usage

### Reliability
- Implement retry logic with exponential backoff
- Handle transient failures gracefully
- Use circuit breaker pattern for external dependencies
- Implement proper error logging

### Security
- Secure credential storage
- Encrypt sensitive configuration
- Use least privilege principles
- Validate all inputs 