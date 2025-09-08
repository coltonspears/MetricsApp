# MetricsApp.Parser.OpenTelemetry

OpenTelemetry Protocol (OTLP) parsers for transforming OTLP telemetry data into MetricsApp's unified data models.

## Overview

This library provides parsers that can process OpenTelemetry Protocol (OTLP) data and convert it into MetricsApp's `Metric` and `LogRecord` objects for storage and querying.

## Supported Source Types

- **`otlp-metric`** - OTLP metrics data (gauges, counters, histograms)
- **`otlp-logs`** - OTLP logs data with structured logging
- **`otlp-traces`** - OTLP traces data converted to structured logs

## Features

### OTLP Metrics Parser (`OtlpMetricsParser`)
- ✅ Supports gauge, sum/counter, and histogram metrics
- ✅ Preserves all OTLP attributes and resource information
- ✅ Handles multiple data points per metric
- ✅ Proper timestamp extraction from OTLP nano timestamps
- ✅ Automatic metric type detection (monotonic vs non-monotonic)

### OTLP Logs Parser (`OtlpLogsParser`)
- ✅ Converts OTLP log records to MetricsApp LogRecord format
- ✅ Maps OTLP severity levels to standard log levels
- ✅ Preserves trace correlation (trace ID, span ID)
- ✅ Extracts complex log bodies and attributes
- ✅ Handles structured and unstructured log data

### OTLP Traces Parser (`OtlpTracesParser`)
- ✅ Converts spans to structured log records for storage
- ✅ Preserves trace hierarchy (parent-child relationships)
- ✅ Calculates span durations automatically
- ✅ Maps span status to log levels (ERROR spans become ERROR logs)
- ✅ Extracts span events and links as metadata

## Installation

Add the project reference to your MetricsApp.Api or MetricsApp.Worker project:

```xml
<ProjectReference Include="..\MetricsApp.Parser.OpenTelemetry\MetricsApp.Parser.OpenTelemetry.csproj" />
```

## Configuration

Register the parsers in your DI container:

```csharp
using MetricsApp.Parser.OpenTelemetry.Extensions;

// In Program.cs or Startup.cs
services.AddOpenTelemetryParsers();
```

This registers all three OTLP parsers (`OtlpMetricsParser`, `OtlpLogsParser`, `OtlpTracesParser`) as `IDataParser` implementations.

## Usage

The parsers are automatically used by the `IngestionWorker` when processing queued `EventDto` objects with the appropriate source types:

```csharp
// The IngestionWorker automatically finds and uses these parsers
var rawEvent = new EventDto
{
    SourceType = "otlp-metric", // or "otlp-logs", "otlp-traces"
    HostName = "localhost",
    Timestamp = DateTimeOffset.UtcNow,
    Payload = otlpJsonPayload
};

// Parser is selected based on SourceType and processes the payload
```

## Data Transformation

### Metrics Transformation
OTLP metrics are transformed as follows:

```
OTLP Metric → MetricsApp Metric
├── Gauge → MetricType.Gauge
├── Sum (monotonic) → MetricType.Counter  
├── Sum (non-monotonic) → MetricType.Gauge
└── Histogram → MetricType.Histogram
```

### Logs Transformation
OTLP logs are transformed preserving:
- Severity levels mapped to standard log levels
- Message body (string or complex structures)
- All attributes and resource information
- Trace correlation data

### Traces Transformation
OTLP spans are converted to log records with:
- Span name becomes log message
- Span status determines log level
- All span attributes preserved with "span.attr." prefix
- Timing information (start, end, duration)
- Trace hierarchy information

## Example Data Flow

1. **OTLP Data Received**: Your `OtelController` receives OTLP JSON
2. **Event Queued**: Data is wrapped in `EventDto` and queued
3. **Parser Selected**: `IngestionWorker` finds the appropriate parser by source type
4. **Data Parsed**: Parser converts OTLP format to MetricsApp models
5. **Data Stored**: Converted `Metric` and `LogRecord` objects are stored

## Debugging

Enable debug logging to see parser activity:

```json
{
  "Logging": {
    "LogLevel": {
      "MetricsApp.Parser.OpenTelemetry": "Debug"
    }
  }
}
```

## Error Handling

The parsers include comprehensive error handling:
- Invalid JSON payloads are logged and skipped
- Missing required fields are handled gracefully
- Parser errors don't crash the ingestion worker
- Detailed error logging for troubleshooting

## Performance

- Parsers use `JsonElement` for efficient JSON processing
- Streaming JSON parsing minimizes memory usage
- Attribute extraction is optimized for common OTLP patterns
- Failed parsing doesn't block other events

## Compatibility

- ✅ OTLP 1.0 JSON format
- ✅ OpenTelemetry Protocol specification compliant
- ✅ Works with data from OpenTelemetry SDKs
- ✅ Compatible with MetricsApp.Serilog.OpenTelemetry sink

---

This parser library enables MetricsApp to seamlessly ingest and process OpenTelemetry data from any OTLP-compatible source.




