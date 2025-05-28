using Microsoft.AspNetCore.Mvc;
using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.Caching;
using MetricsApp.Core.Models;
using MetricsApp.Api.Models; 
using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace MetricsApp.Api.Controllers;
[ApiController]
    [Route("api/v1/metrics/[controller]")] // Route becomes /api/v1/metrics/query
    public class QueryController : ControllerBase
    {
        private readonly IDataRepository _dataRepository;
        private readonly ICachingService _cachingService;
        private readonly ILogger<QueryController> _logger;

        public QueryController(IDataRepository dataRepository, ICachingService cachingService, ILogger<QueryController> logger)
        {
            _dataRepository = dataRepository;
            _cachingService = cachingService;
            _logger = logger;
        }

        [HttpGet]
        [ProducesResponseType(typeof(QueryApiSuccessResponse<MetricQueryResult>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status500InternalServerError)]
        [ProducesResponseType(typeof(QueryApiErrorResponse), StatusCodes.Status501NotImplemented)]
        public async Task<IActionResult> GetMetrics(
            [FromQuery] DateTimeOffset startTime,
            [FromQuery] DateTimeOffset endTime,
            [FromQuery] string? query = null, // This will be the full query string, e.g., "metricName=X&attr.Y=Z"
            [FromQuery] string? step = null,  // For future aggregation
            [FromQuery] string? aggregator = null, // For future aggregation
            [FromQuery] int limit = 100)
        {
            if (startTime == default || endTime == default || startTime >= endTime)
            {
                _logger.LogWarning("Invalid time range provided: StartTime={StartTime}, EndTime={EndTime}", startTime, endTime);
                return BadRequest(new QueryApiErrorResponse("Invalid time range. Ensure startTime and endTime are valid and startTime is before endTime.", "InvalidInput"));
            }

            var criteria = new MetricQueryCriteria
            {
                StartTime = startTime,
                EndTime = endTime,
                Query = query ?? string.Empty,
                Step = step,
                Aggregator = aggregator,
                Limit = Math.Max(1, Math.Min(limit, 5000)) // Cap limit
            };
            
             _logger.LogInformation("Querying metrics with criteria: {@Criteria}", criteria);

            // Cache key generation - ensure criteria is consistently serialized
            // Using a simpler key for MVP, consider more robust hashing for complex criteria
            string cacheKey = $"metricsqueryV2-{criteria.StartTime:O}-{criteria.EndTime:O}-{criteria.Query}-{criteria.Step}-{criteria.Aggregator}-{criteria.Limit}";
            
            MetricQueryResult? cachedResult = null;
            try
            {
                 cachedResult = await _cachingService.GetAsync<MetricQueryResult>(cacheKey, HttpContext.RequestAborted);
            }
            catch(Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get from cache for key {CacheKey}. Will proceed without cache.", cacheKey);
            }


            if (cachedResult != null)
            {
                _logger.LogInformation("Cache hit for metrics query: {CacheKey}", cacheKey);
                return Ok(new QueryApiSuccessResponse<MetricQueryResult>(cachedResult));
            }

            _logger.LogInformation("Cache miss for metrics query: {CacheKey}. Fetching from repository.", cacheKey);
            try
            {
                var resultFromRepo = await _dataRepository.QueryMetricsAsync(criteria, HttpContext.RequestAborted);

                if (resultFromRepo != null) // MetricQueryResult itself doesn't have a "Status" field anymore
                {
                    try
                    {
                        await _cachingService.SetAsync(cacheKey, resultFromRepo, TimeSpan.FromMinutes(1), cancellationToken: HttpContext.RequestAborted); // Cache for 1 minute
                        _logger.LogInformation("Metrics query result cached for key: {CacheKey}", cacheKey);
                    }
                     catch(Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to set cache for key {CacheKey}.", cacheKey);
                    }
                     return Ok(new QueryApiSuccessResponse<MetricQueryResult>(resultFromRepo));
                }
                // This case should ideally not be hit if repository always returns a valid MetricQueryResult (even if empty)
                // or throws an exception for actual errors.
                _logger.LogWarning("Repository returned null for metrics query with criteria: {@Criteria}", criteria);
                return StatusCode(StatusCodes.Status500InternalServerError, 
                                  new QueryApiErrorResponse("Failed to retrieve metrics.", "RepositoryError"));
            }
            catch (NotImplementedException nie)
            {
                _logger.LogError(nie, "A data repository feature is not implemented.");
                return StatusCode(StatusCodes.Status501NotImplemented, new QueryApiErrorResponse(nie.Message, "NotImplemented"));
            }
            catch (ArgumentException aex) // Catch specific exceptions from repository if it validates query
            {
                _logger.LogError(aex, "Invalid query argument for metrics query.");
                return BadRequest(new QueryApiErrorResponse(aex.Message, "InvalidQuery", criteria.Query));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error querying metrics.");
                return StatusCode(StatusCodes.Status500InternalServerError, 
                                  new QueryApiErrorResponse("An error occurred while querying metrics.", "InternalServerError", ex.Message));
            }
        }
    }