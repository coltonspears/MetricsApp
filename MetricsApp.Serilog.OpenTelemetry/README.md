# MetricsApp.Serilog.OpenTelemetry

A comprehensive .NET library that provides a custom Serilog sink for sending logs, metrics, and traces to your MetricsApp OpenTelemetry backend. This library makes it incredibly easy to add full observability to any C# application.

## Features

- ✅ **Custom Serilog Sink**: Automatically sends structured logs to your OpenTelemetry backend
- ✅ **Metrics Reporting**: Record counters, gauges, and histograms with automatic OTLP formatting
- ✅ **Distributed Tracing**: Create and manage spans with proper OpenTelemetry formatting
- ✅ **Combined Operations**: Trace and time operations simultaneously
- ✅ **Dependency Injection**: Full support for .NET DI container
- ✅ **Configuration**: Flexible configuration via appsettings.json or code
- ✅ **Batching**: Efficient batching and automatic flushing
- ✅ **Error Handling**: Robust error handling with optional failure logging

## Quick Start

### 1. Install the Package

```bash
dotnet add package MetricsApp.Serilog.OpenTelemetry
```

### 2. Basic Setup with Serilog

```csharp
using Serilog;
using MetricsApp.Serilog.OpenTelemetry;

// Simple setup
Log.Logger = new LoggerConfiguration()
    .WriteTo.OpenTelemetry(
        endpoint: "https://localhost:7201",
        serviceName: "my-service",
        serviceVersion: "1.0.0",
        environment: "production")
    .CreateLogger();

// Use it
Log.Information("Hello, OpenTelemetry!");
Log.Error(exception, "Something went wrong");
```

### 3. Full Telemetry Client

```csharp
using MetricsApp.Serilog.OpenTelemetry;

var config = new OpenTelemetryConfiguration
{
    Endpoint = "https://localhost:7201",
    ServiceName = "my-service",
    ServiceVersion = "1.0.0",
    Environment = "production"
};

using var telemetryClient = new OpenTelemetryTelemetryClient(config);

// Logs
telemetryClient.LogInformation("Processing user request");
telemetryClient.LogError(exception, "Failed to process request");

// Metrics
telemetryClient.RecordCounter("requests.total", tags: new() { ["method"] = "GET" });
telemetryClient.RecordGauge("memory.usage", 512.5, unit: "MB");
telemetryClient.RecordHistogram("request.duration", 145.7, unit: "ms");

// Tracing
var result = telemetryClient.TraceOperation("process-payment", activity =>
{
    activity?.SetTag("user.id", "12345");
    activity?.SetTag("amount", "99.99");
    
    // Your business logic here
    return ProcessPayment();
});

// Combined tracing + timing
var result = await telemetryClient.TraceAndTimeOperationAsync("database-query", async activity =>
{
    activity?.SetTag("query.type", "select");
    return await database.QueryAsync("SELECT * FROM users");
});
```

## Configuration

### appsettings.json

```json
{
  "OpenTelemetry": {
    "Endpoint": "https://localhost:7201",
    "ServiceName": "my-service",
    "ServiceVersion": "1.2.0",
    "Environment": "production",
    "BatchSize": 50,
    "FlushIntervalSeconds": 5,
    "EnableMetrics": true,
    "EnableTraces": true,
    "EnableLogs": true,
    "ResourceAttributes": {
      "team": "backend",
      "component": "api"
    },
    "Headers": {
      "Authorization": "Bearer your-token"
    }
  }
}
```

### Code Configuration

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.OpenTelemetry(config =>
    {
        config.Endpoint = "https://localhost:7201";
        config.ServiceName = "my-service";
        config.BatchSize = 100;
        config.FlushIntervalSeconds = 10;
        config.ResourceAttributes["datacenter"] = "us-west-2";
    })
    .CreateLogger();
```

## Dependency Injection

### Startup.cs / Program.cs

```csharp
using MetricsApp.Serilog.OpenTelemetry;

// Method 1: From configuration
builder.Services.AddOpenTelemetryClient(builder.Configuration);

// Method 2: Direct configuration
builder.Services.AddOpenTelemetryClient(config =>
{
    config.Endpoint = "https://localhost:7201";
    config.ServiceName = "my-api";
    config.Environment = "staging";
});

// Add Serilog
builder.Host.UseSerilog((context, config) =>
{
    config.WriteTo.OpenTelemetry(context.Configuration);
});
```

### Controller Usage

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly OpenTelemetryTelemetryClient _telemetry;

    public UsersController(OpenTelemetryTelemetryClient telemetry)
    {
        _telemetry = telemetry;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(int id)
    {
        return await _telemetry.TraceAndTimeOperationAsync("get-user", async activity =>
        {
            activity?.SetTag("user.id", id.ToString());
            
            _telemetry.LogInformation("Fetching user {UserId}", id);
            _telemetry.RecordCounter("users.requests");
            
            var user = await _userService.GetUserAsync(id);
            
            if (user == null)
            {
                _telemetry.RecordCounter("users.not_found");
                return NotFound();
            }
            
            _telemetry.RecordGauge("users.active", await _userService.GetActiveUserCountAsync());
            return Ok(user);
        });
    }
}
```

## Advanced Usage

### Custom Metrics with Tags

```csharp
// Counter with multiple tags
telemetryClient.RecordCounter("http.requests", 1, new Dictionary<string, string>
{
    ["method"] = "POST",
    ["status"] = "200",
    ["endpoint"] = "/api/users"
});

// Gauge for system metrics
telemetryClient.RecordGauge("system.memory.usage", GC.GetTotalMemory(false), 
    tags: new() { ["type"] = "managed" }, 
    unit: "bytes");

// Histogram for timing data
telemetryClient.RecordHistogram("database.query.duration", queryTime.TotalMilliseconds,
    tags: new() { ["table"] = "users", ["operation"] = "select" },
    unit: "milliseconds");
```

### Manual Span Creation

```csharp
using var activity = telemetryClient.StartActivity("complex-operation", ActivityKind.Internal);

activity?.SetTag("operation.type", "data-processing");
activity?.SetTag("batch.size", "1000");

try
{
    // Your complex operation
    await ProcessDataAsync();
    
    activity?.SetTag("records.processed", "1000");
    activity?.SetStatus(ActivityStatusCode.Ok);
}
catch (Exception ex)
{
    activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
    telemetryClient.LogError(ex, "Data processing failed");
    throw;
}
```

### Timed Operations

```csharp
// Simple timing
var result = telemetryClient.TimeOperation("calculate-score", () =>
{
    return CalculateComplexScore();
});

// Async timing with tags
var users = await telemetryClient.TimeOperationAsync("fetch-users", async () =>
{
    return await database.GetUsersAsync();
}, tags: new() { ["source"] = "database" });
```

## Configuration Options

| Property | Default | Description |
|----------|---------|-------------|
| `Endpoint` | `"https://localhost:7201"` | OpenTelemetry backend URL |
| `ServiceName` | `"unknown-service"` | Service identifier |
| `ServiceVersion` | `"1.0.0"` | Service version |
| `Environment` | `"development"` | Deployment environment |
| `BatchSize` | `50` | Number of events to batch |
| `FlushIntervalSeconds` | `5` | Auto-flush interval |
| `EnableMetrics` | `true` | Enable metrics reporting |
| `EnableTraces` | `true` | Enable trace reporting |
| `EnableLogs` | `true` | Enable log reporting |
| `LogFailures` | `true` | Log send failures to console |
| `HttpTimeout` | `30s` | HTTP request timeout |

## Error Handling

The library handles errors gracefully:

- Network failures are logged (if `LogFailures` is enabled) but don't affect your application
- Invalid configurations throw exceptions during setup
- Malformed telemetry data is logged and skipped
- The library won't cause your application to crash

## Performance

- **Batching**: Events are batched for efficient sending
- **Async**: All network operations are asynchronous
- **Low Overhead**: Minimal impact on application performance
- **Memory Efficient**: Bounded queues prevent memory leaks

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Check the documentation in the MetricsApp project
- Review the sample applications

---

**Happy Observing!** 🔍📊📈
