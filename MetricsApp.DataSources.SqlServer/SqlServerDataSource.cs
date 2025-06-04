using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.DataSources;
using MetricsApp.Core.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
using System.Data;
using System.Diagnostics;
using System.Text.Json;

namespace MetricsApp.DataSources.SqlServer;

/// <summary>
/// SQL Server datasource implementation
/// </summary>
public class SqlServerDataSource : IDataSource
{
    private readonly ILogger<SqlServerDataSource> _logger;
    private DataSourceConfiguration? _configuration;
    private string? _connectionString;

    public string DataSourceType => "sqlserver";
    public string DisplayName => "SQL Server";
    public string Description => "Query metrics and logs from Microsoft SQL Server databases";
    public string Version => "1.0.0";

    public SqlServerDataSource(ILogger<SqlServerDataSource> logger)
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
                    Name = "server",
                    Label = "Server",
                    Description = "SQL Server instance name or IP address (e.g., localhost, server\\instance, or IP:port)",
                    Type = ConfigurationFieldType.Text,
                    Required = true,
                    Placeholder = "localhost"
                },
                new ConfigurationField
                {
                    Name = "database",
                    Label = "Database",
                    Description = "Name of the database to connect to",
                    Type = ConfigurationFieldType.Text,
                    Required = true,
                    Placeholder = "MyDatabase"
                },
                new ConfigurationField
                {
                    Name = "authType",
                    Label = "Authentication Type",
                    Description = "Choose between Windows Authentication or SQL Server Authentication",
                    Type = ConfigurationFieldType.Select,
                    Required = true,
                    DefaultValue = "Windows",
                    Options = new List<SelectOption>
                    {
                        new SelectOption { Value = "Windows", Label = "Windows Authentication" },
                        new SelectOption { Value = "SqlServer", Label = "SQL Server Authentication" }
                    }
                },
                new ConfigurationField
                {
                    Name = "username",
                    Label = "Username",
                    Description = "SQL Server username (only for SQL Server Authentication)",
                    Type = ConfigurationFieldType.Text,
                    Required = false,
                    Placeholder = "sa"
                },
                new ConfigurationField
                {
                    Name = "password",
                    Label = "Password",
                    Description = "SQL Server password (only for SQL Server Authentication)",
                    Type = ConfigurationFieldType.Password,
                    Required = false
                },
                new ConfigurationField
                {
                    Name = "connectionTimeout",
                    Label = "Connection Timeout (seconds)",
                    Description = "Timeout for database connections",
                    Type = ConfigurationFieldType.Number,
                    DefaultValue = 30
                },
                new ConfigurationField
                {
                    Name = "commandTimeout",
                    Label = "Command Timeout (seconds)",
                    Description = "Timeout for SQL queries",
                    Type = ConfigurationFieldType.Number,
                    DefaultValue = 60
                },
                new ConfigurationField
                {
                    Name = "trustServerCertificate",
                    Label = "Trust Server Certificate",
                    Description = "Trust the server certificate (useful for development/testing)",
                    Type = ConfigurationFieldType.Boolean,
                    DefaultValue = false
                }
            },
            Defaults = new Dictionary<string, object>
            {
                { "authType", "Windows" },
                { "connectionTimeout", 30 },
                { "commandTimeout", 60 },
                { "trustServerCertificate", false }
            },
            ValidationRules = new List<ValidationRule>
            {
                new ValidationRule
                {
                    FieldName = "server",
                    Type = ValidationType.Required,
                    ErrorMessage = "Server is required"
                },
                new ValidationRule
                {
                    FieldName = "database",
                    Type = ValidationType.Required,
                    ErrorMessage = "Database name is required"
                }
            }
        };
    }

    public async Task<DataSourceTestResult> TestConnectionAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            var connectionString = BuildConnectionString(configuration);
            
            using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);
            
            // Test with a simple query
            using var command = new SqlCommand("SELECT @@VERSION", connection);
            command.CommandTimeout = GetCommandTimeout(configuration);
            
            var result = await command.ExecuteScalarAsync(cancellationToken);
            
            stopwatch.Stop();
            
            if (result != null)
            {
                return DataSourceTestResult.Success(
                    stopwatch.ElapsedMilliseconds,
                    $"Successfully connected to SQL Server. Version: {result.ToString()?.Split('\n')[0]}"
                );
            }
            
            return DataSourceTestResult.Failure("Connection test returned no result");
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Failed to test SQL Server connection");
            return DataSourceTestResult.Failure(
                $"Connection failed: {ex.Message}",
                ex.ToString()
            );
        }
    }

    public async Task InitializeAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        _configuration = configuration;
        _connectionString = BuildConnectionString(configuration);
        
        _logger.LogInformation("Initialized SQL Server datasource: {Name} to {Server}/{Database}", 
            configuration.Name, 
            configuration.Properties.GetValueOrDefault("server", "unknown"),
            configuration.Properties.GetValueOrDefault("database", "unknown"));
    }

    public async Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
        {
            throw new InvalidOperationException("Datasource not initialized");
        }

        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            var query = BuildLogQuery(criteria);
            using var command = new SqlCommand(query, connection);
            command.CommandTimeout = GetCommandTimeout(_configuration);
            
            // Add parameters for time range
            command.Parameters.AddWithValue("@startTime", criteria.StartTime.DateTime);
            command.Parameters.AddWithValue("@endTime", criteria.EndTime.DateTime);
            
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
                    Attributes = new Dictionary<string, object>(),
                    Resource = new Dictionary<string, object>
                    {
                        { "datasource", "sql-server" },
                        { "database", _configuration.Properties.GetValueOrDefault("database", "unknown") },
                        { "server", _configuration.Properties.GetValueOrDefault("server", "unknown") }
                    }
                };

                // Add source to attributes if available
                if (!reader.IsDBNull("source"))
                {
                    log.Attributes["source"] = reader.GetString("source");
                }

                // Add any additional fields as attributes
                for (int i = 0; i < reader.FieldCount; i++)
                {
                    var fieldName = reader.GetName(i);
                    if (!IsStandardLogField(fieldName) && !reader.IsDBNull(i))
                    {
                        log.Attributes[fieldName] = reader.GetValue(i);
                    }
                }

                logs.Add(log);
            }

            return new LogQueryResult
            {
                Logs = logs,
                TotalHits = logs.Count
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying SQL Server logs");
            return new LogQueryResult
            {
                Logs = new List<LogRecord>(),
                TotalHits = 0,
                ErrorMessage = $"Query failed: {ex.Message}"
            };
        }
    }

    public async Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
        {
            throw new InvalidOperationException("Datasource not initialized");
        }

        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            var query = BuildMetricQuery(criteria);
            using var command = new SqlCommand(query, connection);
            command.CommandTimeout = GetCommandTimeout(_configuration);
            
            // Add parameters for time range
            command.Parameters.AddWithValue("@startTime", criteria.StartTime.DateTime);
            command.Parameters.AddWithValue("@endTime", criteria.EndTime.DateTime);
            
            var timeSeries = new List<MetricTimeSeries>();
            using var reader = await command.ExecuteReaderAsync(cancellationToken);
            
            var currentSeries = new MetricTimeSeries();
            var values = new List<Tuple<long, string>>();
            
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
                    Attributes = new Dictionary<string, object>
                    {
                        { "datasource", "sql-server" },
                        { "database", _configuration.Properties.GetValueOrDefault("database", "unknown") },
                        { "server", _configuration.Properties.GetValueOrDefault("server", "unknown") }
                    },
                    Resource = new Dictionary<string, object>
                    {
                        { "datasource.type", "sql-server" }
                    }
                };
                timeSeries.Add(currentSeries);
            }

            return new MetricQueryResult
            {
                ResultType = "matrix",
                Result = timeSeries
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying SQL Server metrics");
            return new MetricQueryResult
            {
                ResultType = "error",
                Result = new List<MetricTimeSeries>(),
                ErrorMessage = $"Query failed: {ex.Message}"
            };
        }
    }

    public async Task<DataSourceMetadata> GetMetadataAsync(CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
        {
            throw new InvalidOperationException("Datasource not initialized");
        }

        try
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync(cancellationToken);

            var metadata = new DataSourceMetadata();

            // Get available tables
            var tablesQuery = @"
                SELECT TABLE_NAME, TABLE_TYPE 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME";

            using var tablesCommand = new SqlCommand(tablesQuery, connection);
            tablesCommand.CommandTimeout = GetCommandTimeout(_configuration);
            
            var availableMetrics = new List<string>();
            using var tablesReader = await tablesCommand.ExecuteReaderAsync(cancellationToken);
            
            while (await tablesReader.ReadAsync(cancellationToken))
            {
                availableMetrics.Add(tablesReader.GetString("TABLE_NAME"));
            }
            
            tablesReader.Close();

            // Get available fields from a sample table (if any metrics exist)
            var availableFields = new List<DataSourceField>();
            if (availableMetrics.Count > 0)
            {
                var sampleTable = availableMetrics.First();
                var fieldsQuery = $@"
                    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = '{sampleTable}'
                    ORDER BY ORDINAL_POSITION";

                using var fieldsCommand = new SqlCommand(fieldsQuery, connection);
                fieldsCommand.CommandTimeout = GetCommandTimeout(_configuration);
                using var fieldsReader = await fieldsCommand.ExecuteReaderAsync(cancellationToken);
                
                while (await fieldsReader.ReadAsync(cancellationToken))
                {
                    var field = new DataSourceField
                    {
                        Name = fieldsReader.GetString("COLUMN_NAME"),
                        Type = MapSqlTypeToDataType(fieldsReader.GetString("DATA_TYPE")),
                        IsSearchable = true,
                        IsAggregatable = IsNumericType(fieldsReader.GetString("DATA_TYPE"))
                    };
                    availableFields.Add(field);
                }
            }

            metadata.AvailableMetrics = availableMetrics;
            metadata.AvailableFields = availableFields;
            metadata.TimeRange = new DataSourceTimeRange
            {
                EarliestTime = DateTime.UtcNow.AddDays(-30), // Default to 30 days
                LatestTime = DateTime.UtcNow
            };

            return metadata;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting SQL Server metadata");
            return new DataSourceMetadata();
        }
    }

    public async ValueTask DisposeAsync()
    {
        _connectionString = null;
        _configuration = null;
        await Task.CompletedTask;
    }

    private string BuildConnectionString(DataSourceConfiguration configuration)
    {
        var builder = new SqlConnectionStringBuilder();
        
        builder.DataSource = GetConfigValue<string>(configuration.Properties, "server", "localhost");
        builder.InitialCatalog = GetConfigValue<string>(configuration.Properties, "database", "");
        builder.ConnectTimeout = GetConfigValue<int>(configuration.Properties, "connectionTimeout", 30);
        builder.TrustServerCertificate = GetConfigValue<bool>(configuration.Properties, "trustServerCertificate", false);

        var authType = GetConfigValue<string>(configuration.Properties, "authType", "Windows");
        
        if (authType == "Windows")
        {
            builder.IntegratedSecurity = true;
        }
        else
        {
            // Use SQL Server authentication
            if (configuration.Authentication?.Type == AuthenticationType.Basic)
            {
                builder.UserID = configuration.Authentication.Username ?? "";
                builder.Password = configuration.Authentication.Password ?? "";
            }
            else
            {
                // Fallback to properties for username/password
                builder.UserID = GetConfigValue<string>(configuration.Properties, "username", "");
                builder.Password = GetConfigValue<string>(configuration.Properties, "password", "");
            }
        }

        return builder.ConnectionString;
    }

    private int GetCommandTimeout(DataSourceConfiguration configuration)
    {
        return GetConfigValue<int>(configuration.Properties, "commandTimeout", 60);
    }

    private T GetConfigValue<T>(Dictionary<string, object> properties, string key, T defaultValue)
    {
        if (!properties.TryGetValue(key, out var value) || value == null)
        {
            return defaultValue;
        }

        try
        {
            // Handle JsonElement from System.Text.Json
            if (value is JsonElement jsonElement)
            {
                if (typeof(T) == typeof(string))
                {
                    return (T)(object)(jsonElement.ValueKind == JsonValueKind.String ? jsonElement.GetString() ?? defaultValue?.ToString() ?? "" : jsonElement.ToString());
                }
                else if (typeof(T) == typeof(int))
                {
                    return (T)(object)(jsonElement.ValueKind == JsonValueKind.Number ? jsonElement.GetInt32() : Convert.ToInt32(jsonElement.ToString()));
                }
                else if (typeof(T) == typeof(bool))
                {
                    return (T)(object)(jsonElement.ValueKind == JsonValueKind.True || (jsonElement.ValueKind == JsonValueKind.String && bool.TryParse(jsonElement.GetString(), out var boolValue) && boolValue));
                }
            }

            // Handle direct conversion
            if (value is T directValue)
            {
                return directValue;
            }

            // Fallback conversion
            return (T)Convert.ChangeType(value, typeof(T));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to convert configuration value '{Key}' to type {Type}, using default value", key, typeof(T).Name);
            return defaultValue;
        }
    }

    private string BuildLogQuery(LogQueryCriteria criteria)
    {
        // Use query as table name for now (will be configurable later)
        var tableName = criteria.Query ?? "Logs";
        
        var baseQuery = $@"
            SELECT TOP 1000
                timestamp, 
                level, 
                message, 
                source,
                *
            FROM [{tableName}]
            WHERE timestamp >= @startTime AND timestamp <= @endTime";

        baseQuery += " ORDER BY timestamp DESC";
        
        return baseQuery;
    }

    private string BuildMetricQuery(MetricQueryCriteria criteria)
    {
        // Use query as table name for now (will be configurable later)
        var tableName = criteria.Query ?? "Metrics";
        
        var baseQuery = $@"
            SELECT 
                timestamp,
                value
            FROM [{tableName}]
            WHERE timestamp >= @startTime AND timestamp <= @endTime
            ORDER BY timestamp";
        
        return baseQuery;
    }

    private static bool IsStandardLogField(string fieldName)
    {
        var standardFields = new[] { "timestamp", "level", "message", "source" };
        return standardFields.Contains(fieldName.ToLowerInvariant());
    }

    private static string MapSqlTypeToDataType(string sqlType)
    {
        return sqlType.ToLowerInvariant() switch
        {
            "int" or "bigint" or "smallint" or "tinyint" or "decimal" or "numeric" or "float" or "real" or "money" or "smallmoney" => "number",
            "bit" => "boolean",
            "datetime" or "datetime2" or "smalldatetime" or "date" or "time" or "datetimeoffset" => "datetime",
            _ => "string"
        };
    }

    private static bool IsNumericType(string sqlType)
    {
        var numericTypes = new[] { "int", "bigint", "smallint", "tinyint", "decimal", "numeric", "float", "real", "money", "smallmoney" };
        return numericTypes.Contains(sqlType.ToLowerInvariant());
    }
} 