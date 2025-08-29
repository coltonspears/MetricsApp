# Quick Start Guide - MetricsApp.Serilog.OpenTelemetry

## Installation

### From Local Project Reference
```xml
<ProjectReference Include="path\to\MetricsApp.Serilog.OpenTelemetry\MetricsApp.Serilog.OpenTelemetry.csproj" />
```

### Future NuGet Package
```bash
dotnet add package MetricsApp.Serilog.OpenTelemetry
```

## Basic Usage

### 1. Simple Serilog Setup

```csharp
using Serilog;
using MetricsApp.Serilog.OpenTelemetry;

// Basic setup
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.OpenTelemetry(
        endpoint: "https://localhost:7201",
        serviceName: "my-service",
        serviceVersion: "1.0.0",
        environment: "production")
    .CreateLogger();

// Use normal Serilog logging
Log.Information("Hello, OpenTelemetry!");
Log.Error(exception, "Something went wrong");
```

### 2. Full Telemetry Client (Logs + Metrics + Traces)

```csharp
using MetricsApp.Serilog.OpenTelemetry;

var config = new OpenTelemetryConfiguration
{
    Endpoint = "https://localhost:7201",
    ServiceName = "my-service",
    ServiceVersion = "1.0.0",
    Environment = "production"
};

using var telemetry = new OpenTelemetryTelemetryClient(config);

// Logs
telemetry.LogInformation("Processing user request");
telemetry.LogError(exception, "Failed to process request");

// Metrics
telemetry.RecordCounter("requests.total");
telemetry.RecordGauge("memory.usage", 512.5, unit: "MB");
telemetry.RecordHistogram("request.duration", 145.7, unit: "ms");

// Tracing
var result = telemetry.TraceOperation("business-operation", activity =>
{
    activity?.SetTag("user.id", "12345");
    // Your business logic here
    return ProcessOrder();
});

// Combined tracing + timing
var result = await telemetry.TraceAndTimeOperationAsync("database-query", async activity =>
{
    activity?.SetTag("table", "users");
    return await database.QueryAsync("SELECT * FROM users");
});
```

### 3. ASP.NET Core Integration

**Startup/Program.cs:**
```csharp
using MetricsApp.Serilog.OpenTelemetry;

// Add to DI container
builder.Services.AddOpenTelemetryClient(builder.Configuration);

// Configure Serilog
builder.Host.UseSerilog((context, config) =>
{
    config
        .WriteTo.Console()
        .WriteTo.OpenTelemetry(context.Configuration);
});
```

**Controller:**
```csharp
[ApiController]
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
            return user != null ? Ok(user) : NotFound();
            
        }, tags: new() { ["endpoint"] = "users" });
    }
}
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
    "ResourceAttributes": {
      "team": "backend",
      "datacenter": "us-west-2"
    }
  }
}
```

### Code Configuration
```csharp
var config = new OpenTelemetryConfiguration
{
    Endpoint = "https://localhost:7201",
    ServiceName = "my-service",
    ServiceVersion = "1.0.0",
    Environment = "production",
    BatchSize = 100,
    FlushIntervalSeconds = 10,
    EnableMetrics = true,
    EnableTraces = true,
    EnableLogs = true,
    ResourceAttributes = new()
    {
        ["team"] = "backend",
        ["component"] = "api"
    }
};
```

## Testing Your Setup

1. **Start your MetricsApp backend:**
   ```bash
   cd MetricsApp.Api
   dotnet run --launch-profile https
   ```

2. **Run the sample client:**
   ```bash
   cd MetricsApp.SampleClient
   dotnet run
   ```

3. **Check the WebUI:**
   - Open: https://localhost:3000/telemetry/testing
   - Verify telemetry data is flowing

4. **Test API endpoints:**
   - Logs: `GET https://localhost:7201/api/v1/telemetry/logs`
   - Metrics: `GET https://localhost:7201/api/v1/telemetry/metrics`
   - Health: `GET https://localhost:7201/api/v1/telemetry/health`

## Key Features

✅ **Zero Configuration** - Works out of the box with sensible defaults
✅ **Structured Logging** - Automatic conversion to OpenTelemetry log format
✅ **Metrics Collection** - Counters, gauges, and histograms
✅ **Distributed Tracing** - Automatic span creation and correlation
✅ **Performance Monitoring** - Built-in timing and performance metrics
✅ **Error Handling** - Graceful handling of network failures
✅ **Batching** - Efficient batching for high-throughput scenarios
✅ **DI Integration** - Full .NET dependency injection support

## Next Steps

- Browse the complete examples in the `Examples/` folder
- Check the README.md for detailed API documentation
- Integrate into your existing applications
- Configure alerts and dashboards in MetricsApp WebUI


