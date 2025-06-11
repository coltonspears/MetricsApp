using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.DataSources;
using MetricsApp.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace MetricsApp.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class DataSourcesController : ControllerBase
{
    private readonly IDataSourceRegistry _registry;
    private readonly IDataSourceManager _manager;
    private readonly ILogger<DataSourcesController> _logger;

    public DataSourcesController(
        IDataSourceRegistry registry,
        IDataSourceManager manager,
        ILogger<DataSourcesController> logger)
    {
        _registry = registry;
        _manager = manager;
        _logger = logger;
    }

    /// <summary>
    /// Get all available datasource types
    /// </summary>
    [HttpGet("types")]
    public ActionResult<IEnumerable<DataSourceTypeInfo>> GetDataSourceTypes()
    {
        var types = _registry.GetAvailableDataSourceTypes();
        return Ok(types);
    }

    /// <summary>
    /// Get a specific datasource type info
    /// </summary>
    [HttpGet("types/{dataSourceType}")]
    public ActionResult<DataSourceTypeInfo> GetDataSourceType(string dataSourceType)
    {
        var typeInfo = _registry.GetDataSourceTypeInfo(dataSourceType);
        if (typeInfo == null)
        {
            return NotFound($"Datasource type '{dataSourceType}' not found");
        }
        return Ok(typeInfo);
    }

    /// <summary>
    /// Get extended information about a specific datasource type
    /// </summary>
    [HttpGet("types/{dataSourceType}/extended")]
    public ActionResult<DataSourceExtendedInfo> GetDataSourceExtendedInfo(string dataSourceType)
    {
        _logger.LogInformation("Getting extended info for data source type: {DataSourceType}", dataSourceType);

        var extendedInfo = GetDataSourceExtendedInfoInternal(dataSourceType);
        return Ok(extendedInfo);
    }

    private DataSourceExtendedInfo GetDataSourceExtendedInfoInternal(string dataSourceType)
    {
        return dataSourceType.ToLower() switch
        {
            "prometheus" => new DataSourceExtendedInfo
            {
                Category = "Monitoring",
                Repository = "https://github.com/prometheus/prometheus",
                Documentation = "https://prometheus.io/docs/",
                License = "Apache 2.0",
                Maintainer = "Prometheus Team",
                Capabilities = new List<string> { "Metrics", "Alerting", "Time Series", "Query Language (PromQL)" },
                Tags = new List<string> { "monitoring", "metrics", "time-series", "alerting", "observability" },
                Screenshots = new List<string>(),
                Changelog = new List<ChangelogEntry>
                {
                    new ChangelogEntry
                    {
                        Version = "2.45.0",
                        ReleaseDate = DateTime.UtcNow.AddDays(-30),
                        ReleaseType = "Minor",
                        Changes = new List<string>
                        {
                            "Added support for native histograms",
                            "Improved query performance for large time ranges",
                            "Enhanced TSDB block handling",
                            "Bug fixes and stability improvements"
                        }
                    },
                    new ChangelogEntry
                    {
                        Version = "2.44.0", 
                        ReleaseDate = DateTime.UtcNow.AddDays(-60),
                        ReleaseType = "Minor",
                        Changes = new List<string>
                        {
                            "Added new metric metadata APIs",
                            "Improved memory usage in TSDB",
                            "Enhanced service discovery for Kubernetes",
                            "Various bug fixes"
                        }
                    }
                }
            },
            "sqlserver" => new DataSourceExtendedInfo
            {
                Category = "Database", 
                Repository = "https://github.com/microsoft/mssql-docker",
                Documentation = "https://docs.microsoft.com/en-us/sql/",
                License = "Proprietary",
                Maintainer = "Microsoft",
                Capabilities = new List<string> { "SQL Queries", "Stored Procedures", "Views", "Full-Text Search", "Analytics" },
                Tags = new List<string> { "database", "sql", "microsoft", "relational", "enterprise" },
                Screenshots = new List<string>(),
                Changelog = new List<ChangelogEntry>()
            },
            "mysql" => new DataSourceExtendedInfo
            {
                Category = "Database",
                Repository = "https://github.com/mysql/mysql-server", 
                Documentation = "https://dev.mysql.com/doc/",
                License = "GPL v2",
                Maintainer = "Oracle Corporation",
                Capabilities = new List<string> { "SQL Queries", "Stored Procedures", "Views", "Replication", "JSON Support" },
                Tags = new List<string> { "database", "sql", "mysql", "opensource", "relational" },
                Screenshots = new List<string>(),
                Changelog = new List<ChangelogEntry>()
            },
            "postgresql" => new DataSourceExtendedInfo
            {
                Category = "Database",
                Repository = "https://github.com/postgres/postgres",
                Documentation = "https://www.postgresql.org/docs/",
                License = "PostgreSQL License",
                Maintainer = "PostgreSQL Global Development Group",
                Capabilities = new List<string> { "SQL Queries", "JSON/JSONB", "Arrays", "Custom Types", "Extensions", "Full-Text Search" },
                Tags = new List<string> { "database", "sql", "postgresql", "opensource", "advanced" },
                Screenshots = new List<string>(),
                Changelog = new List<ChangelogEntry>()
            },
            "elasticsearch" => new DataSourceExtendedInfo
            {
                Category = "Search & Analytics",
                Repository = "https://github.com/elastic/elasticsearch",
                Documentation = "https://www.elastic.co/guide/",
                License = "Elastic License 2.0",
                Maintainer = "Elastic",
                Capabilities = new List<string> { "Full-Text Search", "Aggregations", "Analytics", "Logging", "Real-time Search" },
                Tags = new List<string> { "search", "analytics", "logging", "elasticsearch", "nosql" },
                Screenshots = new List<string>(),
                Changelog = new List<ChangelogEntry>()
            },
            "influxdb" => new DataSourceExtendedInfo
            {
                Category = "Time Series Database",
                Repository = "https://github.com/influxdata/influxdb",
                Documentation = "https://docs.influxdata.com/",
                License = "MIT",
                Maintainer = "InfluxData",
                Capabilities = new List<string> { "Time Series", "High Write Performance", "SQL-like Query Language", "Retention Policies", "Continuous Queries" },
                Tags = new List<string> { "timeseries", "metrics", "iot", "monitoring", "influxdb" },
                Screenshots = new List<string>(),
                Changelog = new List<ChangelogEntry>()
            },
            _ => new DataSourceExtendedInfo
            {
                Category = "Other",
                Repository = null,
                Documentation = null,
                License = "Unknown",
                Maintainer = "Unknown",
                Capabilities = new List<string>(),
                Tags = new List<string>(),
                Screenshots = new List<string>(),
                Changelog = new List<ChangelogEntry>()
            }
        };
    }

    /// <summary>
    /// Get all configured datasources
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<DataSourceConfiguration>>> GetDataSources()
    {
        var dataSources = await _manager.GetDataSourcesAsync();
        return Ok(dataSources);
    }

    /// <summary>
    /// Get a specific datasource configuration
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<DataSourceConfiguration>> GetDataSource(string id)
    {
        var dataSource = await _manager.GetDataSourceAsync(id);
        if (dataSource == null)
        {
            return NotFound($"Datasource '{id}' not found");
        }
        return Ok(dataSource);
    }

    /// <summary>
    /// Create a new datasource configuration
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<DataSourceConfiguration>> CreateDataSource([FromBody] DataSourceConfiguration configuration)
    {
        try
        {
            var created = await _manager.CreateDataSourceAsync(configuration);
            return CreatedAtAction(nameof(GetDataSource), new { id = created.Id }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating datasource");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Update an existing datasource configuration
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<DataSourceConfiguration>> UpdateDataSource(string id, [FromBody] DataSourceConfiguration configuration)
    {
        if (id != configuration.Id)
        {
            return BadRequest("ID mismatch");
        }

        try
        {
            var updated = await _manager.UpdateDataSourceAsync(configuration);
            return Ok(updated);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating datasource");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Delete a datasource configuration
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteDataSource(string id)
    {
        try
        {
            await _manager.DeleteDataSourceAsync(id);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting datasource");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Test a datasource connection
    /// </summary>
    [HttpPost("test")]
    public async Task<ActionResult<DataSourceTestResult>> TestDataSource([FromBody] DataSourceConfiguration configuration)
    {
        try
        {
            var result = await _manager.TestDataSourceAsync(configuration);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing datasource");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get metadata from a datasource
    /// </summary>
    [HttpGet("{id}/metadata")]
    public async Task<ActionResult<DataSourceMetadata>> GetDataSourceMetadata(string id)
    {
        try
        {
            var metadata = await _manager.GetDataSourceMetadataAsync(id);
            return Ok(metadata);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting datasource metadata");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Query logs from a specific datasource
    /// </summary>
    [HttpPost("{id}/query/logs")]
    public async Task<ActionResult> QueryLogs(string id, [FromBody] LogQueryCriteria criteria)
    {
        try
        {
            var result = await _manager.QueryLogsAsync(id, criteria);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying logs from datasource");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Query metrics from a specific datasource
    /// </summary>
    [HttpPost("{id}/query/metrics")]
    public async Task<ActionResult> QueryMetrics(string id, [FromBody] MetricQueryCriteria criteria)
    {
        try
        {
            var result = await _manager.QueryMetricsAsync(id, criteria);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying metrics from datasource");
            return StatusCode(500, "Internal server error");
        }
    }
} 