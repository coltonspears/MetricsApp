using MetricsApp.Abstractions.Data;
using MetricsApp.Core.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace MetricsApp.DataSources.SqlServer;

public class SqlServerDataRepository : IDataRepository
{
    private readonly ILogger<SqlServerDataRepository> _logger;
    private readonly string _connectionString;

    public SqlServerDataRepository(ILogger<SqlServerDataRepository> logger, IConfiguration configuration)
    {
        _logger = logger;
        _connectionString = configuration.GetConnectionString("MetricsDatabase") ?? throw new ArgumentNullException("MetricsDatabase connection string is not configured.");
        
        // Ensure tables exist on startup
        CreateTablesIfNotExistAsync(CancellationToken.None).Wait();
    }

    public async Task StoreLogsAsync(IEnumerable<LogRecord> logs, CancellationToken cancellationToken = default)
    {
        if (!logs.Any()) return;

        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        foreach (var log in logs)
        {
            var query = @"
                INSERT INTO [dbo].[Logs] (timestamp, level, message, source, attributes, resource)
                VALUES (@timestamp, @level, @message, @source, @attributes, @resource)";

            using var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@timestamp", log.Timestamp.UtcDateTime);
            command.Parameters.AddWithValue("@level", log.SeverityText ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@message", log.Body ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@source", log.Attributes != null && log.Attributes.TryGetValue("source", out var source) ? source.ToString() : (object)DBNull.Value);
            command.Parameters.AddWithValue("@attributes", log.Attributes != null ? JsonSerializer.Serialize(log.Attributes) : (object)DBNull.Value);
            command.Parameters.AddWithValue("@resource", log.Resource != null ? JsonSerializer.Serialize(log.Resource) : (object)DBNull.Value);

            try
            {
                await command.ExecuteNonQueryAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to store log record: {LogMessage}", log.Body);
            }
        }
    }

    public async Task StoreMetricsAsync(IEnumerable<Metric> metrics, CancellationToken cancellationToken = default)
    {
        if (!metrics.Any()) return;

        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        foreach (var metric in metrics)
        {
            var query = @"
                INSERT INTO [dbo].[Metrics] (timestamp, name, value, type, attributes, resource)
                VALUES (@timestamp, @name, @value, @type, @attributes, @resource)";

            using var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@timestamp", metric.Timestamp.UtcDateTime);
            command.Parameters.AddWithValue("@name", metric.Name);
            command.Parameters.AddWithValue("@value", metric.GaugeValueDouble);
            command.Parameters.AddWithValue("@type", metric.Type.ToString());
            command.Parameters.AddWithValue("@attributes", metric.Attributes != null ? JsonSerializer.Serialize(metric.Attributes) : (object)DBNull.Value);
            command.Parameters.AddWithValue("@resource", metric.Resource != null ? JsonSerializer.Serialize(metric.Resource) : (object)DBNull.Value);

            try
            {
                await command.ExecuteNonQueryAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to store metric: {MetricName} = {MetricValue}", metric.Name, metric.GaugeValueDouble);
            }
        }
    }

    public async Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        var query = BuildLogQuery(criteria);
        using var command = new SqlCommand(query, connection);
        
        command.Parameters.AddWithValue("@startTime", criteria.StartTime.UtcDateTime);
        command.Parameters.AddWithValue("@endTime", criteria.EndTime.UtcDateTime);
        
        var logs = new List<LogRecord>();
        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        
        while (await reader.ReadAsync(cancellationToken))
        {
            var timestamp = reader.GetDateTime("timestamp");
            var log = new LogRecord
            {
                Timestamp = new DateTimeOffset(DateTime.SpecifyKind(timestamp, DateTimeKind.Utc)),
                ObservedTimestamp = DateTimeOffset.UtcNow,
                SeverityText = reader.IsDBNull("level") ? "INFO" : reader.GetString("level"),
                Body = reader.IsDBNull("message") ? "" : reader.GetString("message"),
                Attributes = reader.IsDBNull("attributes") ? new Dictionary<string, object>() : JsonSerializer.Deserialize<Dictionary<string, object>>(reader.GetString("attributes")),
                Resource = reader.IsDBNull("resource") ? new Dictionary<string, object>() : JsonSerializer.Deserialize<Dictionary<string, object>>(reader.GetString("resource"))
            };
            logs.Add(log);
        }

        return new LogQueryResult
        {
            Logs = logs,
            TotalHits = logs.Count
        };
    }

    public async Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        var query = BuildMetricQuery(criteria);
        using var command = new SqlCommand(query, connection);
        
        command.Parameters.AddWithValue("@startTime", criteria.StartTime.UtcDateTime);
        command.Parameters.AddWithValue("@endTime", criteria.EndTime.UtcDateTime);
        
        var timeSeries = new List<MetricTimeSeries>();
        var currentSeries = new MetricTimeSeries();
        var values = new List<Tuple<long, string>>();
        
        using var reader = await command.ExecuteReaderAsync(cancellationToken);
        
        while (await reader.ReadAsync(cancellationToken))
        {
            var timestamp = reader.GetDateTime("timestamp");
            var value = Convert.ToDouble(reader.GetValue("value"));
            
            var unixTimestamp = new DateTimeOffset(DateTime.SpecifyKind(timestamp, DateTimeKind.Utc)).ToUnixTimeSeconds();
            values.Add(new Tuple<long, string>(unixTimestamp, value.ToString()));
        }

        if (values.Count > 0)
        {
            currentSeries.Values = values;
            currentSeries.MetricInfo = new MetricDefinition
            {
                Name = criteria.Query ?? "sql_metric",
                Attributes = new Dictionary<string, object>(), // Attributes from DB
                Resource = new Dictionary<string, object>() // Resource from DB
            };
            timeSeries.Add(currentSeries);
        }

        return new MetricQueryResult
        {
            ResultType = "matrix",
            Result = timeSeries
        };
    }

    public Task<RepositoryMetricSchema> GetMetricSchemaAsync(CancellationToken cancellationToken = default)
    {
        var metricsSchema = new RepositoryMetricSchema();
        
        // Get distinct metric names, attribute keys, and resource keys from the Metrics table
        using var connection = new SqlConnection(_connectionString);
        connection.Open();
        
        var distinctNames = new List<string>();
        var distinctAttributeKeys = new HashSet<string>();
        var distinctResourceKeys = new HashSet<string>();
        var query = "SELECT DISTINCT name, attributes, resource FROM [dbo].[Metrics]";
        
        using var command = new SqlCommand(query, connection);
        using var reader = command.ExecuteReader();
        while (reader.Read())
        {
            distinctNames.Add(reader.GetString(0));
            
            if (!reader.IsDBNull(1))
            {
                var attributes = JsonSerializer.Deserialize<Dictionary<string, object>>(reader.GetString(1));
                foreach (var key in attributes.Keys)
                {
                    distinctAttributeKeys.Add(key);
                }
            }
            
            if (!reader.IsDBNull(2))
            {
                var resource = JsonSerializer.Deserialize<Dictionary<string, object>>(reader.GetString(2));
                foreach (var key in resource.Keys)
                {
                    distinctResourceKeys.Add(key);
                }
            }
        }
        
        metricsSchema.MetricNames = distinctNames;
        metricsSchema.AttributeKeys = distinctAttributeKeys.ToList();
        metricsSchema.ResourceKeys = distinctResourceKeys.ToList();
        
        return Task.FromResult(metricsSchema);
    }

    private async Task CreateTablesIfNotExistAsync(CancellationToken cancellationToken)
    {
        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        var logTableExists = await TableExistsAsync(connection, "Logs", cancellationToken);
        if (!logTableExists)
        {
            await CreateTableAsync(connection, "Logs", @"
                CREATE TABLE [dbo].[Logs](
                    [timestamp] DATETIME NOT NULL,
                    [level] NVARCHAR(MAX) NULL,
                    [message] NVARCHAR(MAX) NULL,
                    [source] NVARCHAR(MAX) NULL,
                    [attributes] NVARCHAR(MAX) NULL,
                    [resource] NVARCHAR(MAX) NULL
                ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]", cancellationToken);
        }

        var metricTableExists = await TableExistsAsync(connection, "Metrics", cancellationToken);
        if (!metricTableExists)
        {
            await CreateTableAsync(connection, "Metrics", @"
                CREATE TABLE [dbo].[Metrics](
                    [timestamp] DATETIME NOT NULL,
                    [name] NVARCHAR(255) NOT NULL,
                    [value] FLOAT NOT NULL,
                    [type] NVARCHAR(50) NOT NULL,
                    [attributes] NVARCHAR(MAX) NULL,
                    [resource] NVARCHAR(MAX) NULL
                ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]", cancellationToken);
        }
        
        var traceTableExists = await TableExistsAsync(connection, "Traces", cancellationToken);
        if (!traceTableExists)
        {
            await CreateTableAsync(connection, "Traces", @"
                CREATE TABLE [dbo].[Traces](
                    [traceId] NVARCHAR(32) NOT NULL,
                    [spanId] NVARCHAR(16) NOT NULL,
                    [parentSpanId] NVARCHAR(16) NULL,
                    [name] NVARCHAR(MAX) NULL,
                    [kind] NVARCHAR(50) NULL,
                    [startTime] DATETIME NOT NULL,
                    [endTime] DATETIME NOT NULL,
                    [attributes] NVARCHAR(MAX) NULL,
                    [resource] NVARCHAR(MAX) NULL
                ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]", cancellationToken);
        }
        
        _logger.LogInformation("Ensured necessary tables exist in the database.");
    }

    private async Task<bool> TableExistsAsync(SqlConnection connection, string tableName, CancellationToken cancellationToken)
    {
        var command = new SqlCommand("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = @TableName", connection);
        command.Parameters.AddWithValue("@TableName", tableName);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result != null;
    }

    private async Task CreateTableAsync(SqlConnection connection, string tableName, string createTableQuery, CancellationToken cancellationToken)
    {
        try
        {
            var command = new SqlCommand(createTableQuery, connection);
            await command.ExecuteNonQueryAsync(cancellationToken);
            _logger.LogInformation($"Table '{tableName}' created successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to create table '{tableName}'.");
            throw;
        }
    }

    private string BuildLogQuery(LogQueryCriteria criteria)
    {
        var tableName = "Logs"; // Hardcode for now, can be dynamic later
        
        var baseQuery = $@"
            SELECT TOP 1000
                timestamp, 
                level, 
                message, 
                source,
                attributes,
                resource
            FROM [{tableName}]
            WHERE timestamp >= @startTime AND timestamp <= @endTime";

        baseQuery += " ORDER BY timestamp DESC";
        
        return baseQuery;
    }

    private string BuildMetricQuery(MetricQueryCriteria criteria)
    {
        var tableName = "Metrics"; // Hardcode for now, can be dynamic later
        
        var baseQuery = $@"
            SELECT 
                timestamp,
                name,
                value,
                type,
                attributes,
                resource
            FROM [{tableName}]
            WHERE timestamp >= @startTime AND timestamp <= @endTime";
        
        if (!string.IsNullOrEmpty(criteria.Query))
        {
            baseQuery += $" AND name = '{criteria.Query}'"; // Filter by metric name
        }

        baseQuery += " ORDER BY timestamp";
        
        return baseQuery;
    }
}
