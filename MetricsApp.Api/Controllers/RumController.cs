using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using System.Text.Json;

namespace MetricsApp.Api.Controllers;

/// <summary>
/// Real User Monitoring (RUM) API for collecting and querying user experience data.
/// Provides endpoints for event collection, session tracking, and analytics.
/// </summary>
[ApiController]
[Route("api/v1/rum")]
public class RumController : ControllerBase
{
    private readonly ILogger<RumController> _logger;

    // In-memory storage for RUM data (replace with proper repository later)
    private static readonly ConcurrentBag<RumEventRecord> _events = new();
    private static readonly ConcurrentDictionary<string, RumSessionRecord> _sessions = new();

    public RumController(ILogger<RumController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Collect RUM events from the frontend
    /// </summary>
    [HttpPost("events")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult CollectEvents([FromBody] RumEventBatch batch)
    {
        if (batch?.Events == null || batch.Events.Count == 0)
        {
            return BadRequest(new { error = "No events provided" });
        }

        try
        {
            var sessionId = batch.SessionId ?? batch.Events.FirstOrDefault()?.SessionId ?? "unknown";

            foreach (var evt in batch.Events)
            {
                var record = new RumEventRecord
                {
                    Id = evt.Id ?? Guid.NewGuid().ToString(),
                    SessionId = evt.SessionId ?? sessionId,
                    UserId = evt.UserId,
                    Timestamp = evt.Timestamp > 0 ? DateTimeOffset.FromUnixTimeMilliseconds(evt.Timestamp) : DateTimeOffset.UtcNow,
                    Type = evt.Type ?? "unknown",
                    Data = evt.Data ?? new Dictionary<string, object>(),
                    UserAgent = evt.UserAgent ?? Request.Headers.UserAgent.ToString(),
                    Url = evt.Url ?? Request.Headers.Referer.ToString(),
                    Referrer = evt.Referrer,
                    Viewport = evt.Viewport,
                    Connection = evt.Connection,
                    ReceivedAt = DateTimeOffset.UtcNow
                };

                _events.Add(record);

                // Update or create session
                _sessions.AddOrUpdate(
                    record.SessionId,
                    _ => new RumSessionRecord
                    {
                        SessionId = record.SessionId,
                        UserId = record.UserId,
                        StartTime = record.Timestamp,
                        LastActivity = record.Timestamp,
                        UserAgent = record.UserAgent,
                        PageViews = record.Type == "pageview" ? 1 : 0,
                        Interactions = record.Type == "interaction" ? 1 : 0,
                        Errors = record.Type == "error" ? 1 : 0,
                        Events = 1
                    },
                    (_, existing) =>
                    {
                        existing.LastActivity = record.Timestamp;
                        existing.Events++;
                        if (record.Type == "pageview") existing.PageViews++;
                        if (record.Type == "interaction") existing.Interactions++;
                        if (record.Type == "error") existing.Errors++;
                        return existing;
                    }
                );
            }

            _logger.LogDebug("Collected {Count} RUM events for session {SessionId}", batch.Events.Count, sessionId);

            return Ok(new { status = "success", received = batch.Events.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error collecting RUM events");
            return StatusCode(500, new { error = "Failed to collect events" });
        }
    }

    /// <summary>
    /// Get RUM analytics data
    /// </summary>
    [HttpGet("analytics")]
    [ProducesResponseType(typeof(RumAnalyticsResponse), StatusCodes.Status200OK)]
    public IActionResult GetAnalytics(
        [FromQuery] DateTimeOffset? startTime = null,
        [FromQuery] DateTimeOffset? endTime = null)
    {
        var start = startTime ?? DateTimeOffset.UtcNow.AddHours(-24);
        var end = endTime ?? DateTimeOffset.UtcNow;

        var filteredEvents = _events
            .Where(e => e.Timestamp >= start && e.Timestamp <= end)
            .ToList();

        var sessions = _sessions.Values
            .Where(s => s.LastActivity >= start && s.StartTime <= end)
            .ToList();

        var totalSessions = sessions.Count;
        var totalPageViews = filteredEvents.Count(e => e.Type == "pageview");
        var totalErrors = filteredEvents.Count(e => e.Type == "error");
        var performanceEvents = filteredEvents.Where(e => e.Type == "performance").ToList();

        // Calculate performance metrics
        var lcpValues = performanceEvents
            .Where(e => e.Data.TryGetValue("category", out var cat) && cat?.ToString() == "largest-contentful-paint")
            .Select(e => e.Data.TryGetValue("value", out var v) && double.TryParse(v?.ToString(), out var val) ? val : 0)
            .Where(v => v > 0)
            .ToList();

        var fidValues = performanceEvents
            .Where(e => e.Data.TryGetValue("category", out var cat) && cat?.ToString() == "first-input")
            .Select(e => e.Data.TryGetValue("value", out var v) && double.TryParse(v?.ToString(), out var val) ? val : 0)
            .Where(v => v > 0)
            .ToList();

        var clsValues = performanceEvents
            .Where(e => e.Data.TryGetValue("category", out var cat) && cat?.ToString() == "layout-shift")
            .Select(e => e.Data.TryGetValue("value", out var v) && double.TryParse(v?.ToString(), out var val) ? val : 0)
            .ToList();

        // Calculate top pages
        var topPages = filteredEvents
            .Where(e => e.Type == "pageview" && !string.IsNullOrEmpty(e.Url))
            .GroupBy(e => new Uri(e.Url).AbsolutePath)
            .Select(g => new RumTopPage
            {
                Url = g.Key,
                Views = g.Count(),
                AvgLoadTime = 0, // TODO: Calculate from performance events
                ErrorRate = 0
            })
            .OrderByDescending(p => p.Views)
            .Take(10)
            .ToList();

        // Calculate top errors
        var topErrors = filteredEvents
            .Where(e => e.Type == "error")
            .GroupBy(e => e.Data.TryGetValue("message", out var msg) ? msg?.ToString() ?? "Unknown error" : "Unknown error")
            .Select(g => new RumTopError
            {
                Message = g.Key,
                Count = g.Count(),
                AffectedSessions = g.Select(e => e.SessionId).Distinct().Count(),
                Severity = g.FirstOrDefault()?.Data.TryGetValue("severity", out var sev) == true ? sev?.ToString() ?? "medium" : "medium"
            })
            .OrderByDescending(e => e.Count)
            .Take(10)
            .ToList();

        // Browser distribution
        var browsers = sessions
            .Where(s => !string.IsNullOrEmpty(s.UserAgent))
            .GroupBy(s => ParseBrowser(s.UserAgent))
            .Select(g => new RumDistributionItem
            {
                Name = g.Key,
                Count = g.Count(),
                Percentage = totalSessions > 0 ? Math.Round((double)g.Count() / totalSessions * 100, 1) : 0
            })
            .OrderByDescending(b => b.Count)
            .Take(5)
            .ToList();

        // Device distribution
        var devices = sessions
            .Where(s => !string.IsNullOrEmpty(s.UserAgent))
            .GroupBy(s => ParseDeviceType(s.UserAgent))
            .Select(g => new RumDistributionItem
            {
                Name = g.Key,
                Count = g.Count(),
                Percentage = totalSessions > 0 ? Math.Round((double)g.Count() / totalSessions * 100, 1) : 0
            })
            .OrderByDescending(d => d.Count)
            .ToList();

        var avgSessionDuration = sessions.Count > 0
            ? sessions.Average(s => (s.LastActivity - s.StartTime).TotalSeconds)
            : 0;

        var response = new RumAnalyticsResponse
        {
            Overview = new RumOverview
            {
                TotalSessions = totalSessions,
                TotalPageViews = totalPageViews,
                TotalErrors = totalErrors,
                AvgSessionDuration = avgSessionDuration,
                BounceRate = totalSessions > 0 ? Math.Round((double)sessions.Count(s => s.PageViews <= 1) / totalSessions * 100, 1) : 0,
                ErrorRate = totalPageViews > 0 ? Math.Round((double)totalErrors / totalPageViews * 100, 2) : 0
            },
            Performance = new RumPerformance
            {
                AvgPageLoadTime = 0, // TODO: Calculate
                AvgLcp = lcpValues.Count > 0 ? lcpValues.Average() : 0,
                AvgFid = fidValues.Count > 0 ? fidValues.Average() : 0,
                AvgCls = clsValues.Count > 0 ? clsValues.Average() : 0,
                P95PageLoadTime = 0,
                P95Lcp = lcpValues.Count > 0 ? Percentile(lcpValues, 95) : 0
            },
            TopPages = topPages,
            TopErrors = topErrors,
            Devices = devices,
            Browsers = browsers,
            Locations = new List<RumLocationItem>() // TODO: Implement geo tracking
        };

        return Ok(response);
    }

    /// <summary>
    /// Get RUM sessions
    /// </summary>
    [HttpGet("sessions")]
    [ProducesResponseType(typeof(RumSessionsResponse), StatusCodes.Status200OK)]
    public IActionResult GetSessions(
        [FromQuery] DateTimeOffset? startTime = null,
        [FromQuery] DateTimeOffset? endTime = null,
        [FromQuery] string? userId = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var start = startTime ?? DateTimeOffset.UtcNow.AddHours(-24);
        var end = endTime ?? DateTimeOffset.UtcNow;

        var query = _sessions.Values
            .Where(s => s.LastActivity >= start && s.StartTime <= end);

        if (!string.IsNullOrEmpty(userId))
        {
            query = query.Where(s => s.UserId == userId);
        }

        var total = query.Count();
        var sessions = query
            .OrderByDescending(s => s.LastActivity)
            .Skip(offset)
            .Take(Math.Min(limit, 100))
            .Select(s => new RumSessionDto
            {
                SessionId = s.SessionId,
                UserId = s.UserId,
                StartTime = s.StartTime.ToUnixTimeMilliseconds(),
                EndTime = s.LastActivity.ToUnixTimeMilliseconds(),
                Duration = (s.LastActivity - s.StartTime).TotalMilliseconds,
                PageViews = s.PageViews,
                Interactions = s.Interactions,
                Errors = s.Errors,
                UserAgent = s.UserAgent,
                Device = new RumDeviceInfo
                {
                    Type = ParseDeviceType(s.UserAgent),
                    Browser = ParseBrowser(s.UserAgent),
                    Os = ParseOS(s.UserAgent)
                }
            })
            .ToList();

        return Ok(new RumSessionsResponse
        {
            Sessions = sessions,
            Total = total,
            HasMore = offset + sessions.Count < total
        });
    }

    /// <summary>
    /// Get a specific session
    /// </summary>
    [HttpGet("sessions/{sessionId}")]
    [ProducesResponseType(typeof(RumSessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetSession(string sessionId)
    {
        if (!_sessions.TryGetValue(sessionId, out var session))
        {
            return NotFound(new { error = "Session not found" });
        }

        return Ok(new RumSessionDto
        {
            SessionId = session.SessionId,
            UserId = session.UserId,
            StartTime = session.StartTime.ToUnixTimeMilliseconds(),
            EndTime = session.LastActivity.ToUnixTimeMilliseconds(),
            Duration = (session.LastActivity - session.StartTime).TotalMilliseconds,
            PageViews = session.PageViews,
            Interactions = session.Interactions,
            Errors = session.Errors,
            UserAgent = session.UserAgent,
            Device = new RumDeviceInfo
            {
                Type = ParseDeviceType(session.UserAgent),
                Browser = ParseBrowser(session.UserAgent),
                Os = ParseOS(session.UserAgent)
            }
        });
    }

    /// <summary>
    /// Get RUM errors
    /// </summary>
    [HttpGet("errors")]
    [ProducesResponseType(typeof(RumErrorsResponse), StatusCodes.Status200OK)]
    public IActionResult GetErrors(
        [FromQuery] DateTimeOffset? startTime = null,
        [FromQuery] DateTimeOffset? endTime = null,
        [FromQuery] string? sessionId = null,
        [FromQuery] string? severity = null,
        [FromQuery] int limit = 50,
        [FromQuery] int offset = 0)
    {
        var start = startTime ?? DateTimeOffset.UtcNow.AddHours(-24);
        var end = endTime ?? DateTimeOffset.UtcNow;

        var query = _events
            .Where(e => e.Type == "error" && e.Timestamp >= start && e.Timestamp <= end);

        if (!string.IsNullOrEmpty(sessionId))
        {
            query = query.Where(e => e.SessionId == sessionId);
        }

        if (!string.IsNullOrEmpty(severity))
        {
            query = query.Where(e => e.Data.TryGetValue("severity", out var sev) && sev?.ToString() == severity);
        }

        var total = query.Count();
        var errors = query
            .OrderByDescending(e => e.Timestamp)
            .Skip(offset)
            .Take(Math.Min(limit, 100))
            .Select(e => new RumErrorDto
            {
                Id = e.Id,
                SessionId = e.SessionId,
                Timestamp = e.Timestamp.ToUnixTimeMilliseconds(),
                Message = e.Data.TryGetValue("message", out var msg) ? msg?.ToString() ?? "" : "",
                Stack = e.Data.TryGetValue("stack", out var stack) ? stack?.ToString() : null,
                Filename = e.Data.TryGetValue("filename", out var fn) ? fn?.ToString() : null,
                Lineno = e.Data.TryGetValue("lineno", out var ln) && int.TryParse(ln?.ToString(), out var lineNo) ? lineNo : null,
                Colno = e.Data.TryGetValue("colno", out var cn) && int.TryParse(cn?.ToString(), out var colNo) ? colNo : null,
                Type = e.Data.TryGetValue("category", out var cat) ? cat?.ToString() ?? "javascript" : "javascript",
                Severity = e.Data.TryGetValue("severity", out var sev) ? sev?.ToString() ?? "medium" : "medium",
                Url = e.Url,
                UserAgent = e.UserAgent,
                Resolved = false
            })
            .ToList();

        return Ok(new RumErrorsResponse
        {
            Errors = errors,
            Total = total,
            HasMore = offset + errors.Count < total
        });
    }

    /// <summary>
    /// Get real-time RUM metrics
    /// </summary>
    [HttpGet("realtime")]
    [ProducesResponseType(typeof(RumRealtimeResponse), StatusCodes.Status200OK)]
    public IActionResult GetRealtime()
    {
        var now = DateTimeOffset.UtcNow;
        var lastHour = now.AddHours(-1);
        var lastMinute = now.AddMinutes(-1);

        var activeSessions = _sessions.Values.Count(s => s.LastActivity >= lastMinute);
        var currentPageViews = _events.Count(e => e.Type == "pageview" && e.Timestamp >= lastMinute);
        var errorsLastHour = _events.Count(e => e.Type == "error" && e.Timestamp >= lastHour);

        return Ok(new RumRealtimeResponse
        {
            ActiveSessions = activeSessions,
            CurrentPageViews = currentPageViews,
            ErrorsLastHour = errorsLastHour,
            AvgResponseTime = 0 // TODO: Calculate from performance events
        });
    }

    /// <summary>
    /// Get session journey (chronological events)
    /// </summary>
    [HttpGet("sessions/{sessionId}/journey")]
    [ProducesResponseType(typeof(RumJourneyResponse), StatusCodes.Status200OK)]
    public IActionResult GetSessionJourney(string sessionId)
    {
        var journey = _events
            .Where(e => e.SessionId == sessionId)
            .OrderBy(e => e.Timestamp)
            .Select(e => new RumJourneyEvent
            {
                Timestamp = e.Timestamp.ToUnixTimeMilliseconds(),
                Type = e.Type,
                Data = e.Data
            })
            .ToList();

        return Ok(new RumJourneyResponse { Journey = journey });
    }

    // Helper methods
    private static string ParseBrowser(string? userAgent)
    {
        if (string.IsNullOrEmpty(userAgent)) return "Unknown";

        if (userAgent.Contains("Chrome") && !userAgent.Contains("Edg")) return "Chrome";
        if (userAgent.Contains("Firefox")) return "Firefox";
        if (userAgent.Contains("Safari") && !userAgent.Contains("Chrome")) return "Safari";
        if (userAgent.Contains("Edg")) return "Edge";
        if (userAgent.Contains("Opera") || userAgent.Contains("OPR")) return "Opera";

        return "Other";
    }

    private static string ParseDeviceType(string? userAgent)
    {
        if (string.IsNullOrEmpty(userAgent)) return "unknown";

        if (userAgent.Contains("Mobile") || userAgent.Contains("Android")) return "mobile";
        if (userAgent.Contains("Tablet") || userAgent.Contains("iPad")) return "tablet";

        return "desktop";
    }

    private static string ParseOS(string? userAgent)
    {
        if (string.IsNullOrEmpty(userAgent)) return "Unknown";

        if (userAgent.Contains("Windows")) return "Windows";
        if (userAgent.Contains("Mac OS")) return "macOS";
        if (userAgent.Contains("Linux") && !userAgent.Contains("Android")) return "Linux";
        if (userAgent.Contains("Android")) return "Android";
        if (userAgent.Contains("iOS") || userAgent.Contains("iPhone") || userAgent.Contains("iPad")) return "iOS";

        return "Other";
    }

    private static double Percentile(List<double> values, int percentile)
    {
        if (values.Count == 0) return 0;
        var sorted = values.OrderBy(v => v).ToList();
        var index = (int)Math.Ceiling(percentile / 100.0 * sorted.Count) - 1;
        return sorted[Math.Max(0, Math.Min(index, sorted.Count - 1))];
    }
}

// Internal storage models
internal class RumEventRecord
{
    public string Id { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string Type { get; set; } = string.Empty;
    public Dictionary<string, object> Data { get; set; } = new();
    public string? UserAgent { get; set; }
    public string? Url { get; set; }
    public string? Referrer { get; set; }
    public RumViewport? Viewport { get; set; }
    public RumConnection? Connection { get; set; }
    public DateTimeOffset ReceivedAt { get; set; }
}

internal class RumSessionRecord
{
    public string SessionId { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public DateTimeOffset StartTime { get; set; }
    public DateTimeOffset LastActivity { get; set; }
    public string? UserAgent { get; set; }
    public int PageViews { get; set; }
    public int Interactions { get; set; }
    public int Errors { get; set; }
    public int Events { get; set; }
}

// Request DTOs
public class RumEventBatch
{
    public List<RumEventInput> Events { get; set; } = new();
    public string? SessionId { get; set; }
    public long Timestamp { get; set; }
}

public class RumEventInput
{
    public string? Id { get; set; }
    public string? SessionId { get; set; }
    public string? UserId { get; set; }
    public long Timestamp { get; set; }
    public string? Type { get; set; }
    public Dictionary<string, object>? Data { get; set; }
    public string? UserAgent { get; set; }
    public string? Url { get; set; }
    public string? Referrer { get; set; }
    public RumViewport? Viewport { get; set; }
    public RumConnection? Connection { get; set; }
}

public class RumViewport
{
    public int Width { get; set; }
    public int Height { get; set; }
}

public class RumConnection
{
    public string? EffectiveType { get; set; }
    public double? Downlink { get; set; }
    public int? Rtt { get; set; }
}

// Response DTOs
public class RumAnalyticsResponse
{
    public RumOverview Overview { get; set; } = new();
    public RumPerformance Performance { get; set; } = new();
    public List<RumTopPage> TopPages { get; set; } = new();
    public List<RumTopError> TopErrors { get; set; } = new();
    public List<RumDistributionItem> Devices { get; set; } = new();
    public List<RumDistributionItem> Browsers { get; set; } = new();
    public List<RumLocationItem> Locations { get; set; } = new();
}

public class RumOverview
{
    public int TotalSessions { get; set; }
    public int TotalPageViews { get; set; }
    public int TotalErrors { get; set; }
    public double AvgSessionDuration { get; set; }
    public double BounceRate { get; set; }
    public double ErrorRate { get; set; }
}

public class RumPerformance
{
    public double AvgPageLoadTime { get; set; }
    public double AvgLcp { get; set; }
    public double AvgFid { get; set; }
    public double AvgCls { get; set; }
    public double P95PageLoadTime { get; set; }
    public double P95Lcp { get; set; }
}

public class RumTopPage
{
    public string Url { get; set; } = string.Empty;
    public int Views { get; set; }
    public double AvgLoadTime { get; set; }
    public double ErrorRate { get; set; }
}

public class RumTopError
{
    public string Message { get; set; } = string.Empty;
    public int Count { get; set; }
    public int AffectedSessions { get; set; }
    public string Severity { get; set; } = "medium";
}

public class RumDistributionItem
{
    public string Name { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class RumLocationItem
{
    public string Country { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class RumSessionsResponse
{
    public List<RumSessionDto> Sessions { get; set; } = new();
    public int Total { get; set; }
    public bool HasMore { get; set; }
}

public class RumSessionDto
{
    public string SessionId { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public long StartTime { get; set; }
    public long EndTime { get; set; }
    public double Duration { get; set; }
    public int PageViews { get; set; }
    public int Interactions { get; set; }
    public int Errors { get; set; }
    public string? UserAgent { get; set; }
    public RumDeviceInfo? Device { get; set; }
}

public class RumDeviceInfo
{
    public string Type { get; set; } = "desktop";
    public string Browser { get; set; } = string.Empty;
    public string Os { get; set; } = string.Empty;
}

public class RumErrorsResponse
{
    public List<RumErrorDto> Errors { get; set; } = new();
    public int Total { get; set; }
    public bool HasMore { get; set; }
}

public class RumErrorDto
{
    public string Id { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public long Timestamp { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? Stack { get; set; }
    public string? Filename { get; set; }
    public int? Lineno { get; set; }
    public int? Colno { get; set; }
    public string Type { get; set; } = "javascript";
    public string Severity { get; set; } = "medium";
    public string? Url { get; set; }
    public string? UserAgent { get; set; }
    public bool Resolved { get; set; }
}

public class RumRealtimeResponse
{
    public int ActiveSessions { get; set; }
    public int CurrentPageViews { get; set; }
    public int ErrorsLastHour { get; set; }
    public double AvgResponseTime { get; set; }
}

public class RumJourneyResponse
{
    public List<RumJourneyEvent> Journey { get; set; } = new();
}

public class RumJourneyEvent
{
    public long Timestamp { get; set; }
    public string Type { get; set; } = string.Empty;
    public Dictionary<string, object> Data { get; set; } = new();
}
