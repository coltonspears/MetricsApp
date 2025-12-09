using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.DataSources;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;

namespace TemplatePlugin;

/// <summary>
/// Example data source implementation.
/// </summary>
public class TemplateDataSource : IDataSource
{
    private readonly ILogger<TemplateDataSource> _logger;
    private DataSourceConfiguration? _configuration;

    public string DataSourceType => "template";
    public string DisplayName => "Template Data Source";
    public string Description => "Example data source for demonstration";
    public string Version => "1.0.0";

    public TemplateDataSource(ILogger<TemplateDataSource> logger)
    {
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
                    Name = "endpoint",
                    Label = "Endpoint URL",
                    Type = ConfigurationFieldType.Text,
                    Required = true
                }
            }
        };
    }

    public async Task<DataSourceTestResult> TestConnectionAsync(
        DataSourceConfiguration configuration, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Implement your connection test logic here
            await Task.Delay(100, cancellationToken);
            return DataSourceTestResult.Success(100, "Connection successful");
        }
        catch (Exception ex)
        {
            return DataSourceTestResult.Failure($"Connection failed: {ex.Message}");
        }
    }

    public Task InitializeAsync(
        DataSourceConfiguration configuration, 
        CancellationToken cancellationToken = default)
    {
        _configuration = configuration;
        _logger.LogInformation("Template data source initialized: {Name}", configuration.Name);
        return Task.CompletedTask;
    }

    public async Task<LogQueryResult> QueryLogsAsync(
        LogQueryCriteria criteria, 
        CancellationToken cancellationToken = default)
    {
        // Implement your log query logic here
        _logger.LogDebug("Querying logs with criteria: {Query}", criteria.Query);
        
        // Return sample data for demonstration
        var logs = new List<LogRecord>
        {
            new LogRecord
            {
                Timestamp = DateTimeOffset.UtcNow.AddMinutes(-5),
                ObservedTimestamp = DateTimeOffset.UtcNow,
                SeverityText = "INFO",
                Body = "Sample log message 1",
                Attributes = new Dictionary<string, object>
                {
                    { "source", "template-plugin" }
                },
                Resource = new Dictionary<string, object>
                {
                    { "service.name", "template-service" }
                }
            },
            new LogRecord
            {
                Timestamp = DateTimeOffset.UtcNow.AddMinutes(-3),
                ObservedTimestamp = DateTimeOffset.UtcNow,
                SeverityText = "WARNING",
                Body = "Sample log message 2",
                Attributes = new Dictionary<string, object>
                {
                    { "source", "template-plugin" }
                },
                Resource = new Dictionary<string, object>
                {
                    { "service.name", "template-service" }
                }
            }
        };

        return new LogQueryResult
        {
            Logs = logs,
            TotalHits = logs.Count
        };
    }

    public async Task<MetricQueryResult> QueryMetricsAsync(
        MetricQueryCriteria criteria, 
        CancellationToken cancellationToken = default)
    {
        // Implement your metric query logic here
        _logger.LogDebug("Querying metrics with criteria: {Query}", criteria.Query);
        
        // Return sample data for demonstration
        var now = DateTimeOffset.UtcNow;
        var values = new List<Tuple<long, string>>();
        
        for (int i = 60; i >= 0; i--)
        {
            var timestamp = now.AddMinutes(-i).ToUnixTimeSeconds();
            var value = Math.Sin(i * 0.1) * 50 + 50 + Random.Shared.NextDouble() * 10;
            values.Add(new Tuple<long, string>(timestamp, value.ToString("F2")));
        }

        var series = new MetricTimeSeries
        {
            Values = values,
            MetricInfo = new MetricDefinition
            {
                Name = criteria.Query ?? "sample_metric",
                Attributes = new Dictionary<string, object>
                {
                    { "source", "template-plugin" }
                },
                Resource = new Dictionary<string, object>
                {
                    { "service.name", "template-service" }
                }
            }
        };

        return new MetricQueryResult
        {
            ResultType = "matrix",
            Result = new List<MetricTimeSeries> { series }
        };
    }

    public Task<DataSourceMetadata> GetMetadataAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new DataSourceMetadata
        {
            AvailableMetrics = new List<string> { "sample_metric", "cpu_usage", "memory_usage" },
            AvailableFields = new List<DataSourceField>
            {
                new DataSourceField { Name = "timestamp", Type = "datetime", IsSearchable = true },
                new DataSourceField { Name = "value", Type = "number", IsSearchable = true, IsAggregatable = true },
                new DataSourceField { Name = "source", Type = "string", IsSearchable = true }
            },
            TimeRange = new DataSourceTimeRange
            {
                EarliestTime = DateTime.UtcNow.AddDays(-30),
                LatestTime = DateTime.UtcNow
            }
        });
    }

    public ValueTask DisposeAsync()
    {
        _configuration = null;
        return ValueTask.CompletedTask;
    }
}

