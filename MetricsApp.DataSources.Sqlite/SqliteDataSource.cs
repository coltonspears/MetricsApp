using MetricsApp.Abstractions.Data;
using MetricsApp.Core.Models;
using Microsoft.Data.Sqlite;
using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MetricsApp.Abstractions.DataSources;
using Microsoft.Extensions.Logging;

namespace MetricsApp.DataSources.Sqlite;

public class SqliteDataSource : IDataSource
{
    private readonly ILogger<SqliteDataSource> _logger;
    private DataSourceConfiguration? _configuration;
    private string? _connectionString;

    public string DataSourceType => "sqlite";
    public string DisplayName => "SQLite";
    public string Description => "Query metrics and logs from SQLite database files.";
    public string Version => "1.0.0";

    public SqliteDataSource(ILogger<SqliteDataSource> logger)
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
                    Name = "filePath",
                    Label = "Database File Path",
                    Description = "Full path to the SQLite database file (e.g., C:\\data\\metrics.db)",
                    Type = ConfigurationFieldType.Text,
                    Required = true,
                    Placeholder = "metrics.db"
                },
                new ConfigurationField
                {
                    Name = "commandTimeout",
                    Label = "Command Timeout (seconds)",
                    Description = "Timeout for SQL queries",
                    Type = ConfigurationFieldType.Number,
                    DefaultValue = 30
                }
            },
            Defaults = new Dictionary<string, object>
            {
                { "commandTimeout", 30 }
            },
            ValidationRules = new List<ValidationRule>
            {
                new ValidationRule
                {
                    FieldName = "filePath",
                    Type = ValidationType.Required,
                    ErrorMessage = "Database file path is required."
                }
            }
        };
    }

    public async Task InitializeAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        _configuration = configuration;
        var filePath = GetConfigValue<string>(configuration.Properties, "filePath", null);

        if (string.IsNullOrWhiteSpace(filePath))
        {
            throw new ArgumentException("SQLite file path is not configured.", nameof(configuration));
        }

        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = filePath,
            Mode = SqliteOpenMode.ReadWriteCreate // Or ReadOnly, depending on use case
        }.ConnectionString;

        _logger.LogInformation("Initialized SQLite datasource: {Name} to {FilePath}",
            configuration.Name, filePath);
        await Task.CompletedTask;
    }

    public async Task<DataSourceTestResult> TestConnectionAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            var filePath = GetConfigValue<string>(configuration.Properties, "filePath", null);
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return DataSourceTestResult.Failure("File path is not configured.");
            }

            var testConnectionString = new SqliteConnectionStringBuilder { DataSource = filePath }.ConnectionString;

            using var connection = new SqliteConnection(testConnectionString);
            await connection.OpenAsync(cancellationToken);

            using var command = connection.CreateCommand();
            command.CommandText = "SELECT 1;";
            command.CommandTimeout = GetCommandTimeout(configuration);
            await command.ExecuteScalarAsync(cancellationToken);

            stopwatch.Stop();
            return DataSourceTestResult.Success(stopwatch.ElapsedMilliseconds, $"Successfully connected to SQLite database: {filePath}");
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Failed to test SQLite connection");
            return DataSourceTestResult.Failure($"Connection failed: {ex.Message}", ex.ToString());
        }
    }

    public async Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized.");

        var logs = new List<LogRecord>();
        try
        {
            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            // Simplified query; assumes a 'Logs' table with 'timestamp', 'level', 'message'
            var query = $@"
                SELECT timestamp, level, message
                FROM [{criteria.Query ?? "Logs"}]
                WHERE timestamp >= @startTime AND timestamp <= @endTime
                ORDER BY timestamp DESC
                LIMIT @limit;";

            using var command = new SqliteCommand(query, connection);
            command.CommandTimeout = GetCommandTimeout(_configuration);
            command.Parameters.AddWithValue("@startTime", criteria.StartTime.UtcDateTime);
            command.Parameters.AddWithValue("@endTime", criteria.EndTime.UtcDateTime);
            command.Parameters.AddWithValue("@limit", criteria.Limit > 0 ? criteria.Limit : 1000);


            using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                logs.Add(new LogRecord
                {
                    Timestamp = reader.GetDateTimeOffset(0),
                    SeverityText = reader.IsDBNull(1) ? "INFO" : reader.GetString(1),
                    Body = reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
                    ObservedTimestamp = DateTimeOffset.UtcNow,
                    Resource = new Dictionary<string, object> { { "datasource", "sqlite" } }
                });
            }
            return new LogQueryResult { Logs = logs, TotalHits = logs.Count };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying SQLite logs");
            return new LogQueryResult { Logs = logs, ErrorMessage = ex.Message };
        }
    }

    public async Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized.");

        var timeSeriesList = new List<MetricTimeSeries>();
        try
        {
            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            // Simplified query; assumes a 'Metrics' table with 'timestamp', 'value'
            // and criteria.Query is the metric name (or table name)
            var query = $@"
                SELECT timestamp, value
                FROM [{criteria.Query ?? "Metrics"}]
                WHERE timestamp >= @startTime AND timestamp <= @endTime
                ORDER BY timestamp;";

            using var command = new SqliteCommand(query, connection);
            command.CommandTimeout = GetCommandTimeout(_configuration);
            command.Parameters.AddWithValue("@startTime", criteria.StartTime.UtcDateTime);
            command.Parameters.AddWithValue("@endTime", criteria.EndTime.UtcDateTime);

            var values = new List<Tuple<long, string>>();
            using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var timestamp = reader.GetDateTimeOffset(0).ToUnixTimeSeconds();
                var value = reader.GetDouble(1).ToString();
                values.Add(new Tuple<long, string>(timestamp, value));
            }

            if (values.Any())
            {
                timeSeriesList.Add(new MetricTimeSeries
                {
                    MetricInfo = new MetricDefinition { Name = criteria.Query ?? "sqlite_metric" },
                    Values = values
                });
            }
            return new MetricQueryResult { ResultType = "matrix", Result = timeSeriesList };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying SQLite metrics");
            return new MetricQueryResult { ResultType = "error", ErrorMessage = ex.Message };
        }
    }

    public async Task<DataSourceMetadata> GetMetadataAsync(CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized.");

        var metadata = new DataSourceMetadata
        {
            AvailableMetrics = new List<string>(),
            AvailableFields = new List<DataSourceField>()
        };

        try
        {
            using var connection = new SqliteConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            using var command = new SqliteCommand("SELECT name FROM sqlite_master WHERE type='table';", connection);
            command.CommandTimeout = GetCommandTimeout(_configuration);
            using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                metadata.AvailableMetrics.Add(reader.GetString(0));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting SQLite metadata");
        }
        return metadata;
    }

    public ValueTask DisposeAsync()
    {
        _connectionString = null;
        _configuration = null;
        return ValueTask.CompletedTask;
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

    private int GetCommandTimeout(DataSourceConfiguration configuration)
    {
        return GetConfigValue<int>(configuration.Properties, "commandTimeout", 30);
    }
}