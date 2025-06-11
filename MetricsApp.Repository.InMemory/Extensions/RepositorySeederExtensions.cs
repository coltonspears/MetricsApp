using MetricsApp.Abstractions.Data;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Repository.InMemory.Extensions;

public static class RepositorySeederExtensions
{
    public static async Task SeedSampleDataSourcesAsync(this IConfigurationRepository repository, ILogger logger)
    {
        logger.LogInformation("Seeding sample data sources...");

        // Check if any data sources already exist
        var existing = await repository.GetDataSourceConfigurationsAsync();
        if (existing.Any())
        {
            logger.LogInformation("Data sources already exist, skipping seed.");
            return;
        }

        var sampleDataSources = new List<DataSourceConfiguration>
        {
            new DataSourceConfiguration
            {
                Id = "prometheus-dev",
                Name = "Development Prometheus",
                DataSourceType = "prometheus",
                Url = "http://localhost:9090",
                Properties = new Dictionary<string, object>
                {
                    { "timeout", 30 },
                    { "maxConcurrentQueries", 10 },
                    { "step", "15s" }
                },
                Authentication = new DataSourceAuthentication
                {
                    Type = AuthenticationType.None
                },
                IsEnabled = true,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddDays(-5)
            },
            new DataSourceConfiguration
            {
                Id = "prometheus-prod",
                Name = "Production Metrics",
                DataSourceType = "prometheus", 
                Url = "https://prometheus.example.com",
                Properties = new Dictionary<string, object>
                {
                    { "timeout", 60 },
                    { "maxConcurrentQueries", 20 },
                    { "step", "30s" }
                },
                Authentication = new DataSourceAuthentication
                {
                    Type = AuthenticationType.Bearer,
                    Token = "prod-token-placeholder"
                },
                IsEnabled = true,
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new DataSourceConfiguration
            {
                Id = "sql-server-logs",
                Name = "Application Logs DB",
                DataSourceType = "sqlserver",
                Url = "Server=localhost;Database=ApplicationLogs;Integrated Security=true;",
                Properties = new Dictionary<string, object>
                {
                    { "server", "localhost" },
                    { "database", "ApplicationLogs" },
                    { "commandTimeout", 30 },
                    { "connectionTimeout", 15 },
                    { "logTable", "ApplicationLogs" },
                    { "timestampColumn", "Timestamp" },
                    { "messageColumn", "Message" },
                    { "levelColumn", "Level" }
                },
                Authentication = new DataSourceAuthentication
                {
                    Type = AuthenticationType.None
                },
                IsEnabled = true,
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new DataSourceConfiguration
            {
                Id = "sql-server-metrics",
                Name = "Metrics Database",
                DataSourceType = "sqlserver",
                Url = "Server=metrics-db.example.com;Database=MetricsDB;User Id=metrics_user;Password=****;",
                Properties = new Dictionary<string, object>
                {
                    { "server", "metrics-db.example.com" },
                    { "database", "MetricsDB" },
                    { "username", "metrics_user" },
                    { "commandTimeout", 45 },
                    { "connectionTimeout", 20 },
                    { "metricsTable", "MetricSamples" },
                    { "timestampColumn", "Timestamp" },
                    { "valueColumn", "Value" },
                    { "nameColumn", "MetricName" }
                },
                Authentication = new DataSourceAuthentication
                {
                    Type = AuthenticationType.Basic,
                    Username = "metrics_user",
                    Password = "secure_password"
                },
                IsEnabled = false,
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                UpdatedAt = DateTime.UtcNow.AddDays(-3)
            }
        };

        foreach (var dataSource in sampleDataSources)
        {
            await repository.StoreDataSourceConfigurationAsync(dataSource);
            logger.LogInformation("Seeded data source: {Name} ({Type})", dataSource.Name, dataSource.DataSourceType);
        }

        logger.LogInformation("Successfully seeded {Count} sample data sources", sampleDataSources.Count);
    }
} 