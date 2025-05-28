# MetricsApp.Core

## Overview

The Core library contains the fundamental data models and structures used throughout the MetricsApp project. This package defines the common data contracts that all other components depend on.

## Key Components

### Models

#### EventDto
The common envelope for all events sent to the ingestion API.
```csharp
public class EventDto
{
    public string SourceType { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string HostName { get; set; }
    public object Payload { get; set; }
}
```

#### LogRecord
Unified log record model following OpenTelemetry standards.
```csharp
public class LogRecord
{
    public DateTimeOffset Timestamp { get; set; }
    public DateTimeOffset ObservedTimestamp { get; set; }
    public string? SeverityText { get; set; }
    public int? SeverityNumber { get; set; }
    public object? Body { get; set; }
    public Dictionary<string, object> Attributes { get; set; }
    public Dictionary<string, object> Resource { get; set; }
    public string? TraceId { get; set; }
    public string? SpanId { get; set; }
}
```

#### Metric
Represents a metric data point with support for different metric types.
```csharp
public class Metric
{
    public string Name { get; set; }
    public string? Description { get; set; }
    public string? Unit { get; set; }
    public MetricType Type { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public Dictionary<string, object> Attributes { get; set; }
    public Dictionary<string, object> Resource { get; set; }
    public object Value { get; set; }
}
```

#### MetricDefinition
Defines the structure and metadata for a metric.

#### Query Models
- `MetricQueryCriteria` / `LogQueryCriteria`: Define search parameters
- `MetricQueryResult` / `LogQueryResult`: Contain query results

### Enums

- **MetricType**: Counter, Gauge, Histogram, Summary
- **AggregationTemporality**: Cumulative, Delta

## Usage

This package is referenced by all other MetricsApp components and should be included in any project that needs to work with MetricsApp data structures.

```xml
<PackageReference Include="MetricsApp.Core" Version="1.0.0" />
```

## Dependencies

- .NET 9.0

## Design Principles

- **Immutable where possible**: Reduces side effects
- **OpenTelemetry compatibility**: Follows industry standards
- **Extensible**: Attributes and Resource dictionaries allow custom metadata
- **Type safety**: Strong typing with appropriate enums 