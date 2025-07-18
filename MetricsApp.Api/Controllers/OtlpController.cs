using Microsoft.AspNetCore.Mvc;
using MetricsApp.Abstractions.Queue;
using MetricsApp.Core.Models;
using System.Text.Json;

namespace MetricsApp.Api.Controllers;

/// <summary>
/// OpenTelemetry Protocol (OTLP) endpoint controller.
/// Handles standard OTLP messages for traces, metrics, and logs.
/// This is a simplified version that accepts OTLP data and converts it to our internal EventDto format.
/// </summary>
[ApiController]
[Route("v1")]
public class OtlpController : ControllerBase
{
    private readonly ILogger<OtlpController> _logger;
    private readonly IMessageQueueProducer<EventDto> _messageQueue;

    public OtlpController(
        ILogger<OtlpController> logger,
        IMessageQueueProducer<EventDto> messageQueue)
    {
        _logger = logger;
        _messageQueue = messageQueue;
    }

    /// <summary>
    /// Receives OpenTelemetry traces via OTLP/HTTP
    /// </summary>
    [HttpPost("traces")]
    [Consumes("application/x-protobuf", "application/json")]
    public async Task<IActionResult> PostTraces()
    {
        try
        {
            string content;
            
            // Read the request body
            using var reader = new StreamReader(Request.Body);
            content = await reader.ReadToEndAsync();

            _logger.LogInformation("Received OTLP traces data: {ContentLength} bytes", content.Length);

            // Store as raw OTLP data for now - we'll enhance this later with proper protobuf parsing
            var eventDto = new EventDto
            {
                Timestamp = DateTimeOffset.UtcNow,
                Type = "trace",
                SourceType = "otlp-traces",
                HostName = ExtractHostFromHeaders(),
                TenantId = "default",
                AppId = "otlp-collector",
                Ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                LogLevel = "INFO",
                Payload = new
                {
                    ContentType = Request.ContentType,
                    DataLength = content.Length,
                    UserAgent = Request.Headers["user-agent"].FirstOrDefault(),
                    // Store first 1000 chars for debugging if it's JSON
                    Sample = Request.ContentType?.Contains("json") == true ? 
                        content.Length > 1000 ? content[..1000] : content : 
                        $"Binary data ({content.Length} bytes)"
                }
            };

            await _messageQueue.EnqueueAsync(eventDto);

            // Return OTLP success response
            return Ok(new { partialSuccess = new { } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing trace data");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Receives OpenTelemetry metrics via OTLP/HTTP
    /// </summary>
    [HttpPost("metrics")]
    [Consumes("application/x-protobuf", "application/json")]
    public async Task<IActionResult> PostMetrics()
    {
        try
        {
            string content;
            
            // Read the request body
            using var reader = new StreamReader(Request.Body);
            content = await reader.ReadToEndAsync();

            _logger.LogInformation("Received OTLP metrics data: {ContentLength} bytes", content.Length);

            // Store as raw OTLP data for now
            var eventDto = new EventDto
            {
                Timestamp = DateTimeOffset.UtcNow,
                Type = "metric",
                SourceType = "otlp-metrics",
                HostName = ExtractHostFromHeaders(),
                TenantId = "default",
                AppId = "otlp-collector",
                Ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                LogLevel = "INFO",
                Payload = new
                {
                    ContentType = Request.ContentType,
                    DataLength = content.Length,
                    UserAgent = Request.Headers["user-agent"].FirstOrDefault(),
                    // Store first 1000 chars for debugging if it's JSON
                    Sample = Request.ContentType?.Contains("json") == true ? 
                        content.Length > 1000 ? content[..1000] : content : 
                        $"Binary data ({content.Length} bytes)"
                }
            };

            await _messageQueue.EnqueueAsync(eventDto);

            // Return OTLP success response
            return Ok(new { partialSuccess = new { } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing metrics data");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Receives OpenTelemetry logs via OTLP/HTTP
    /// </summary>
    [HttpPost("logs")]
    [Consumes("application/x-protobuf", "application/json")]
    public async Task<IActionResult> PostLogs()
    {
        try
        {
            string content;
            
            // Read the request body
            using var reader = new StreamReader(Request.Body);
            content = await reader.ReadToEndAsync();

            _logger.LogInformation("Received OTLP logs data: {ContentLength} bytes", content.Length);

            // Store as raw OTLP data for now
            var eventDto = new EventDto
            {
                Timestamp = DateTimeOffset.UtcNow,
                Type = "log",
                SourceType = "otlp-logs",
                HostName = ExtractHostFromHeaders(),
                TenantId = "default",
                AppId = "otlp-collector",
                Ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                LogLevel = "INFO",
                Payload = new
                {
                    ContentType = Request.ContentType,
                    DataLength = content.Length,
                    UserAgent = Request.Headers["user-agent"].FirstOrDefault(),
                    // Store first 1000 chars for debugging if it's JSON
                    Sample = Request.ContentType?.Contains("json") == true ? 
                        content.Length > 1000 ? content[..1000] : content : 
                        $"Binary data ({content.Length} bytes)"
                }
            };

            await _messageQueue.EnqueueAsync(eventDto);

            // Return OTLP success response
            return Ok(new { partialSuccess = new { } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing log data");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Health check endpoint for the OTLP receiver
    /// </summary>
    [HttpGet("health")]
    public IActionResult GetHealth()
    {
        return Ok(new { status = "healthy", timestamp = DateTimeOffset.UtcNow });
    }

    private string ExtractHostFromHeaders()
    {
        // Try to extract hostname from various headers
        var hostSources = new[]
        {
            Request.Headers["x-forwarded-host"].FirstOrDefault(),
            Request.Headers["host"].FirstOrDefault(),
            Request.Headers["x-original-host"].FirstOrDefault()
        };

        return hostSources.FirstOrDefault(h => !string.IsNullOrEmpty(h)) ?? "unknown";
    }
} 