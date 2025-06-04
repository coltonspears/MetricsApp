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