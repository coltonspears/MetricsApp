using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using MetricsApp.Api.Models;

namespace MetricsApp.Api.Controllers;

/// <summary>
/// Jaeger proxy controller for accessing Jaeger Query API
/// Provides unified access to Jaeger tracing data through MetricsApp API
/// </summary>
[ApiController]
[Route("api/v1/integrations/jaeger")]
[ApiExplorerSettings(GroupName = "integrations")]
public class JaegerController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<JaegerController> _logger;
    private readonly IConfiguration _configuration;

    public JaegerController(
        IHttpClientFactory httpClientFactory,
        ILogger<JaegerController> logger,
        IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _configuration = configuration;
    }

    /// <summary>
    /// Get all services from Jaeger
    /// </summary>
    [HttpGet("services")]
    [ProducesResponseType(typeof(QueryApiSuccessResponse<JaegerServicesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetServices()
    {
        try
        {
            var jaegerBaseUrl = GetJaegerBaseUrl();
            if (string.IsNullOrEmpty(jaegerBaseUrl))
            {
                return StatusCode(500, new QueryApiErrorResponse("Jaeger not configured", "ConfigurationError"));
            }

            using var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.GetAsync($"{jaegerBaseUrl}/api/services");
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var services = JsonSerializer.Deserialize<JaegerServicesResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return Ok(new QueryApiSuccessResponse<JaegerServicesResponse>(services));
            }

            return StatusCode(500, new QueryApiErrorResponse("Failed to query Jaeger services", "JaegerError"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying Jaeger services");
            return StatusCode(500, new QueryApiErrorResponse("Internal server error", "InternalServerError"));
        }
    }

    /// <summary>
    /// Search traces in Jaeger
    /// </summary>
    [HttpGet("traces")]
    [ProducesResponseType(typeof(QueryApiSuccessResponse<JaegerTracesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SearchTraces(
        [FromQuery] string? service = null,
        [FromQuery] string? operation = null,
        [FromQuery] string? tags = null,
        [FromQuery] DateTime? start = null,
        [FromQuery] DateTime? end = null,
        [FromQuery] string? minDuration = null,
        [FromQuery] string? maxDuration = null,
        [FromQuery] int limit = 20)
    {
        try
        {
            var jaegerBaseUrl = GetJaegerBaseUrl();
            if (string.IsNullOrEmpty(jaegerBaseUrl))
            {
                return StatusCode(500, new QueryApiErrorResponse("Jaeger not configured", "ConfigurationError"));
            }

            // Build query parameters
            var queryParams = new List<string>();
            
            if (!string.IsNullOrEmpty(service))
                queryParams.Add($"service={Uri.EscapeDataString(service)}");
            
            if (!string.IsNullOrEmpty(operation))
                queryParams.Add($"operation={Uri.EscapeDataString(operation)}");
            
            if (!string.IsNullOrEmpty(tags))
                queryParams.Add($"tags={Uri.EscapeDataString(tags)}");
            
            if (start.HasValue)
                queryParams.Add($"start={((DateTimeOffset)start.Value).ToUnixTimeMilliseconds() * 1000}"); // Jaeger expects microseconds
            
            if (end.HasValue)
                queryParams.Add($"end={((DateTimeOffset)end.Value).ToUnixTimeMilliseconds() * 1000}");
            
            if (!string.IsNullOrEmpty(minDuration))
                queryParams.Add($"minDuration={Uri.EscapeDataString(minDuration)}");
            
            if (!string.IsNullOrEmpty(maxDuration))
                queryParams.Add($"maxDuration={Uri.EscapeDataString(maxDuration)}");
            
            queryParams.Add($"limit={limit}");

            var queryString = string.Join("&", queryParams);
            var url = $"{jaegerBaseUrl}/api/traces?{queryString}";

            using var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.GetAsync(url);
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var traces = JsonSerializer.Deserialize<JaegerTracesResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return Ok(new QueryApiSuccessResponse<JaegerTracesResponse>(traces));
            }

            return StatusCode(500, new QueryApiErrorResponse($"Failed to query Jaeger traces: {response.StatusCode}", "JaegerError"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying Jaeger traces with service: {Service}, operation: {Operation}", service, operation);
            return StatusCode(500, new QueryApiErrorResponse("Internal server error", "InternalServerError"));
        }
    }

    /// <summary>
    /// Get a specific trace by ID from Jaeger
    /// </summary>
    [HttpGet("traces/{traceId}")]
    [ProducesResponseType(typeof(QueryApiSuccessResponse<JaegerTraceResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetTrace(string traceId)
    {
        try
        {
            var jaegerBaseUrl = GetJaegerBaseUrl();
            if (string.IsNullOrEmpty(jaegerBaseUrl))
            {
                return StatusCode(500, new QueryApiErrorResponse("Jaeger not configured", "ConfigurationError"));
            }

            using var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.GetAsync($"{jaegerBaseUrl}/api/traces/{Uri.EscapeDataString(traceId)}");
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var trace = JsonSerializer.Deserialize<JaegerTraceResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return Ok(new QueryApiSuccessResponse<JaegerTraceResponse>(trace));
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return NotFound(new QueryApiErrorResponse($"Trace {traceId} not found", "TraceNotFound"));
            }

            return StatusCode(500, new QueryApiErrorResponse($"Failed to get trace from Jaeger: {response.StatusCode}", "JaegerError"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trace {TraceId} from Jaeger", traceId);
            return StatusCode(500, new QueryApiErrorResponse("Internal server error", "InternalServerError"));
        }
    }

    /// <summary>
    /// Get operations for a service from Jaeger
    /// </summary>
    [HttpGet("services/{serviceName}/operations")]
    [ProducesResponseType(typeof(QueryApiSuccessResponse<JaegerOperationsResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetOperations(string serviceName)
    {
        try
        {
            var jaegerBaseUrl = GetJaegerBaseUrl();
            if (string.IsNullOrEmpty(jaegerBaseUrl))
            {
                return StatusCode(500, new QueryApiErrorResponse("Jaeger not configured", "ConfigurationError"));
            }

            using var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.GetAsync($"{jaegerBaseUrl}/api/services/{Uri.EscapeDataString(serviceName)}/operations");
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var operations = JsonSerializer.Deserialize<JaegerOperationsResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return Ok(new QueryApiSuccessResponse<JaegerOperationsResponse>(operations));
            }

            return StatusCode(500, new QueryApiErrorResponse("Failed to query Jaeger operations", "JaegerError"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying Jaeger operations for service {ServiceName}", serviceName);
            return StatusCode(500, new QueryApiErrorResponse("Internal server error", "InternalServerError"));
        }
    }

    /// <summary>
    /// Get trace dependencies from Jaeger
    /// </summary>
    [HttpGet("dependencies")]
    [ProducesResponseType(typeof(QueryApiSuccessResponse<JaegerDependenciesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetDependencies(
        [FromQuery] DateTime? endTs = null,
        [FromQuery] int lookback = 86400000) // 24 hours in milliseconds
    {
        try
        {
            var jaegerBaseUrl = GetJaegerBaseUrl();
            if (string.IsNullOrEmpty(jaegerBaseUrl))
            {
                return StatusCode(500, new QueryApiErrorResponse("Jaeger not configured", "ConfigurationError"));
            }

            var endTime = endTs ?? DateTime.UtcNow;
            var endTimeMs = ((DateTimeOffset)endTime).ToUnixTimeMilliseconds();

            using var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.GetAsync($"{jaegerBaseUrl}/api/dependencies?endTs={endTimeMs}&lookback={lookback}");
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var dependencies = JsonSerializer.Deserialize<JaegerDependenciesResponse>(content, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return Ok(new QueryApiSuccessResponse<JaegerDependenciesResponse>(dependencies));
            }

            return StatusCode(500, new QueryApiErrorResponse("Failed to query Jaeger dependencies", "JaegerError"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying Jaeger dependencies");
            return StatusCode(500, new QueryApiErrorResponse("Internal server error", "InternalServerError"));
        }
    }

    /// <summary>
    /// Generate sample trace data for testing
    /// </summary>
    [HttpPost("generate-sample-trace")]
    [ProducesResponseType(typeof(QueryApiSuccessResponse<object>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GenerateSampleTrace()
    {
        try
        {
            // Create a sample OTLP trace payload
            var sampleTrace = new
            {
                resourceSpans = new[]
                {
                    new
                    {
                        resource = new
                        {
                            attributes = new[]
                            {
                                new { key = "service.name", value = new { stringValue = "MetricsApp.TestService" } },
                                new { key = "service.version", value = new { stringValue = "1.0.0" } }
                            }
                        },
                        scopeSpans = new[]
                        {
                            new
                            {
                                scope = new
                                {
                                    name = "test-tracer",
                                    version = "1.0.0"
                                },
                                spans = new[]
                                {
                                    new
                                    {
                                        traceId = Guid.NewGuid().ToString("N"),
                                        spanId = Guid.NewGuid().ToString("N")[..16],
                                        name = "test-operation",
                                        kind = 1,
                                        startTimeUnixNano = DateTimeOffset.UtcNow.AddSeconds(-2).ToUnixTimeMilliseconds() * 1000000,
                                        endTimeUnixNano = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000000,
                                        attributes = new[]
                                        {
                                            new { key = "http.method", value = new { stringValue = "GET" } },
                                            new { key = "http.url", value = new { stringValue = "http://localhost:3000/test" } }
                                        },
                                        status = new { code = 1 }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            // Send to our own OTLP endpoint to generate trace data
            var jsonContent = System.Text.Json.JsonSerializer.Serialize(sampleTrace);
            using var httpClient = _httpClientFactory.CreateClient();
            
            // Post to our OTLP traces endpoint
            var content = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync("https://localhost:7201/api/v1/ingest/otlp/traces", content);
            
            if (response.IsSuccessStatusCode)
            {
                return Ok(new QueryApiSuccessResponse<object>(new { 
                    message = "Sample trace generated successfully",
                    traceData = sampleTrace
                }));
            }
            else
            {
                return StatusCode(500, new QueryApiErrorResponse("Failed to generate sample trace", "GenerationError"));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating sample trace");
            return StatusCode(500, new QueryApiErrorResponse("Internal server error", "InternalServerError"));
        }
    }

    private string? GetJaegerBaseUrl()
    {
        // Try to get Jaeger URL from configuration
        var jaegerUrl = _configuration["Jaeger:QueryUrl"];
        
        if (string.IsNullOrEmpty(jaegerUrl))
        {
            // Fallback to default Aspire Jaeger URL
            jaegerUrl = "http://localhost:16686";
            _logger.LogWarning("No Jaeger:QueryUrl configured, using default: {JaegerUrl}", jaegerUrl);
        }

        return jaegerUrl;
    }
}

// Jaeger API Response Models
public class JaegerServicesResponse
{
    public List<string> Data { get; set; } = new();
}

public class JaegerTracesResponse
{
    public List<JaegerTrace> Data { get; set; } = new();
}

public class JaegerTraceResponse
{
    public List<JaegerTrace> Data { get; set; } = new();
}

public class JaegerOperationsResponse
{
    //public List<JaegerOperation> Data { get; set; } = new();

    public List<string> Data { get; set; } = [];
    public int Total { get; set; }
    public int Limit { get; set; }
    public int Offset { get; set; }
    public object Errors { get; set; }
}

public class JaegerDependenciesResponse
{
    public List<JaegerDependency> Data { get; set; } = new();
}

public class JaegerTrace
{
    public string TraceID { get; set; } = string.Empty;
    public List<JaegerSpan> Spans { get; set; } = new();
    public Dictionary<string, JaegerProcess> Processes { get; set; } = new();
    public object[] Warnings { get; set; } = Array.Empty<object>();
}

public class JaegerSpan
{
    public string TraceID { get; set; } = string.Empty;
    public string SpanID { get; set; } = string.Empty;
    public string ParentSpanID { get; set; } = string.Empty;
    public string OperationName { get; set; } = string.Empty;
    public List<JaegerReference> References { get; set; } = new();
    public long StartTime { get; set; }
    public long Duration { get; set; }
    public List<JaegerTag> Tags { get; set; } = new();
    public List<JaegerLog> Logs { get; set; } = new();
    public string ProcessID { get; set; } = string.Empty;
    public object[] Warnings { get; set; } = Array.Empty<object>();
}

public class JaegerProcess
{
    public string ServiceName { get; set; } = string.Empty;
    public List<JaegerTag> Tags { get; set; } = new();
}

public class JaegerTag
{
    public string Key { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public object Value { get; set; } = new();
}

public class JaegerLog
{
    public long Timestamp { get; set; }
    public List<JaegerTag> Fields { get; set; } = new();
}

public class JaegerReference
{
    public string RefType { get; set; } = string.Empty;
    public string TraceID { get; set; } = string.Empty;
    public string SpanID { get; set; } = string.Empty;
}

public class JaegerOperation
{
    public string OperationName { get; set; } = string.Empty;
    public int SpanKind { get; set; }
}

public class JaegerDependency
{
    public string Parent { get; set; } = string.Empty;
    public string Child { get; set; } = string.Empty;
    public long CallCount { get; set; }
    public string Source { get; set; } = string.Empty;
}

