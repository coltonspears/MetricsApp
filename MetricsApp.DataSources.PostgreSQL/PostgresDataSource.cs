using System.Diagnostics;
using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.DataSources;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace MetricsApp.DataSources.PostgreSQL;

public class PostgresDataSource : IDataSource
{
    private readonly ILogger<PostgresDataSource> _logger;
    private DataSourceConfiguration? _configuration;
    private string? _connectionString;

    public string DataSourceType => "postgres";
    public string DisplayName => "PostgreSQL";
    public string Description => "Query metrics and logs from PostgreSQL databases.";
    public string Version => "1.0.0";

    public PostgresDataSource(ILogger<PostgresDataSource> logger)
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
                new ConfigurationField { Name = "port", Label = "Port", Type = ConfigurationFieldType.Number, DefaultValue = 5432, Placeholder = "5432" },
                new ConfigurationField { Name = "database", Label = "Database", Type = ConfigurationFieldType.Text, Required = true },
                new ConfigurationField { Name = "username", Label = "Username", Type = ConfigurationFieldType.Text, Required = true },
                new ConfigurationField { Name = "password", Label = "Password", Type = ConfigurationFieldType.Password, Required = false },
                new ConfigurationField { Name = "connectionTimeout", Label = "Connection Timeout (sec)", Type = ConfigurationFieldType.Number, DefaultValue = 15 },
                new ConfigurationField { Name = "commandTimeout", Label = "Command Timeout (sec)", Type = ConfigurationFieldType.Number, DefaultValue = 30 }
            },
            Defaults = new Dictionary<string, object>
            {
                { "port", 5432 }, { "connectionTimeout", 15 }, { "commandTimeout", 30 }
            }
        };
    }

    public async Task InitializeAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        _configuration = configuration;
        _connectionString = BuildConnectionString(configuration);
        _logger.LogInformation("Initialized PostgreSQL datasource: {Name} to {Host}/{Database}",
            configuration.Name,
            GetConfigValue<string>(configuration.Properties, "host", "unknown"),
            GetConfigValue<string>(configuration.Properties, "database", "unknown"));
        await Task.CompletedTask;
    }

    public async Task<DataSourceTestResult> TestConnectionAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            var testConnectionString = BuildConnectionString(configuration);
            using var connection = new NpgsqlConnection(testConnectionString);
            await connection.OpenAsync(cancellationToken);
            using var command = new NpgsqlCommand("SELECT 1;", connection);
            command.CommandTimeout = GetCommandTimeout(configuration);
            await command.ExecuteScalarAsync(cancellationToken);
            stopwatch.Stop();
            return DataSourceTestResult.Success(stopwatch.ElapsedMilliseconds, "Successfully connected to PostgreSQL.");
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Failed to test PostgreSQL connection");
            return DataSourceTestResult.Failure($"Connection failed: {ex.Message}", ex.ToString());
        }
    }

    public async Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized.");

        // Placeholder: Implement actual PostgreSQL log querying logic
        _logger.LogWarning("PostgreSQL QueryLogsAsync is not fully implemented.");
        await Task.CompletedTask;
        return new LogQueryResult { Logs = new List<LogRecord>(), ErrorMessage = "Not implemented" };
    }

    public async Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized.");

        // Placeholder: Implement actual PostgreSQL metric querying logic
        _logger.LogWarning("PostgreSQL QueryMetricsAsync is not fully implemented.");
        await Task.CompletedTask;
        return new MetricQueryResult { ResultType = "error", ErrorMessage = "Not implemented" };
    }

    public async Task<DataSourceMetadata> GetMetadataAsync(CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized.");

        // Placeholder: Implement actual PostgreSQL metadata retrieval
        _logger.LogWarning("PostgreSQL GetMetadataAsync is not fully implemented.");
        await Task.CompletedTask;
        return new DataSourceMetadata { };// { ErrorMessage = "Not implemented" }};
    }

    public ValueTask DisposeAsync()
    {
        _connectionString = null;
        _configuration = null;
        return ValueTask.CompletedTask;
    }

    private string BuildConnectionString(DataSourceConfiguration config)
    {
        var props = config.Properties;
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = GetConfigValue<string>(props, "host", "localhost"),
            Port = GetConfigValue<int>(props, "port", 5432),
            Database = GetConfigValue<string>(props, "database", ""),
            Username = GetConfigValue<string>(props, "username", ""),
            Password = config.Authentication?.Password ?? GetConfigValue<string>(props, "password", ""),
            Timeout = GetConfigValue<int>(props, "connectionTimeout", 15)
            // CommandTimeout is handled per command
        };
        return builder.ConnectionString;
    }
    
    private int GetCommandTimeout(DataSourceConfiguration configuration)
    {
        return GetConfigValue<int>(configuration.Properties, "commandTimeout", 30);
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