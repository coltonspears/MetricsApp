using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using MetricsApp.Abstractions.Queue;
using MetricsApp.Core.Models;

namespace MetricsApp.Api.Controllers;

/// <summary>
/// OpenTelemetry Protocol (OTLP) ingestion endpoints.
/// Handles traces, metrics, and logs over OTLP/HTTP.
///
/// MVP behavior:
/// - JSON payloads are accepted and queued for in-process parsing/storage.
/// - Protobuf payloads are accepted only for /traces (forwarded to Jaeger as-is)
///   and rejected with 415 for /metrics and /logs because the in-process parsers
///   only understand JSON.
/// </summary>
[ApiController]
[Route("api/v1/ingest/otlp")]
[ApiExplorerSettings(GroupName = "ingestion")]
public class OtelController : ControllerBase
{
    /// <summary>Maximum accepted body size for a single OTLP request.</summary>
    public const int MaxRequestBodyBytes = 5 * 1024 * 1024;

    private const string ProtobufContentType = "application/x-protobuf";
    private const string JsonContentType = "application/json";

    private readonly ILogger<OtelController> _logger;
    private readonly IMessageQueueProducer<EventDto> _queueProducer;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public OtelController(
        ILogger<OtelController> logger,
        IMessageQueueProducer<EventDto> queueProducer,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _logger = logger;
        _queueProducer = queueProducer;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    [HttpPost("traces")]
    [RequestSizeLimit(MaxRequestBodyBytes)]
    public Task<IActionResult> PostTraces(CancellationToken cancellationToken)
        => ProcessOtlpRequest("traces", allowProtobuf: true, cancellationToken);

    [HttpPost("metrics")]
    [RequestSizeLimit(MaxRequestBodyBytes)]
    public Task<IActionResult> PostMetrics(CancellationToken cancellationToken)
        => ProcessOtlpRequest("metrics", allowProtobuf: false, cancellationToken);

    [HttpPost("logs")]
    [RequestSizeLimit(MaxRequestBodyBytes)]
    public Task<IActionResult> PostLogs(CancellationToken cancellationToken)
        => ProcessOtlpRequest("logs", allowProtobuf: false, cancellationToken);

    [HttpGet("health")]
    public IActionResult GetHealth()
    {
        return Ok(new
        {
            status = "healthy",
            service = "otlp-ingestion",
            timestamp = DateTimeOffset.UtcNow,
            version = "1.0.0",
        });
    }

    [HttpGet("debug/stats")]
    public IActionResult GetDebugStats()
    {
        return Ok(new
        {
            endpoints = new[]
            {
                "/api/v1/ingest/otlp/traces",
                "/api/v1/ingest/otlp/metrics",
                "/api/v1/ingest/otlp/logs",
            },
            supportedContentTypes = new
            {
                traces = new[] { JsonContentType, ProtobufContentType + " (forwarded to Jaeger only)" },
                metrics = new[] { JsonContentType },
                logs = new[] { JsonContentType },
            },
            timestamp = DateTimeOffset.UtcNow,
        });
    }

    private async Task<IActionResult> ProcessOtlpRequest(string dataType, bool allowProtobuf, CancellationToken cancellationToken)
    {
        var contentType = Request.ContentType ?? JsonContentType;
        var isProtobuf = contentType.Contains(ProtobufContentType, StringComparison.OrdinalIgnoreCase);

        if (isProtobuf && !allowProtobuf)
        {
            _logger.LogWarning("Rejected OTLP {DataType} protobuf request: only JSON is supported on this endpoint", dataType);
            return StatusCode(StatusCodes.Status415UnsupportedMediaType, ProcessingResult.Error(
                $"OTLP protobuf is not supported for {dataType}. Send 'application/json' instead."));
        }

        try
        {
            object payload;
            int contentLength;

            if (isProtobuf)
            {
                using var memoryStream = new MemoryStream();
                await Request.Body.CopyToAsync(memoryStream, cancellationToken);
                var contentBytes = memoryStream.ToArray();

                if (contentBytes.Length == 0)
                {
                    return BadRequest(ProcessingResult.Error("Empty request body"));
                }

                contentLength = contentBytes.Length;
                payload = contentBytes;
            }
            else
            {
                using var reader = new StreamReader(Request.Body);
                var content = await reader.ReadToEndAsync(cancellationToken);

                if (string.IsNullOrEmpty(content))
                {
                    return BadRequest(ProcessingResult.Error("Empty request body"));
                }

                contentLength = content.Length;
                try
                {
                    payload = JsonSerializer.Deserialize<JsonElement>(content);
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Invalid JSON in OTLP {DataType} request", dataType);
                    return BadRequest(ProcessingResult.Error($"Invalid JSON: {ex.Message}"));
                }
            }

            _logger.LogInformation(
                "Processing OTLP {DataType} request. ContentType: {ContentType}, Size: {Size} bytes",
                dataType, contentType, contentLength);

            // For traces over protobuf, we only forward to Jaeger - we don't queue
            // (no in-process parser would understand the bytes).
            if (dataType == "traces" && isProtobuf)
            {
                _ = Task.Run(() => SafeForwardToJaeger(payload, contentType));
                return Ok(ProcessingResult.Success());
            }

            var sourceType = dataType switch
            {
                "traces" => "otlp-traces",
                "metrics" => "otlp-metrics",
                "logs" => "otlp-logs",
                _ => $"otlp-{dataType}",
            };

            var eventType = dataType switch
            {
                "traces" => "trace",
                "metrics" => "metric",
                "logs" => "log",
                _ => dataType,
            };

            var eventDto = new EventDto
            {
                Timestamp = DateTimeOffset.UtcNow,
                TenantId = "default",
                AppId = ExtractServiceName(payload) ?? "unknown-service",
                Type = eventType,
                SourceType = sourceType,
                HostName = ExtractHostName(payload)
                    ?? Request.Headers["Host"].FirstOrDefault()
                    ?? "unknown-host",
                Ip = GetClientIpAddress(),
                LogLevel = "INFO",
                Payload = payload,
            };

            await _queueProducer.EnqueueAsync(eventDto, cancellationToken);

            if (dataType == "traces")
            {
                _ = Task.Run(() => SafeForwardToJaeger(payload, contentType));
            }

            _logger.LogDebug(
                "Queued OTLP {DataType} event from {HostName} as source {SourceType}",
                dataType, eventDto.HostName, eventDto.SourceType);

            return Ok(ProcessingResult.Success());
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing OTLP {DataType} request", dataType);
            return StatusCode(500, ProcessingResult.Error("Internal server error"));
        }
    }

    private async Task SafeForwardToJaeger(object payload, string contentType)
    {
        try
        {
            await ForwardToJaeger(payload, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to forward trace to Jaeger; in-process processing continues unaffected");
        }
    }

    private string? ExtractServiceName(object payload) =>
        TryExtractAttribute(payload, "service.name");

    private string? ExtractHostName(object payload) =>
        TryExtractAttribute(payload, "host.name");

    private static string? TryExtractAttribute(object payload, string attributeName)
    {
        try
        {
            if (payload is JsonElement jsonElement)
            {
                return ExtractAttributeValue(jsonElement, attributeName);
            }

            if (payload is string content && content.Contains(attributeName, StringComparison.Ordinal))
            {
                using var jsonDoc = JsonDocument.Parse(content);
                return ExtractAttributeValue(jsonDoc.RootElement, attributeName);
            }
        }
        catch
        {
            // Best-effort enrichment - swallow parse errors.
        }
        return null;
    }

    private static string? ExtractAttributeValue(JsonElement element, string attributeName)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                if (property.Name == "attributes" && property.Value.ValueKind == JsonValueKind.Array)
                {
                    foreach (var attr in property.Value.EnumerateArray())
                    {
                        if (attr.TryGetProperty("key", out var key) &&
                            key.GetString() == attributeName &&
                            attr.TryGetProperty("value", out var valueObj) &&
                            valueObj.TryGetProperty("stringValue", out var stringValue))
                        {
                            return stringValue.GetString();
                        }
                    }
                }

                var result = ExtractAttributeValue(property.Value, attributeName);
                if (result != null) return result;
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                var result = ExtractAttributeValue(item, attributeName);
                if (result != null) return result;
            }
        }

        return null;
    }

    private string GetClientIpAddress() =>
        Request.Headers["X-Forwarded-For"].FirstOrDefault()
        ?? Request.Headers["X-Real-IP"].FirstOrDefault()
        ?? HttpContext.Connection.RemoteIpAddress?.ToString()
        ?? "unknown";

    private async Task ForwardToJaeger(object payload, string contentType)
    {
        var jaegerOtlpUrl = _configuration["Jaeger:OtlpUrl"] ?? "http://localhost:4318";

        using var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(10);

        HttpContent content;
        if (contentType.Contains(ProtobufContentType, StringComparison.OrdinalIgnoreCase) && payload is byte[] protobufData)
        {
            content = new ByteArrayContent(protobufData);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(ProtobufContentType);
        }
        else
        {
            var jsonContent = payload is JsonElement element
                ? element.GetRawText()
                : JsonSerializer.Serialize(payload);

            content = new StringContent(jsonContent, System.Text.Encoding.UTF8);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(JsonContentType);
        }

        var otlpTracesEndpoint = $"{jaegerOtlpUrl.TrimEnd('/')}/v1/traces";
        var response = await httpClient.PostAsync(otlpTracesEndpoint, content);

        if (response.IsSuccessStatusCode)
        {
            _logger.LogDebug("Forwarded trace to Jaeger OTLP collector at {OtlpUrl}", otlpTracesEndpoint);
        }
        else
        {
            var responseBody = await response.Content.ReadAsStringAsync();
            _logger.LogWarning(
                "Failed to forward trace to Jaeger. Status {StatusCode} ({Reason}). Body: {Body}",
                response.StatusCode, response.ReasonPhrase, responseBody);
        }
    }

    public record ProcessingResult(bool IsSuccess, string? ErrorMessage = null)
    {
        public static ProcessingResult Success() => new(true);
        public static ProcessingResult Error(string message) => new(false, message);
    }
}
