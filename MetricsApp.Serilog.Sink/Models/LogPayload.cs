using System.Text.Json.Serialization;

namespace MetricsApp.Serilog.Sink.Models;

/// <summary>
/// Log payload for MetricsApp Telemetry API
/// </summary>
public class TelemetryLogPayload
{
    [JsonPropertyName("timestamp")]
    public DateTimeOffset Timestamp { get; set; }

    [JsonPropertyName("level")]
    public string Level { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("messageTemplate")]
    public string? MessageTemplate { get; set; }

    [JsonPropertyName("exception")]
    public ExceptionDetails? Exception { get; set; }

    [JsonPropertyName("properties")]
    public Dictionary<string, object> Properties { get; set; } = new();

    [JsonPropertyName("scopes")]
    public List<Dictionary<string, object>> Scopes { get; set; } = new();

    [JsonPropertyName("source")]
    public string? Source { get; set; }

    [JsonPropertyName("category")]
    public string? Category { get; set; }

    [JsonPropertyName("traceId")]
    public string? TraceId { get; set; }

    [JsonPropertyName("spanId")]
    public string? SpanId { get; set; }
}

/// <summary>
/// Exception details for structured logging
/// </summary>
public class ExceptionDetails
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("stackTrace")]
    public string? StackTrace { get; set; }

    [JsonPropertyName("innerException")]
    public ExceptionDetails? InnerException { get; set; }

    [JsonPropertyName("data")]
    public Dictionary<string, object> Data { get; set; } = new();
}

/// <summary>
/// OTLP Log Record structure for OpenTelemetry endpoint
/// </summary>
public class OtlpLogRecord
{
    [JsonPropertyName("timeUnixNano")]
    public long TimeUnixNano { get; set; }

    [JsonPropertyName("severityNumber")]
    public int SeverityNumber { get; set; }

    [JsonPropertyName("severityText")]
    public string SeverityText { get; set; } = string.Empty;

    [JsonPropertyName("body")]
    public OtlpAnyValue Body { get; set; } = new();

    [JsonPropertyName("attributes")]
    public List<OtlpKeyValue> Attributes { get; set; } = new();

    [JsonPropertyName("traceId")]
    public string? TraceId { get; set; }

    [JsonPropertyName("spanId")]
    public string? SpanId { get; set; }
}

/// <summary>
/// OTLP Resource Logs structure
/// </summary>
public class OtlpResourceLogs
{
    [JsonPropertyName("resource")]
    public OtlpResource Resource { get; set; } = new();

    [JsonPropertyName("scopeLogs")]
    public List<OtlpScopeLogs> ScopeLogs { get; set; } = new();
}

/// <summary>
/// OTLP Resource structure
/// </summary>
public class OtlpResource
{
    [JsonPropertyName("attributes")]
    public List<OtlpKeyValue> Attributes { get; set; } = new();
}

/// <summary>
/// OTLP Scope Logs structure
/// </summary>
public class OtlpScopeLogs
{
    [JsonPropertyName("scope")]
    public OtlpInstrumentationScope Scope { get; set; } = new();

    [JsonPropertyName("logRecords")]
    public List<OtlpLogRecord> LogRecords { get; set; } = new();
}

/// <summary>
/// OTLP Instrumentation Scope
/// </summary>
public class OtlpInstrumentationScope
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("version")]
    public string? Version { get; set; }
}

/// <summary>
/// OTLP Key-Value pair
/// </summary>
public class OtlpKeyValue
{
    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public OtlpAnyValue Value { get; set; } = new();
}

/// <summary>
/// OTLP Any Value structure
/// </summary>
public class OtlpAnyValue
{
    [JsonPropertyName("stringValue")]
    public string? StringValue { get; set; }

    [JsonPropertyName("intValue")]
    public long? IntValue { get; set; }

    [JsonPropertyName("doubleValue")]
    public double? DoubleValue { get; set; }

    [JsonPropertyName("boolValue")]
    public bool? BoolValue { get; set; }

    [JsonPropertyName("arrayValue")]
    public OtlpArrayValue? ArrayValue { get; set; }

    [JsonPropertyName("kvlistValue")]
    public OtlpKeyValueList? KvlistValue { get; set; }

    [JsonPropertyName("bytesValue")]
    public string? BytesValue { get; set; }
}

/// <summary>
/// OTLP Array Value
/// </summary>
public class OtlpArrayValue
{
    [JsonPropertyName("values")]
    public List<OtlpAnyValue> Values { get; set; } = new();
}

/// <summary>
/// OTLP Key Value List
/// </summary>
public class OtlpKeyValueList
{
    [JsonPropertyName("values")]
    public List<OtlpKeyValue> Values { get; set; } = new();
}

/// <summary>
/// Complete OTLP Logs Payload
/// </summary>
public class OtlpLogsPayload
{
    [JsonPropertyName("resourceLogs")]
    public List<OtlpResourceLogs> ResourceLogs { get; set; } = new();
}
