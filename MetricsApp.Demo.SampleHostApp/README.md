# MetricsApp.Demo.SampleHostApp

## Overview

The Sample Host App is a demonstration application that showcases how to integrate and use the MetricsApp agent components. It serves as both a reference implementation and a testing tool for the MetricsApp project.

## Features

- **Complete Agent Setup**: Demonstrates full agent configuration
- **Multiple Collectors**: Shows how to use different metric collectors
- **Multiple Emitters**: Demonstrates various emission strategies
- **Configuration Examples**: Provides real-world configuration scenarios
- **Monitoring Dashboard**: Simple web interface to view collected metrics

## Architecture

The demo application demonstrates a typical agent deployment:

```
[Windows Perf Counters] → [Collector] → [Agent Core] → [HTTP Emitter] → [MetricsApp API]
                                                    → [Queue Emitter] → [Local Queue]
```

## Components Demonstrated

### Collectors
- **Windows Performance Counters**: CPU, Memory, Disk metrics
- **Custom Application Metrics**: Business-specific metrics

### Emitters
- **HTTP Emitter**: Direct submission to MetricsApp API
- **Queue Emitter**: Local queuing for reliability

### Configuration
- **Multiple Environments**: Development, staging, production configs
- **Dynamic Configuration**: Runtime configuration changes
- **Credential Management**: Secure credential handling

## Configuration

### appsettings.json

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "MetricsApp": "Debug"
    }
  },
  "MetricCollection": {
    "CollectionInterval": "00:00:30",
    "BatchSize": 50,
    "MaxRetries": 3,
    "RetryDelay": "00:00:10",
    "EnabledCollectors": [
      "WindowsPerfCounters"
    ],
    "EnabledEmitters": [
      "Http",
      "Queue"
    ]
  },
  "WindowsPerfCounters": {
    "Counters": [
      {
        "CategoryName": "Processor",
        "CounterName": "% Processor Time",
        "InstanceName": "_Total"
      },
      {
        "CategoryName": "Memory",
        "CounterName": "Available MBytes"
      }
    ]
  },
  "HttpEmitter": {
    "BaseUrl": "https://localhost:7001",
    "ApiKey": "demo-api-key",
    "Timeout": "00:00:30",
    "RetryCount": 3
  },
  "QueueEmitter": {
    "QueueName": "metrics-queue",
    "BatchSize": 100
  }
}
```

### Environment-Specific Configuration

#### Development
```json
{
  "MetricCollection": {
    "CollectionInterval": "00:00:10"
  },
  "HttpEmitter": {
    "BaseUrl": "https://localhost:7001"
  }
}
```

#### Production
```json
{
  "MetricCollection": {
    "CollectionInterval": "00:01:00"
  },
  "HttpEmitter": {
    "BaseUrl": "https://api.metricsapp.com"
  }
}
```

## Usage

### Running the Demo

```bash
# Clone the repository
git clone <repository-url>
cd MetricsApp

# Run the demo application
dotnet run --project MetricsApp.Demo.SampleHostApp

# Or with specific environment
dotnet run --project MetricsApp.Demo.SampleHostApp --environment Production
```

### Docker Deployment

```dockerfile
FROM mcr.microsoft.com/dotnet/runtime:9.0
COPY . /app
WORKDIR /app
ENTRYPOINT ["dotnet", "MetricsApp.Demo.SampleHostApp.dll"]
```

```bash
# Build and run with Docker
docker build -t metricsapp-demo .
docker run -d --name metricsapp-demo metricsapp-demo
```

### Windows Service Deployment

```bash
# Install as Windows Service
sc create MetricsAppDemo binPath="C:\path\to\MetricsApp.Demo.SampleHostApp.exe"
sc start MetricsAppDemo
```

## Monitoring and Observability

### Built-in Metrics

The demo app exposes metrics about its own operation:

- **Collection Metrics**: Success/failure rates, collection duration
- **Emission Metrics**: HTTP response times, queue depths
- **System Metrics**: Memory usage, CPU utilization
- **Error Metrics**: Exception counts, retry attempts

### Health Checks

```csharp
// Health check endpoints
GET /health
GET /health/ready
GET /health/live
```

### Logging

Structured logging with correlation IDs:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "Information",
  "message": "Metrics collected successfully",
  "properties": {
    "CollectorName": "WindowsPerfCounters",
    "MetricCount": 15,
    "Duration": "00:00:02.123",
    "CorrelationId": "abc123"
  }
}
```

## Customization Examples

### Adding Custom Metrics

```csharp
public class BusinessMetricsCollector : IMetricCollector
{
    public string CollectorName => "BusinessMetrics";

    public async Task<IEnumerable<EventDto>> CollectAsync(CancellationToken cancellationToken = default)
    {
        var events = new List<EventDto>();

        // Collect business-specific metrics
        events.Add(new EventDto
        {
            SourceType = "business-metrics",
            Timestamp = DateTimeOffset.UtcNow,
            HostName = Environment.MachineName,
            Payload = new
            {
                OrdersPerMinute = await GetOrdersPerMinute(),
                ActiveUsers = await GetActiveUserCount(),
                ResponseTime = await GetAverageResponseTime()
            }
        });

        return events;
    }
}

// Register in Program.cs
builder.Services.AddMetricCollector<BusinessMetricsCollector>();
```

### Custom Emitter

```csharp
public class FileEmitter : IMetricEmitter
{
    public string EmitterName => "File";

    public async Task EmitAsync(IEnumerable<EventDto> events, CancellationToken cancellationToken = default)
    {
        var fileName = $"metrics-{DateTime.UtcNow:yyyyMMdd-HHmm}.json";
        var json = JsonSerializer.Serialize(events, new JsonSerializerOptions { WriteIndented = true });
        
        await File.WriteAllTextAsync(fileName, json, cancellationToken);
    }
}

// Register in Program.cs
builder.Services.AddMetricEmitter<FileEmitter>();
```

## Testing Scenarios

### Load Testing

```csharp
public class LoadTestCollector : IMetricCollector
{
    public string CollectorName => "LoadTest";

    public async Task<IEnumerable<EventDto>> CollectAsync(CancellationToken cancellationToken = default)
    {
        // Generate high-volume test data
        var events = new List<EventDto>();
        
        for (int i = 0; i < 1000; i++)
        {
            events.Add(CreateTestEvent(i));
        }
        
        return events;
    }
}
```

### Error Simulation

```csharp
public class ErrorSimulationCollector : IMetricCollector
{
    private readonly Random _random = new();

    public async Task<IEnumerable<EventDto>> CollectAsync(CancellationToken cancellationToken = default)
    {
        // Randomly throw exceptions to test error handling
        if (_random.NextDouble() < 0.1) // 10% error rate
        {
            throw new InvalidOperationException("Simulated collection error");
        }

        return await CollectNormalMetrics();
    }
}
```

## Troubleshooting

### Common Issues

**Metrics Not Appearing**
- Check collector configuration
- Verify emitter connectivity
- Review error logs

**High Memory Usage**
- Reduce collection frequency
- Decrease batch sizes
- Monitor queue depths

**Connection Errors**
- Verify API endpoint URLs
- Check network connectivity
- Review authentication settings

### Debug Mode

Enable debug logging for detailed troubleshooting:

```json
{
  "Logging": {
    "LogLevel": {
      "MetricsApp": "Debug",
      "MetricsApp.Agent": "Trace"
    }
  }
}
```

## Performance Tuning

### Collection Optimization
- Adjust collection intervals based on data freshness requirements
- Use appropriate batch sizes for your network conditions
- Monitor collector performance and optimize slow collectors

### Emission Optimization
- Configure retry policies for reliability
- Use connection pooling for HTTP emitters
- Implement circuit breakers for external dependencies

## Dependencies

```xml
<PackageReference Include="Microsoft.Extensions.Hosting" Version="9.0.5" />
<PackageReference Include="MetricsApp.Agent.Core" />
<PackageReference Include="MetricsApp.Agent.Collectors.WindowsPerfCounters" />
<PackageReference Include="MetricsApp.Agent.Emitters.Http" />
<PackageReference Include="MetricsApp.Agent.Emitters.Queue" />
```

## Next Steps

After running the demo:

1. **Explore Configuration**: Modify settings to see their effects
2. **Add Custom Collectors**: Implement collectors for your specific needs
3. **Test Different Emitters**: Try various emission strategies
4. **Monitor Performance**: Use the built-in metrics and health checks
5. **Deploy to Production**: Adapt the configuration for your environment 