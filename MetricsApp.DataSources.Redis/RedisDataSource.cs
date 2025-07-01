using System.Diagnostics;
using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.DataSources;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace MetricsApp.DataSources.Redis;

public class RedisDataSource : IDataSource
{
    private readonly ILogger<RedisDataSource> _logger;
    private DataSourceConfiguration? _configuration;
    private ConnectionMultiplexer? _redisConnection;
    private ConfigurationOptions? _redisConfigOptions;

    public string DataSourceType => "redis";
    public string DisplayName => "Redis";
    public string Description => "Query metrics and data from Redis.";
    public string Version => "1.0.0";

    public RedisDataSource(ILogger<RedisDataSource> logger)
    {
        _logger = logger;
    }

    public DataSourceConfigurationSchema GetConfigurationSchema()
    {
        return new DataSourceConfigurationSchema
        {
            Fields = new List<ConfigurationField>
            {
                new ConfigurationField { Name = "host", Label = "Host", Type = ConfigurationFieldType.Text, Required = true, Placeholder = "localhost" },
                new ConfigurationField { Name = "port", Label = "Port", Type = ConfigurationFieldType.Number, DefaultValue = 6379, Placeholder = "6379" },
                new ConfigurationField { Name = "password", Label = "Password", Type = ConfigurationFieldType.Password, Required = false },
                new ConfigurationField { Name = "connectTimeout", Label = "Connect Timeout (ms)", Type = ConfigurationFieldType.Number, DefaultValue = 5000 }
            },
            Defaults = new Dictionary<string, object>
            {
                { "port", 6379 }, { "connectTimeout", 5000 }
            }
        };
    }

    public async Task InitializeAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        _configuration = configuration;
        var host = GetConfigValue<string>(configuration.Properties, "host", "localhost");
        var port = GetConfigValue<int>(configuration.Properties, "port", 6379);
        var password = configuration.Authentication?.Password ?? GetConfigValue<string>(configuration.Properties, "password", null);
        var connectTimeout = GetConfigValue<int>(configuration.Properties, "connectTimeout", 5000);

        _redisConfigOptions = new ConfigurationOptions
        {
            EndPoints = { { host, port } },
            Password = string.IsNullOrWhiteSpace(password) ? null : password,
            ConnectTimeout = connectTimeout,
            AbortOnConnectFail = false // Handle connection errors gracefully
        };

        try
        {
            _redisConnection = await ConnectionMultiplexer.ConnectAsync(_redisConfigOptions);
            _logger.LogInformation("Initialized Redis datasource: {Name} to {Host}:{Port}", configuration.Name, host, port);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Redis connection during InitializeAsync.");
            // Optionally rethrow or handle as appropriate for your application's startup.
        }
    }

    public async Task<DataSourceTestResult> TestConnectionAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            var host = GetConfigValue<string>(configuration.Properties, "host", "localhost");
            var port = GetConfigValue<int>(configuration.Properties, "port", 6379);
            var password = configuration.Authentication?.Password ?? GetConfigValue<string>(configuration.Properties, "password", null);
            var connectTimeout = GetConfigValue<int>(configuration.Properties, "connectTimeout", 5000);

            var tempConfigOptions = new ConfigurationOptions
            {
                EndPoints = { { host, port } },
                Password = string.IsNullOrWhiteSpace(password) ? null : password,
                ConnectTimeout = connectTimeout,
                AbortOnConnectFail = true // For testing, fail fast
            };

            using var connection = await ConnectionMultiplexer.ConnectAsync(tempConfigOptions);
            var db = connection.GetDatabase();
            await db.PingAsync();
            stopwatch.Stop();
            return DataSourceTestResult.Success(stopwatch.ElapsedMilliseconds, "Successfully connected to Redis and pinged.");
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Failed to test Redis connection");
            return DataSourceTestResult.Failure($"Connection failed: {ex.Message}", ex.ToString());
        }
    }

    public async Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_redisConnection == null || !_redisConnection.IsConnected || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized or connection lost.");

        // Placeholder: Redis log querying is highly dependent on how logs are stored (e.g., Lists, Streams).
        _logger.LogWarning("Redis QueryLogsAsync is a basic placeholder and may need specific implementation based on log storage strategy.");
        var logs = new List<LogRecord>();
        try
        {
            var db = _redisConnection.GetDatabase();
            var logKey = criteria.Query ?? "application_logs";
            // Fetch recent logs, assuming they are JSON strings. This is very simplistic.
            var redisValues = await db.ListRangeAsync(logKey, 0, (criteria.Limit > 0 ? criteria.Limit : 100) - 1);
            
            foreach(var value in redisValues)
            {
                if (value.HasValue)
                {
                    // Assuming log entries are simple strings or JSON that can be parsed.
                    // For simplicity, treating the whole value as the body.
                    logs.Add(new LogRecord {
                        Timestamp = DateTimeOffset.UtcNow, // Redis typically doesn't store per-entry timestamps unless part of the value
                        Body = value.ToString(),
                        SeverityText = "INFO", // Placeholder
                        ObservedTimestamp = DateTimeOffset.UtcNow,
                        Resource = new Dictionary<string, object> { { "datasource", "redis" }, { "key", logKey } }
                    });
                }
            }
             return new LogQueryResult { Logs = logs, TotalHits = logs.Count };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying Redis logs");
            return new LogQueryResult { Logs = logs, ErrorMessage = ex.Message };
        }
    }

    public async Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_redisConnection == null || !_redisConnection.IsConnected || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized or connection lost.");

        // Placeholder: Assumes criteria.Query is a Redis key containing a simple numeric value or a JSON serialized timeseries.
        _logger.LogWarning("Redis QueryMetricsAsync is a basic placeholder.");
        var timeSeriesList = new List<MetricTimeSeries>();
        try
        {
            var db = _redisConnection.GetDatabase();
            var metricKey = criteria.Query ?? "default_metric_key";
            RedisValue value = await db.StringGetAsync(metricKey);

            if (value.HasValue)
            {
                // Simplistic: assumes the value is a single number representing the current metric value.
                // For actual time series, you'd need a more complex structure in Redis (e.g., Sorted Set, RedisTimeSeries module).
                if (double.TryParse(value.ToString(), out double numericValue))
                {
                    var series = new MetricTimeSeries
                    {
                        MetricInfo = new MetricDefinition { Name = metricKey },
                        Values = new List<Tuple<long, string>>
                        {
                            new Tuple<long, string>(DateTimeOffset.UtcNow.ToUnixTimeSeconds(), numericValue.ToString())
                        }
                    };
                    timeSeriesList.Add(series);
                }
            }
            return new MetricQueryResult { ResultType = "matrix", Result = timeSeriesList };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying Redis metrics");
            return new MetricQueryResult { ResultType = "error", ErrorMessage = ex.Message };
        }
    }

    public async Task<DataSourceMetadata> GetMetadataAsync(CancellationToken cancellationToken = default)
    {
        if (_redisConnection == null || !_redisConnection.IsConnected || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized or connection lost.");
        
        var metadata = new DataSourceMetadata { AvailableMetrics = new List<string>(), AvailableFields = new List<DataSourceField>() };
        try
        {
            var server = _redisConnection.GetServer(_redisConnection.GetEndPoints().First());
            var info = await server.InfoAsync(); // Gets a lot of info
            metadata.AvailableMetrics.Add($"Redis Keys (use SCAN for full list - not implemented here)");
            // Example: Add some server info as fields
            foreach(var section in info)
            {
                foreach(var item in section)
                {
                     metadata.AvailableFields.Add(new DataSourceField { Name = $"info.{section.Key}.{item.Key}", Type = "string" });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Redis metadata");
            //metadata.ErrorMessage = ex.Message;
        }
        return metadata;
    }

    public async ValueTask DisposeAsync()
    {
        if (_redisConnection != null)
        {
            await _redisConnection.CloseAsync();
            await _redisConnection.DisposeAsync();
            _redisConnection = null;
        }
        _configuration = null;
        _redisConfigOptions = null;
    }

    private T GetConfigValue<T>(Dictionary<string, object> properties, string key, T defaultValue)
    {
        if (properties.TryGetValue(key, out var value) && value != null)
        {
            try { return (T)Convert.ChangeType(value, typeof(T)); }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to convert config value '{Key}'.", key); }
        }
        return defaultValue;
    }
}