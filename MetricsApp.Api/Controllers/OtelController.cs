using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using MetricsApp.Abstractions.Queue;
using MetricsApp.Core.Models;

namespace MetricsApp.Api.Controllers;

/// <summary>
/// OpenTelemetry Protocol (OTLP) ingestion endpoints.
/// Handles traces, metrics, and logs according to OTLP specification.
/// </summary>
[ApiController]
[Route("v1")]
public class OtelController : ControllerBase
{
    private readonly ILogger<OtelController> _logger;
    private readonly IMessageQueueProducer<EventDto> _queueProducer;

    public OtelController(
        ILogger<OtelController> logger,
        IMessageQueueProducer<EventDto> queueProducer)
    {
        _logger = logger;
        _queueProducer = queueProducer;
    }

    /// <summary>
    /// OTLP traces ingestion endpoint
    /// </summary>
    [HttpPost("traces")]
    public async Task<IActionResult> PostTraces()
    {
        return await ProcessOtlpRequest("traces");
    }

    /// <summary>
    /// OTLP metrics ingestion endpoint
    /// </summary>
    [HttpPost("metrics")]
    public async Task<IActionResult> PostMetrics()
    {
        return await ProcessOtlpRequest("metrics");
    }

    /// <summary>
    /// OTLP logs ingestion endpoint
    /// </summary>
    [HttpPost("logs")]
    public async Task<IActionResult> PostLogs()
    {
        return await ProcessOtlpRequest("logs");
    }

    /// <summary>
    /// Health check endpoint for OTLP service
    /// </summary>
    [HttpGet("health")]
    public IActionResult GetHealth()
    {
        return Ok(new
        {
            status = "healthy",
            service = "otlp-ingestion",
            timestamp = DateTimeOffset.UtcNow,
            version = "1.0.0"
        });
    }

    /// <summary>
    /// Debug stats endpoint
    /// </summary>
    [HttpGet("debug/stats")]
    public IActionResult GetDebugStats()
    {
        return Ok(new
        {
            endpoints = new[] { "/v1/traces", "/v1/metrics", "/v1/logs" },
            supportedContentTypes = new[] { "application/x-protobuf", "application/json" },
            timestamp = DateTimeOffset.UtcNow
        });
    }

    private async Task<IActionResult> ProcessOtlpRequest(string dataType)
    {
        try
        {
            // Read the request body
            using var reader = new StreamReader(Request.Body);
            var content = await reader.ReadToEndAsync();

            if (string.IsNullOrEmpty(content))
            {
                _logger.LogWarning("Received empty OTLP {DataType} request", dataType);
                return BadRequest("Empty request body");
            }

            // Determine content type
            var contentType = Request.ContentType ?? "application/json";
            var isProtobuf = contentType.Contains("application/x-protobuf");

            _logger.LogInformation("Processing OTLP {DataType} request. ContentType: {ContentType}, Size: {Size} bytes", 
                dataType, contentType, content.Length);

            // Create event for the queue
            var eventDto = new EventDto
            {
                Timestamp = DateTimeOffset.UtcNow,
                TenantId = "default",
                AppId = ExtractServiceName(content) ?? "unknown-service",
                Type = dataType,
                SourceType = $"otlp-{dataType}",
                HostName = ExtractHostName(content) ?? Request.Headers["Host"].FirstOrDefault() ?? "unknown-host",
                Ip = GetClientIpAddress(),
                LogLevel = "INFO",
                Payload = isProtobuf ? content : JsonSerializer.Deserialize<JsonElement>(content)
            };

            // Queue the event for processing
            await _queueProducer.EnqueueAsync(eventDto);

            _logger.LogDebug("Successfully queued OTLP {DataType} event from {HostName}", 
                dataType, eventDto.HostName);

            // Return success response
            return Ok(new ProcessingResult(true));
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Invalid JSON in OTLP {DataType} request", dataType);
            return BadRequest(ProcessingResult.Error($"Invalid JSON: {ex.Message}"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing OTLP {DataType} request", dataType);
            return StatusCode(500, ProcessingResult.Error("Internal server error"));
        }
    }

    private string? ExtractServiceName(string content)
    {
        try
        {
            // Quick extraction without full parsing
            if (content.Contains("service.name"))
            {
                var jsonDoc = JsonDocument.Parse(content);
                return ExtractAttributeValue(jsonDoc.RootElement, "service.name");
            }
        }
        catch
        {
            // Ignore extraction errors
        }
        return null;
    }

    private string? ExtractHostName(string content)
    {
        try
        {
            // Quick extraction without full parsing
            if (content.Contains("host.name"))
            {
                var jsonDoc = JsonDocument.Parse(content);
                return ExtractAttributeValue(jsonDoc.RootElement, "host.name");
            }
        }
        catch
        {
            // Ignore extraction errors
        }
        return null;
    }

    private string? ExtractAttributeValue(JsonElement element, string attributeName)
    {
        // Simple recursive search for attribute value
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

    private string GetClientIpAddress()
    {
        return Request.Headers["X-Forwarded-For"].FirstOrDefault() ??
               Request.Headers["X-Real-IP"].FirstOrDefault() ??
               HttpContext.Connection.RemoteIpAddress?.ToString() ??
               "unknown";
    }

    public record ProcessingResult(bool IsSuccess, string? ErrorMessage = null)
    {
        public static ProcessingResult Success() => new(true);
        public static ProcessingResult Error(string message) => new(false, message);
    }
}
