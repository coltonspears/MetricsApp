# OpenTelemetry Migration Plan for MetricsApp Beta

## Overview

This document outlines the migration plan to fully adopt OpenTelemetry standards and simplify the MetricsApp architecture for the beta release. The goal is to reduce custom abstractions and leverage OpenTelemetry's built-in capabilities.

## Phase 1: Core OpenTelemetry Migration

### 1.1 Replace Custom Models with OpenTelemetry Models

**Current Issues:**
- `EventDto` is a custom envelope that doesn't follow OpenTelemetry standards
- Custom `Metric` model when OpenTelemetry provides standard metric types
- Complex custom collector/emitter abstractions

**Solution:**
Replace custom models with standard OpenTelemetry models:

```csharp
// Replace EventDto with OpenTelemetry standard models
// For Metrics: Use OpenTelemetry.Api.Metrics
// For Logs: Use Microsoft.Extensions.Logging with OpenTelemetry
// For Traces: Use OpenTelemetry.Api.Tracing
```

### 1.2 Simplify Data Collection Architecture

**Before (Complex Custom System):**
```
[Custom Collectors] → [Custom Emitters] → [Custom EventDto] → [Custom Parsers] → [Storage]
```

**After (OpenTelemetry Standard):**
```
[OTel Instrumentation] → [OTel SDK] → [OTLP Exporters] → [MetricsApp Backend]
```

## Phase 2: Infrastructure Simplification

### 2.1 Leverage Aspire Resources

Update AppHost to use all provided resources:

```csharp
// MetricsApp.AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

// Core infrastructure
var database = builder.AddSqlServer("sqlserver")
    .AddDatabase("metricsdb");

var redis = builder.AddRedis("redis");

var rabbitmq = builder.AddRabbitMQ("messaging")
    .WithManagementPlugin();

// OTLP Collector (for receiving OpenTelemetry data)
var otlpCollector = builder.AddContainer("otel-collector", "otel/opentelemetry-collector-contrib")
    .WithBindMount("./otel-collector-config.yaml", "/etc/otel-collector-config.yaml")
    .WithArgs("--config=/etc/otel-collector-config.yaml")
    .WithHttpEndpoint(4317, name: "otlp-grpc")
    .WithHttpEndpoint(4318, name: "otlp-http");

// MetricsApp API (receives OTLP data)
var metricsApi = builder.AddProject<Projects.MetricsApp_Api>("api")
    .WithReference(database)
    .WithReference(redis)
    .WithReference(rabbitmq)
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", otlpCollector.GetEndpoint("otlp-grpc"));

// Web UI
builder.AddNpmApp("webui", "../MetricsApp.WebUI", "dev")
    .WithReference(metricsApi)
    .WithHttpEndpoint(3001);
```

### 2.2 Add OpenTelemetry Collector Configuration

Create `otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  
  # Windows Performance Counters (native OTel)
  windowsperfcounters:
    collection_interval: 30s
    counters:
      - object: "Processor"
        instances: ["*"]
        counters: ["% Processor Time"]
      - object: "Memory"
        counters: ["Available MBytes"]

processors:
  batch:
    timeout: 1s
    send_batch_size: 1000

exporters:
  # Forward to MetricsApp API
  otlphttp:
    endpoint: http://api:8080/v1/traces
    headers:
      api-key: "your-api-key"
  
  # Also export to external systems
  jaeger:
    endpoint: jaeger:14250
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp, jaeger]
    
    metrics:
      receivers: [otlp, windowsperfcounters]
      processors: [batch]
      exporters: [otlphttp]
    
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

## Phase 3: API Modernization

### 3.1 OTLP-Compatible API Endpoints

Replace custom ingestion endpoints with standard OTLP endpoints:

```csharp
// MetricsApp.Api/Controllers/OtlpController.cs
[ApiController]
[Route("v1")]
public class OtlpController : ControllerBase
{
    [HttpPost("traces")]
    public async Task<IActionResult> PostTraces([FromBody] ExportTraceServiceRequest request)
    {
        // Process OpenTelemetry traces
        return Ok();
    }

    [HttpPost("metrics")]
    public async Task<IActionResult> PostMetrics([FromBody] ExportMetricsServiceRequest request)
    {
        // Process OpenTelemetry metrics
        return Ok();
    }

    [HttpPost("logs")]
    public async Task<IActionResult> PostLogs([FromBody] ExportLogsServiceRequest request)
    {
        // Process OpenTelemetry logs
        return Ok();
    }
}
```

### 3.2 Enhanced ServiceDefaults

Update ServiceDefaults to be more comprehensive:

```csharp
// MetricsApp.ServiceDefaults/Extensions.cs
public static TBuilder ConfigureOpenTelemetry<TBuilder>(this TBuilder builder) 
    where TBuilder : IHostApplicationBuilder
{
    builder.Logging.AddOpenTelemetry(logging =>
    {
        logging.IncludeFormattedMessage = true;
        logging.IncludeScopes = true;
    });

    builder.Services.AddOpenTelemetry()
        .WithMetrics(metrics =>
        {
            metrics.AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation()
                .AddProcessInstrumentation()
                .AddMeter("MetricsApp.*"); // Custom meters
        })
        .WithTracing(tracing =>
        {
            tracing.AddSource("MetricsApp.*")
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddSqlClientInstrumentation()
                .AddEntityFrameworkCoreInstrumentation();
        });

    // Configure exporters based on environment
    var otlpEndpoint = builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"];
    if (!string.IsNullOrEmpty(otlpEndpoint))
    {
        builder.Services.AddOpenTelemetry()
            .UseOtlpExporter();
    }
    else
    {
        // Development - use console exporters
        builder.Services.AddOpenTelemetry()
            .WithMetrics(m => m.AddConsoleExporter())
            .WithTracing(t => t.AddConsoleExporter());
    }

    return builder;
}
```

## Phase 4: Queue Implementation with RabbitMQ

### 4.1 Add RabbitMQ Queue Implementation

Since Aspire already provides RabbitMQ, let's use it:

```csharp
// MetricsApp.Queue.RabbitMQ/RabbitMqQueue.cs
public class RabbitMqMessageQueue<T> : IMessageQueueProducer<T>, IMessageQueueConsumer<T>
    where T : class
{
    private readonly IConnection _connection;
    private readonly IModel _channel;
    private readonly string _queueName;

    public async Task EnqueueAsync(T message, CancellationToken cancellationToken = default)
    {
        var body = JsonSerializer.SerializeToUtf8Bytes(message);
        _channel.BasicPublish(exchange: "", routingKey: _queueName, body: body);
    }

    public async Task<T?> DequeueAsync(CancellationToken cancellationToken = default)
    {
        var result = _channel.BasicGet(_queueName, autoAck: true);
        if (result == null) return null;
        
        return JsonSerializer.Deserialize<T>(result.Body.Span);
    }
}
```

## Phase 5: Simplified Project Structure

### 5.1 Projects to Remove/Consolidate

**Remove these custom implementations:**
- `MetricsApp.Agent.Collectors.*` (replace with OTel instrumentation)
- `MetricsApp.Agent.Emitters.*` (replace with OTel exporters)
- `MetricsApp.Parser.*` (OTel handles parsing)

**Keep and enhance:**
- `MetricsApp.Core` (for query models and domain objects)
- `MetricsApp.Api` (enhanced with OTLP endpoints)
- `MetricsApp.DataSources.*` (for historical querying)
- `MetricsApp.Queue.RabbitMQ` (new implementation)
- `MetricsApp.Repository.*` (for storage)

### 5.2 New Simplified Architecture

```
┌─────────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Applications      │    │  OTel Collector  │    │  MetricsApp     │
│                     │    │                  │    │                 │
│ - .NET Apps         │───▶│ - Receives OTLP  │───▶│ - OTLP API      │
│ - Custom Agents     │    │ - Processes      │    │ - Storage       │
│ - Infrastructure    │    │ - Routes         │    │ - Querying      │
└─────────────────────┘    └──────────────────┘    └─────────────────┘
                                                            │
                                                            ▼
                                                   ┌─────────────────┐
                                                   │   Data Layer    │
                                                   │                 │
                                                   │ - SQL Server    │
                                                   │ - Redis Cache   │
                                                   │ - RabbitMQ      │
                                                   └─────────────────┘
```

## Phase 6: Migration Steps

### Step 1: Update Dependencies
1. Add OpenTelemetry packages to API project
2. Add RabbitMQ client packages
3. Remove unused custom collector/emitter packages

### Step 2: Implement OTLP Endpoints
1. Create OtlpController
2. Update API to handle OpenTelemetry protobuf messages
3. Test with sample OTLP data

### Step 3: Add RabbitMQ Queue
1. Implement RabbitMqMessageQueue
2. Update service registration
3. Test queue functionality

### Step 4: Update Aspire Configuration
1. Add OpenTelemetry Collector container
2. Configure collector to forward to MetricsApp API
3. Test end-to-end data flow

### Step 5: Remove Custom Components
1. Remove custom collector projects
2. Remove custom emitter projects
3. Update solution file
4. Clean up unused references

## Benefits of This Approach

1. **Industry Standard**: Full OpenTelemetry compliance
2. **Reduced Maintenance**: Less custom code to maintain
3. **Better Ecosystem**: Leverage existing OTel instrumentation
4. **Scalability**: OpenTelemetry Collector handles routing/processing
5. **Observability**: Built-in observability for the observability platform!

## Breaking Changes

1. Applications using custom collectors need to migrate to OpenTelemetry SDK
2. Custom EventDto format will be replaced with OTLP
3. Some custom configuration will need to be updated

## Timeline

- **Week 1**: Update dependencies and create OTLP endpoints
- **Week 2**: Implement RabbitMQ queue and update Aspire
- **Week 3**: Remove custom components and test thoroughly
- **Week 4**: Documentation and final testing for beta release 