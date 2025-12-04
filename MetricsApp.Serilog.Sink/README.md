# MetricsApp.Serilog.Sink

A powerful and flexible Serilog sink that sends logs directly to your MetricsApp API endpoints. This sink provides seamless integration with MetricsApp's telemetry, OpenTelemetry, and Jaeger endpoints, making it easy to centralize all your application logs.

## ✨ Features

- **Multiple API Endpoints**: Support for Telemetry, OpenTelemetry (OTLP), and Jaeger endpoints
- **Batching & Performance**: Efficient batching with configurable flush intervals
- **Structured Logging**: Full support for structured properties and exception details
- **Trace Context**: Automatic correlation with distributed tracing (Activity/OpenTelemetry)
- **Flexible Configuration**: Configure via code, appsettings.json, or dependency injection
- **Resilient**: Built-in retry logic with exponential backoff
- **Easy Setup**: Simple extension methods for quick integration

## 🚀 Quick Start

### 1. Install the Package

Add the project reference to your application:

```xml
<ProjectReference Include="path\to\MetricsApp.Serilog.Sink\MetricsApp.Serilog.Sink.csproj" />
```

### 2. Basic Usage

#### Simple Configuration

```csharp
using Serilog;
using MetricsApp.Serilog.Sink.Extensions;

// Basic setup targeting Telemetry API
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.MetricsAppTelemetry(
        apiBaseUrl: "https://localhost:7201",
        serviceName: "my-service",
        serviceVersion: "1.0.0",
        environment: "production")
    .CreateLogger();

// Use normal Serilog logging
Log.Information("Application started");
Log.Warning("This is a warning with {UserId}", 12345);
Log.Error(exception, "Something went wrong processing {OrderId}", orderId);
```

#### Target OpenTelemetry Endpoint

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.MetricsAppOtel(
        apiBaseUrl: "https://localhost:7201",
        serviceName: "my-service",
        useOtlpFormat: true) // Sends proper OTLP format
    .CreateLogger();
```

#### Target Jaeger Endpoint

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.MetricsAppJaeger(
        apiBaseUrl: "https://localhost:7201",
        serviceName: "my-service")
    .CreateLogger();
```

### 3. Configuration via appsettings.json

**appsettings.json:**
```json
{
  "MetricsApp": {
    "ApiBaseUrl": "https://localhost:7201",
    "ServiceName": "my-service",
    "ServiceVersion": "1.0.0",
    "Environment": "production",
    "TargetEndpoint": "telemetry",
    "BatchSize": 100,
    "FlushIntervalSeconds": 5,
    "TimeoutSeconds": 30,
    "IncludeStructuredProperties": true,
    "IncludeExceptionDetails": true,
    "CustomHeaders": {
      "X-API-Key": "your-api-key"
    }
  },
  "Serilog": {
    "MinimumLevel": "Information",
    "WriteTo": [
      {
        "Name": "Console"
      },
      {
        "Name": "MetricsApp",
        "Args": {
          "configuration": "MetricsApp"
        }
      }
    ]
  }
}
```

**Program.cs:**
```csharp
using MetricsApp.Serilog.Sink.Extensions;

var builder = WebApplication.CreateBuilder(args);

// Method 1: Use extension method
builder.Services.AddMetricsAppLogging(builder.Configuration);

// Method 2: Manual Serilog configuration
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .WriteTo.MetricsApp(builder.Configuration)
    .CreateLogger();

builder.Host.UseSerilog();
```

### 4. ASP.NET Core Integration

**Startup.cs / Program.cs:**
```csharp
using MetricsApp.Serilog.Sink.Extensions;

public void ConfigureServices(IServiceCollection services)
{
    // Add MetricsApp logging
    services.AddMetricsAppLogging(
        apiBaseUrl: "https://localhost:7201",
        serviceName: "my-web-api",
        environment: "production");
    
    // ... other services
}

// Or with advanced configuration
services.AddMetricsAppLogging(config =>
{
    config.ApiBaseUrl = "https://localhost:7201";
    config.ServiceName = "my-web-api";
    config.TargetEndpoint = "otel";
    config.UseOtlpFormat = true;
    config.BatchSize = 50;
    config.FlushIntervalSeconds = 3;
    config.CustomHeaders["Authorization"] = "Bearer your-token";
});
```

## 📋 Configuration Options

| Property | Default | Description |
|----------|---------|-------------|
| `ApiBaseUrl` | `https://localhost:7201` | Base URL of MetricsApp API |
| `ServiceName` | `unknown-service` | Service name for telemetry identification |
| `ServiceVersion` | `1.0.0` | Service version |
| `Environment` | `development` | Environment (dev, staging, prod) |
| `TargetEndpoint` | `telemetry` | Target endpoint: `telemetry`, `otel`, or `jaeger` |
| `BatchSize` | `100` | Number of logs to batch before sending |
| `FlushIntervalSeconds` | `5` | Automatic flush interval |
| `TimeoutSeconds` | `30` | HTTP request timeout |
| `IncludeStructuredProperties` | `true` | Include Serilog properties as attributes |
| `IncludeExceptionDetails` | `true` | Include exception details in payloads |
| `UseOtlpFormat` | `true` | Use OTLP format for `otel` endpoint |
| `MaxRetries` | `3` | Maximum retry attempts for failed requests |
| `LogSinkFailures` | `false` | Log sink errors to console |

## 🔗 API Endpoints

### Telemetry Endpoint (`/api/v1/telemetry/logs`)
- Best for general application logging
- Accepts structured log payloads
- Integrates with MetricsApp's unified telemetry API

### OpenTelemetry Endpoint (`/v1/logs`)
- Supports both simple and OTLP format
- Best for OpenTelemetry-compliant logging
- Automatic trace correlation

### Jaeger Endpoint (`/api/v1/integrations/jaeger/traces`)
- Designed for trace-like log events
- Useful when logs are part of distributed traces

## 📊 Structured Logging Examples

```csharp
// Simple structured logging
Log.Information("User {UserId} performed {Action} on {Resource}", 
    userId, "CREATE", "Order");

// With custom properties
Log.ForContext("OrderId", orderId)
   .ForContext("CustomerId", customerId)
   .Information("Order processing started");

// Exception logging with context
try
{
    // ... some operation
}
catch (Exception ex)
{
    Log.ForContext("OrderId", orderId)
       .ForContext("PaymentMethod", paymentMethod)
       .Error(ex, "Failed to process payment for order {OrderId}", orderId);
}
```

## 🔧 Advanced Usage

### Custom Headers and Authentication

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.MetricsAppAdvanced(config =>
    {
        config.ApiBaseUrl = "https://api.metricsapp.com";
        config.ServiceName = "my-service";
        config.CustomHeaders["Authorization"] = "Bearer " + token;
        config.CustomHeaders["X-Tenant-ID"] = tenantId;
        config.CustomHeaders["X-API-Version"] = "2.0";
    })
    .CreateLogger();
```

### Multiple Endpoints

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.MetricsAppTelemetry("https://localhost:7201", "my-service")
    .WriteTo.MetricsAppOtel("https://otel.company.com", "my-service")
    .WriteTo.Console()
    .CreateLogger();
```

### Conditional Logging

```csharp
Log.Logger = new LoggerConfiguration()
    .WriteTo.Logger(lc => lc
        .Filter.ByIncludingOnly(evt => evt.Level >= LogEventLevel.Warning)
        .WriteTo.MetricsAppTelemetry("https://localhost:7201", "my-service"))
    .WriteTo.Console()
    .CreateLogger();
```

## 🏃‍♂️ Performance Tips

1. **Batch Size**: Increase batch size for high-volume applications
2. **Flush Interval**: Reduce for near real-time logging needs
3. **Filtering**: Use Serilog filters to reduce network traffic
4. **Async**: The sink is async by default - no blocking calls
5. **Retries**: Configure retry settings based on network reliability

## 🐛 Troubleshooting

### Enable Debug Logging

```csharp
var config = new MetricsAppSinkConfiguration
{
    // ... other settings
    LogSinkFailures = true // Logs errors to console
};
```

### Common Issues

1. **Connection Refused**: Check if MetricsApp API is running
2. **401 Unauthorized**: Verify authentication headers
3. **Timeout**: Increase `TimeoutSeconds` for slow networks
4. **High Memory**: Reduce `BatchSize` or `FlushIntervalSeconds`

## 📝 Examples

See the `/Examples` folder for complete sample applications:

- `BasicExample.cs` - Simple console application
- `WebApiExample.cs` - ASP.NET Core Web API integration
- `ConfigurationExample.cs` - appsettings.json configuration

## 📄 License

This project is licensed under the MIT License.

