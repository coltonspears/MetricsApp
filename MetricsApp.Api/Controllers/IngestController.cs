using System.Text.Json;
using MetricsApp.Abstractions.Queue;
using MetricsApp.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace MetricsApp.Api.Controllers;

/// <summary>
/// Generic raw HTTP/JSON ingestion endpoint.
///
/// Accepts a single <see cref="EventDto"/> or an array of them, validates,
/// applies safe defaults, and enqueues them onto the same in-process queue
/// that powers the OTLP and Serilog-sink paths.
/// </summary>
[ApiController]
[Route("api/v1/ingest")]
[ApiExplorerSettings(GroupName = "ingestion")]
[Consumes("application/json")]
[Produces("application/json")]
public class IngestController : ControllerBase
{
    /// <summary>Maximum accepted body size for a single ingest request, in bytes.</summary>
    public const int MaxRequestBodyBytes = 5 * 1024 * 1024;

    private static readonly JsonSerializerOptions s_jsonOptions = new(JsonSerializerDefaults.Web);

    private readonly ILogger<IngestController> _logger;
    private readonly IMessageQueueProducer<EventDto> _queueProducer;

    public IngestController(
        ILogger<IngestController> logger,
        IMessageQueueProducer<EventDto> queueProducer)
    {
        _logger = logger;
        _queueProducer = queueProducer;
    }

    /// <summary>
    /// Accept one or many events. Body may be a JSON object (single event) or
    /// a JSON array (batch). Per-event validation is best-effort; missing fields
    /// are filled with sensible defaults so naive senders work out of the box.
    /// </summary>
    [HttpPost("events")]
    [RequestSizeLimit(MaxRequestBodyBytes)]
    [ProducesResponseType(typeof(IngestAcceptedResponse), StatusCodes.Status202Accepted)]
    [ProducesResponseType(typeof(IngestErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(IngestErrorResponse), StatusCodes.Status413PayloadTooLarge)]
    public async Task<IActionResult> PostEvents(CancellationToken cancellationToken)
    {
        if (Request.ContentLength is long len && len > MaxRequestBodyBytes)
        {
            return StatusCode(StatusCodes.Status413PayloadTooLarge,
                new IngestErrorResponse($"Payload exceeds {MaxRequestBodyBytes:N0} bytes."));
        }

        EventDto[] events;
        try
        {
            events = await ReadEventsAsync(Request.Body, cancellationToken);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Rejected raw ingest request: invalid JSON");
            return BadRequest(new IngestErrorResponse($"Invalid JSON: {ex.Message}"));
        }

        if (events.Length == 0)
        {
            return BadRequest(new IngestErrorResponse("Body must contain at least one event."));
        }

        var clientIp = GetClientIpAddress();
        var nowUtc = DateTimeOffset.UtcNow;

        foreach (var evt in events)
        {
            ApplyServerSideDefaults(evt, clientIp, nowUtc);
        }

        try
        {
            await _queueProducer.EnqueueBatchAsync(events, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to enqueue {Count} ingest events", events.Length);
            return StatusCode(StatusCodes.Status500InternalServerError,
                new IngestErrorResponse("Failed to queue events for processing."));
        }

        _logger.LogInformation("Accepted {Count} raw ingest event(s) from {ClientIp}", events.Length, clientIp);
        return Accepted(new IngestAcceptedResponse(events.Length));
    }

    private static async Task<EventDto[]> ReadEventsAsync(Stream body, CancellationToken cancellationToken)
    {
        using var doc = await JsonDocument.ParseAsync(body, cancellationToken: cancellationToken);
        var root = doc.RootElement;

        return root.ValueKind switch
        {
            JsonValueKind.Array => root.EnumerateArray()
                .Select(e => e.Deserialize<EventDto>(s_jsonOptions) ?? new EventDto())
                .ToArray(),
            JsonValueKind.Object => new[]
            {
                root.Deserialize<EventDto>(s_jsonOptions) ?? new EventDto(),
            },
            _ => Array.Empty<EventDto>(),
        };
    }

    private static void ApplyServerSideDefaults(EventDto evt, string clientIp, DateTimeOffset nowUtc)
    {
        if (evt.Timestamp == default)
        {
            evt.Timestamp = nowUtc;
        }

        if (string.IsNullOrWhiteSpace(evt.TenantId))
        {
            evt.TenantId = "default";
        }

        if (string.IsNullOrWhiteSpace(evt.AppId))
        {
            evt.AppId = "unknown-service";
        }

        if (string.IsNullOrWhiteSpace(evt.SourceType))
        {
            evt.SourceType = "raw-event";
        }

        if (string.IsNullOrWhiteSpace(evt.Type))
        {
            evt.Type = evt.SourceType.Contains("metric", StringComparison.OrdinalIgnoreCase)
                ? "metric"
                : "log";
        }

        if (string.IsNullOrWhiteSpace(evt.HostName))
        {
            evt.HostName = "unknown-host";
        }

        if (string.IsNullOrWhiteSpace(evt.Ip) || evt.Ip == "unknown")
        {
            evt.Ip = clientIp;
        }

        if (string.IsNullOrWhiteSpace(evt.LogLevel))
        {
            evt.LogLevel = "INFO";
        }
    }

    private string GetClientIpAddress()
    {
        return Request.Headers["X-Forwarded-For"].FirstOrDefault()
            ?? Request.Headers["X-Real-IP"].FirstOrDefault()
            ?? HttpContext.Connection.RemoteIpAddress?.ToString()
            ?? "unknown";
    }

    public record IngestAcceptedResponse(int Accepted);
    public record IngestErrorResponse(string Error);
}
