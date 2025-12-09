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
[Route("api/v1/ingest/otlp")]
[ApiExplorerSettings(GroupName = "ingestion")]
public class OtelController : ControllerBase
{
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
            endpoints = new[] { "/api/v1/ingest/otlp/traces", "/api/v1/ingest/otlp/metrics", "/api/v1/ingest/otlp/logs" },
            supportedContentTypes = new[] { "application/x-protobuf", "application/json" },
            timestamp = DateTimeOffset.UtcNow
        });
    }

    private async Task<IActionResult> ProcessOtlpRequest(string dataType)
    {
        _logger.LogInformation("Received OTLP {DataType} request", dataType);
        
        try
        {
            // Determine content type first
            var contentType = Request.ContentType ?? "application/json";
            var isProtobuf = contentType.Contains("application/x-protobuf");

            object payload;
            int contentLength;
            string? debugContent = null;

            if (isProtobuf)
            {
                // For protobuf, read as byte array
                using var memoryStream = new MemoryStream();
                await Request.Body.CopyToAsync(memoryStream);
                var contentBytes = memoryStream.ToArray();
                
                if (contentBytes.Length == 0)
                {
                    _logger.LogWarning("Received empty OTLP {DataType} protobuf request", dataType);
                    return BadRequest("Empty request body");
                }

                contentLength = contentBytes.Length;
                payload = contentBytes;
                debugContent = $"Protobuf data: {contentBytes.Length} bytes";
            }
            else
            {
                // For JSON, read as string and parse
                using var reader = new StreamReader(Request.Body);
                var content = await reader.ReadToEndAsync();

                if (string.IsNullOrEmpty(content))
                {
                    _logger.LogWarning("Received empty OTLP {DataType} JSON request", dataType);
                    return BadRequest("Empty request body");
                }

                contentLength = content.Length;
                debugContent = content;
                try
                {
                    payload = JsonSerializer.Deserialize<JsonElement>(content);
                }
                catch (JsonException)
                {
                    // If JSON parsing fails, store as string for downstream parsing
                    payload = content;
                }
            }

            _logger.LogDebug("Request Headers: {Headers}", string.Join(", ", Request.Headers.Select(h => $"[{h.Key}, {string.Join(", ", (IEnumerable<string>)h.Value)}]")));
            _logger.LogInformation("Processing OTLP {DataType} request. ContentType: {ContentType}, Size: {Size} bytes", 
                dataType, contentType, contentLength);

            // Map dataType to correct source type for parsers
            var sourceType = dataType switch
            {
                "traces" => "otlp-traces",
                "metrics" => "otlp-metrics", 
                "logs" => "otlp-logs",
                _ => $"otlp-{dataType}"
            };

            // Map dataType to EventDto.Type 
            var eventType = dataType switch
            {
                "traces" => "trace",
                "metrics" => "metric",
                "logs" => "log",
                _ => dataType
            };

            // Create event for the queue
            var eventDto = new EventDto
            {
                Timestamp = DateTimeOffset.UtcNow,
                TenantId = "default",
                AppId = isProtobuf ? "unknown-service" : (ExtractServiceName(payload) ?? "unknown-service"),
                Type = eventType,
                SourceType = sourceType,
                HostName = isProtobuf ? "unknown-host" : (ExtractHostName(payload) ?? Request.Headers["Host"].FirstOrDefault() ?? "unknown-host"),
                Ip = GetClientIpAddress(),
                LogLevel = "INFO",
                Payload = payload
            };

            // Queue the event for processing
            await _queueProducer.EnqueueAsync(eventDto);

            // Also forward traces to Jaeger for dual storage
            if (dataType == "traces")
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await ForwardToJaeger(payload, contentType);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to forward trace to Jaeger, continuing with internal processing");
                    }
                });
            }

            _logger.LogDebug("Successfully queued OTLP {DataType} event from {HostName} with source type {SourceType}", 
                dataType, eventDto.HostName, eventDto.SourceType);

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

    private string? ExtractServiceName(object payload)
    {
        try
        {
            if (payload is JsonElement jsonElement)
            {
                return ExtractAttributeValue(jsonElement, "service.name");
            }
            else if (payload is string content && content.Contains("service.name"))
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

    private string? ExtractHostName(object payload)
    {
        try
        {
            if (payload is JsonElement jsonElement)
            {
                return ExtractAttributeValue(jsonElement, "host.name");
            }
            else if (payload is string content && content.Contains("host.name"))
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

    private async Task ForwardToJaeger(object payload, string contentType)
    {
        try
        {
            // Get the Jaeger OTLP HTTP collector endpoint (default: port 4318)
            // This is separate from the Query API (port 16686)
            var jaegerOtlpUrl = _configuration["Jaeger:OtlpUrl"] ?? "http://localhost:4318";
            
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            HttpContent content;
            if (contentType.Contains("application/x-protobuf") && payload is byte[] protobufData)
            {
                content = new ByteArrayContent(protobufData);
                content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/x-protobuf");
            }
            else
            {
                var jsonContent = payload is JsonElement element ? element.GetRawText() : JsonSerializer.Serialize(payload);
                
                content = new StringContent(jsonContent, System.Text.Encoding.UTF8);
                content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
            }

            // Use the standard OTLP HTTP endpoint path for traces
            var otlpTracesEndpoint = $"{jaegerOtlpUrl.TrimEnd('/')}/v1/traces";
            var response = await httpClient.PostAsync(otlpTracesEndpoint, content);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Successfully forwarded trace to Jaeger OTLP collector at {OtlpUrl}", otlpTracesEndpoint);
            }
            else
            {
                var responseBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Failed to forward trace to Jaeger OTLP collector. Status: {StatusCode}, Reason: {ReasonPhrase}, Body: {Body}", 
                    response.StatusCode, response.ReasonPhrase, responseBody);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Exception occurred while forwarding trace to Jaeger OTLP collector");
        }
    }

    public record ProcessingResult(bool IsSuccess, string? ErrorMessage = null)
    {
        public static ProcessingResult Success() => new(true);
        public static ProcessingResult Error(string message) => new(false, message);
    }
}

