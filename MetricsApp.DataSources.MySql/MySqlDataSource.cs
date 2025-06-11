using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.DataSources;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace MetricsApp.DataSources.MySql;

public class MySqlDataSource : IDataSource
{
    private readonly ILogger<MySqlDataSource> _logger;
    private DataSourceConfiguration? _configuration;
    private string? _connectionString;

    public string DataSourceType => "mysql";
    public string DisplayName => "MySQL";
    public string Description => "Query metrics and logs from MySQL databases.";
    public string Version => "1.0.0";

    public MySqlDataSource(ILogger<MySqlDataSource> logger)
    {
        _logger = logger;
    }

    public DataSourceConfigurationSchema GetConfigurationSchema()
    {
        return new DataSourceConfigurationSchema
        {
            Fields = new List<ConfigurationField>
            {
                new ConfigurationField { Name = "server", Label = "Server", Type = ConfigurationFieldType.Text, Required = true, Placeholder = "localhost" },
                new ConfigurationField { Name = "port", Label = "Port", Type = ConfigurationFieldType.Number, DefaultValue = 3306, Placeholder = "3306" },
                new ConfigurationField { Name = "database", Label = "Database", Type = ConfigurationFieldType.Text, Required = true },
                new ConfigurationField { Name = "username", Label = "Username", Type = ConfigurationFieldType.Text, Required = true },
                new ConfigurationField { Name = "password", Label = "Password", Type = ConfigurationFieldType.Password, Required = false },
                new ConfigurationField { Name = "connectionTimeout", Label = "Connection Timeout (sec)", Type = ConfigurationFieldType.Number, DefaultValue = 15 },
                new ConfigurationField { Name = "commandTimeout", Label = "Command Timeout (sec)", Type = ConfigurationFieldType.Number, DefaultValue = 30 }
            },
            Defaults = new Dictionary<string, object>
            {
                { "port", 3306 }, { "connectionTimeout", 15 }, { "commandTimeout", 30 }
            }
        };
    }

    public async Task InitializeAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        _configuration = configuration;
        _connectionString = BuildConnectionString(configuration);
        _logger.LogInformation("Initialized MySQL datasource: {Name} to {Server}/{Database}",
            configuration.Name,
            GetConfigValue<string>(configuration.Properties, "server", "unknown"),
            GetConfigValue<string>(configuration.Properties, "database", "unknown"));
        await Task.CompletedTask;
    }

    public async Task<DataSourceTestResult> TestConnectionAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            var testConnectionString = BuildConnectionString(configuration);
            using var connection = new MySqlConnection(testConnectionString);
            await connection.OpenAsync(cancellationToken);
            using var command = new MySqlCommand("SELECT 1;", connection);
            command.CommandTimeout = GetCommandTimeout(configuration);
            await command.ExecuteScalarAsync(cancellationToken);
            stopwatch.Stop();
            return DataSourceTestResult.Success(stopwatch.ElapsedMilliseconds, "Successfully connected to MySQL.");
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Failed to test MySQL connection");
            return DataSourceTestResult.Failure($"Connection failed: {ex.Message}", ex.ToString());
        }
    }

    public async Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized.");

        // Placeholder: Implement actual MySQL log querying logic
        _logger.LogWarning("MySQL QueryLogsAsync is not fully implemented.");
        await Task.CompletedTask;
        return new LogQueryResult { Logs = new List<LogRecord>(), ErrorMessage = "Not implemented" };
    }

    public async Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized.");

        // Placeholder: Implement actual MySQL metric querying logic
        _logger.LogWarning("MySQL QueryMetricsAsync is not fully implemented.");
        await Task.CompletedTask;
        return new MetricQueryResult { ResultType = "error", ErrorMessage = "Not implemented" };
    }

    public async Task<DataSourceMetadata> GetMetadataAsync(CancellationToken cancellationToken = default)
    {
        if (_connectionString == null || _configuration == null)
            throw new InvalidOperationException("Datasource not initialized.");

        // Placeholder: Implement actual MySQL metadata retrieval
        _logger.LogWarning("MySQL GetMetadataAsync is not fully implemented.");
        await Task.CompletedTask;
        return new DataSourceMetadata();  //{ ErrorMessage = "Not implemented" }};
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
        var builder = new MySqlConnectionStringBuilder
        {
            Server = GetConfigValue<string>(props, "server", "localhost"),
            Port = (uint)GetConfigValue<int>(props, "port", 3306),
            Database = GetConfigValue<string>(props, "database", ""),
            UserID = GetConfigValue<string>(props, "username", ""),
            Password = config.Authentication?.Password ?? GetConfigValue<string>(props, "password", ""),
            ConnectionTimeout = (uint)GetConfigValue<int>(props, "connectionTimeout", 15)
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