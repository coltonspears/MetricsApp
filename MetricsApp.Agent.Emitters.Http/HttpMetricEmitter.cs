using System.Net.Http.Json;
using MetricsApp.Agent.Core.Abstractions;
using MetricsApp.Api.Models;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MetricsApp.Agent.Emitters.Http
{
    public class HttpMetricEmitter : IMetricEmitter
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<HttpMetricEmitter> _logger;
        private readonly HttpEmitterOptions _options;

        public HttpMetricEmitter(HttpClient httpClient, IOptions<HttpEmitterOptions> options, ILogger<HttpMetricEmitter> logger)
        {
            _httpClient = httpClient;
            _options = options.Value;
            _logger = logger;

            if (string.IsNullOrWhiteSpace(_options.BaseUrl))
            {
                _logger.LogError("HttpMetricEmitter: BaseUrl is not configured. Emitter will not work.");
                throw new ArgumentNullException(nameof(_options.BaseUrl), "HttpEmitter BaseUrl must be configured.");
            }
            _httpClient.BaseAddress = new Uri(_options.BaseUrl);
            _httpClient.Timeout = _options.TimeoutSeconds;
            _logger.LogInformation("HttpMetricEmitter: Initialized. Target API: {BaseUrl}{IngestPath}", _options.BaseUrl, _options.IngestPath);
        }

        public async Task EmitAsync(IEnumerable<EventDto> events, CancellationToken cancellationToken = default)
        {
            if (events == null || !events.Any())
            {
                _logger.LogDebug("HttpMetricEmitter: No events to emit.");
                return;
            }

            var ingestRequest = new IngestApiRequest { Events = events.ToList() };

            try
            {
                _logger.LogInformation("HttpMetricEmitter: Sending {Count} events to {ApiEndpoint}",
                                       ingestRequest.Events.Count, _httpClient.BaseAddress + _options.IngestPath.TrimStart('/'));

                HttpResponseMessage response = await _httpClient.PostAsJsonAsync(_options.IngestPath, ingestRequest, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("HttpMetricEmitter: Successfully sent {Count} events. Status: {StatusCode}",
                                           ingestRequest.Events.Count, response.StatusCode);
                    // Optionally log response content if needed for diagnostics
                    // var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    // _logger.LogDebug("HttpMetricEmitter: API Response: {ResponseContent}", responseContent);
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("HttpMetricEmitter: Failed to send events. Status: {StatusCode}. Response: {ErrorContent}",
                                     response.StatusCode, errorContent);
                    // Depending on the error, you might want to throw or handle differently
                    // For instance, 4xx errors might indicate bad data that shouldn't be retried indefinitely.
                    // 5xx errors might warrant retries.
                    response.EnsureSuccessStatusCode(); // This will throw for non-success codes
                }
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "HttpMetricEmitter: HTTP request error while sending events to {ApiEndpoint}.", _httpClient.BaseAddress + _options.IngestPath.TrimStart('/'));
                throw; // Re-throw to allow MetricCollectionService to handle/log
            }
            catch (TaskCanceledException tcEx) when (tcEx.InnerException is TimeoutException)
            {
                _logger.LogError(tcEx, "HttpMetricEmitter: Timeout while sending events to {ApiEndpoint}.", _httpClient.BaseAddress + _options.IngestPath.TrimStart('/'));
                throw;
            }
            catch (TaskCanceledException tcEx)
            {
                _logger.LogWarning(tcEx, "HttpMetricEmitter: Task was canceled while sending events (possibly due to shutdown or client cancellation).");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "HttpMetricEmitter: Unexpected error sending events to {ApiEndpoint}.", _httpClient.BaseAddress + _options.IngestPath.TrimStart('/'));
                throw;
            }
        }
    }
}

