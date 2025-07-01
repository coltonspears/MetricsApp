using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.DataSources;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Text.Json;

namespace MetricsApp.DataSources.Prometheus;

/// <summary>
/// Prometheus datasource implementation
/// </summary>
public class PrometheusDataSource : IDataSource
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PrometheusDataSource> _logger;
    private DataSourceConfiguration? _configuration;
    private HttpClient? _httpClient;

    public string DataSourceType => "prometheus";
    public string DisplayName => "Prometheus";
    public string Description => "Query metrics from Prometheus time-series database";
    public string Version => "1.0.0";

    public PrometheusDataSource(IHttpClientFactory httpClientFactory, ILogger<PrometheusDataSource> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public DataSourceConfigurationSchema GetConfigurationSchema()
    {
        return new DataSourceConfigurationSchema
        {
            Fields = new List<ConfigurationField>
            {
                new ConfigurationField
                {
                    Name = "url",
                    Label = "Prometheus URL",
                    Description = "The URL of your Prometheus server (e.g., http://localhost:9090)",
                    Type = ConfigurationFieldType.Url,
                    Required = true,
                    Placeholder = "http://localhost:9090"
                },
                new ConfigurationField
                {
                    Name = "timeout",
                    Label = "Query Timeout (seconds)",
                    Description = "Timeout for Prometheus queries",
                    Type = ConfigurationFieldType.Number,
                    DefaultValue = 30
                }
            },
            Defaults = new Dictionary<string, object>
            {
                { "timeout", 30 }
            },
            ValidationRules = new List<ValidationRule>
            {
                new ValidationRule
                {
                    FieldName = "url",
                    Type = ValidationType.Required,
                    ErrorMessage = "Prometheus URL is required"
                },
                new ValidationRule
                {
                    FieldName = "url",
                    Type = ValidationType.Url,
                    ErrorMessage = "Please enter a valid URL"
                }
            }
        };
    }

    public async Task<DataSourceTestResult> TestConnectionAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            using var httpClient = CreateHttpClient(configuration);
            
            // Test with a simple query to /api/v1/label/__name__/values
            var testUrl = $"{configuration.Url.TrimEnd('/')}/api/v1/label/__name__/values";
            var response = await httpClient.GetAsync(testUrl, cancellationToken);
            
            stopwatch.Stop();
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                var jsonDoc = JsonDocument.Parse(content);
                
                if (jsonDoc.RootElement.TryGetProperty("status", out var status) && 
                    status.GetString() == "success")
                {
                    return DataSourceTestResult.Success(
                        stopwatch.ElapsedMilliseconds,
                        "Successfully connected to Prometheus"
                    );
                }
            }
            
            return DataSourceTestResult.Failure(
                $"Prometheus returned status: {response.StatusCode}",
                $"Response: {await response.Content.ReadAsStringAsync(cancellationToken)}"
            );
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Failed to test Prometheus connection");
            return DataSourceTestResult.Failure(
                $"Connection failed: {ex.Message}",
                ex.ToString()
            );
        }
    }

    public async Task InitializeAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        _configuration = configuration;
        _httpClient = CreateHttpClient(configuration);
        
        _logger.LogInformation("Initialized Prometheus datasource: {Name} at {Url}", 
            configuration.Name, configuration.Url);
    }

    public async Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        // Prometheus doesn't support log queries
        return new LogQueryResult
        {
            Logs = new List<LogRecord>(),
            TotalHits = 0,
            ErrorMessage = "Prometheus datasource does not support log queries"
        };
    }

    public async Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_httpClient == null || _configuration == null)
        {
            throw new InvalidOperationException("Datasource not initialized");
        }

        try
        {
            // Build Prometheus query URL
            var queryUrl = BuildQueryUrl(criteria);
            var response = await _httpClient.GetAsync(queryUrl, cancellationToken);
            
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Prometheus query failed with status: {StatusCode}", response.StatusCode);
                return new MetricQueryResult { ResultType = "error" };
            }

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParsePrometheusResponse(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying Prometheus metrics");
            return new MetricQueryResult { ResultType = "error" };
        }
    }

    public async Task<DataSourceMetadata> GetMetadataAsync(CancellationToken cancellationToken = default)
    {
        if (_httpClient == null || _configuration == null)
        {
            throw new InvalidOperationException("Datasource not initialized");
        }

        try
        {
            // Get available metrics from Prometheus
            var metricsUrl = $"{_configuration.Url.TrimEnd('/')}/api/v1/label/__name__/values";
            var response = await _httpClient.GetAsync(metricsUrl, cancellationToken);
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync(cancellationToken);
                var jsonDoc = JsonDocument.Parse(content);
                
                var metrics = new List<string>();
                if (jsonDoc.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
                {
                    foreach (var metric in data.EnumerateArray())
                    {
                        if (metric.ValueKind == JsonValueKind.String)
                        {
                            metrics.Add(metric.GetString()!);
                        }
                    }
                }

                return new DataSourceMetadata
                {
                    AvailableMetrics = metrics,
                    AvailableFields = new List<DataSourceField>
                    {
                        new DataSourceField { Name = "value", Type = "number", Description = "Metric value", IsAggregatable = true },
                        new DataSourceField { Name = "timestamp", Type = "datetime", Description = "Timestamp", IsSearchable = false }
                    },
                    TimeRange = new DataSourceTimeRange
                    {
                        EarliestTime = DateTime.UtcNow.AddDays(-30), // Prometheus typically retains 15 days by default
                        LatestTime = DateTime.UtcNow
                    }
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Prometheus metadata");
        }

        return new DataSourceMetadata();
    }

    public async ValueTask DisposeAsync()
    {
        _httpClient?.Dispose();
        _httpClient = null;
        _configuration = null;

        await Task.CompletedTask;
    }

    private HttpClient CreateHttpClient(DataSourceConfiguration configuration)
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.BaseAddress = new Uri(configuration.Url);
        httpClient.Timeout = TimeSpan.FromSeconds(configuration.TimeoutSeconds);

        // Configure authentication if needed
        if (configuration.Authentication?.Type == AuthenticationType.Basic)
        {
            var credentials = Convert.ToBase64String(
                System.Text.Encoding.ASCII.GetBytes(
                    $"{configuration.Authentication.Username}:{configuration.Authentication.Password}"
                )
            );
            httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);
        }
        else if (configuration.Authentication?.Type == AuthenticationType.Bearer)
        {
            httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", configuration.Authentication.Token);
        }

        return httpClient;
    }

    private string BuildQueryUrl(MetricQueryCriteria criteria)
    {
        var baseUrl = $"{_configuration!.Url.TrimEnd('/')}/api/v1/query_range";
        var queryParams = new List<string>();

        // Add query parameter
        if (!string.IsNullOrEmpty(criteria.Query))
        {
            queryParams.Add($"query={Uri.EscapeDataString(criteria.Query)}");
        }

        // Add time range
        queryParams.Add($"start={criteria.StartTime.ToUnixTimeSeconds()}");
        queryParams.Add($"end={criteria.EndTime.ToUnixTimeSeconds()}");

        // Add step (resolution)
        var step = !string.IsNullOrEmpty(criteria.Step) ? criteria.Step : "60s";
        queryParams.Add($"step={step}");

        return queryParams.Count > 0 ? $"{baseUrl}?{string.Join("&", queryParams)}" : baseUrl;
    }

    private MetricQueryResult ParsePrometheusResponse(string content)
    {
        try
        {
            var jsonDoc = JsonDocument.Parse(content);
            var result = new MetricQueryResult { ResultType = "matrix" };

            if (jsonDoc.RootElement.TryGetProperty("data", out var data) &&
                data.TryGetProperty("result", out var resultArray))
            {
                var timeSeries = new List<MetricTimeSeries>();

                foreach (var series in resultArray.EnumerateArray())
                {
                    var metricSeries = new MetricTimeSeries();
                    
                    // Parse metric labels and determine metric name
                    string metricName = "unknown_metric";
                    var attributes = new Dictionary<string, object>();
                    
                    if (series.TryGetProperty("metric", out var metric))
                    {
                        foreach (var label in metric.EnumerateObject())
                        {
                            var labelValue = label.Value.GetString() ?? "";
                            if (label.Name == "__name__")
                            {
                                metricName = labelValue;
                            }
                            else
                            {
                                attributes[label.Name] = labelValue;
                            }
                        }
                    }

                    // Parse time series values
                    var values = new List<Tuple<long, string>>();
                    if (series.TryGetProperty("values", out var valuesArray))
                    {
                        foreach (var valuePoint in valuesArray.EnumerateArray())
                        {
                            if (valuePoint.ValueKind == JsonValueKind.Array)
                            {
                                var valueArray = valuePoint.EnumerateArray().ToArray();
                                if (valueArray.Length >= 2)
                                {
                                    // First element is timestamp (Unix timestamp as number)
                                    var timestamp = valueArray[0].ValueKind == JsonValueKind.Number 
                                        ? (long)valueArray[0].GetDouble() 
                                        : 0;
                                    
                                    // Second element is the value (as string to preserve precision)
                                    var value = valueArray[1].ValueKind == JsonValueKind.String 
                                        ? valueArray[1].GetString() ?? "0"
                                        : valueArray[1].GetRawText().Trim('"');

                                    values.Add(new Tuple<long, string>(timestamp, value));
                                }
                            }
                        }
                    }

                    // Populate the MetricTimeSeries object
                    metricSeries.MetricInfo = new MetricDefinition
                    {
                        Name = metricName,
                        Attributes = attributes,
                        Resource = new Dictionary<string, object>
                        {
                            { "datasource.type", "prometheus" },
                            { "datasource.url", _configuration?.Url ?? "unknown" }
                        }
                    };
                    metricSeries.Values = values;

                    timeSeries.Add(metricSeries);
                }

                result.Result = timeSeries;
            }
            else
            {
                // Check if there's an error in the response
                if (jsonDoc.RootElement.TryGetProperty("status", out var status) && 
                    status.GetString() == "error")
                {
                    var errorMessage = "Unknown Prometheus error";
                    if (jsonDoc.RootElement.TryGetProperty("error", out var error))
                    {
                        errorMessage = error.GetString() ?? errorMessage;
                    }
                    
                    result.ResultType = "error";
                    result.ErrorMessage = errorMessage;
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing Prometheus response");
            return new MetricQueryResult 
            { 
                ResultType = "error",
                ErrorMessage = $"Failed to parse Prometheus response: {ex.Message}"
            };
        }
    }
} 