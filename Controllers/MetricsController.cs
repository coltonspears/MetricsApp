using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MetricsApp.Data;
using MetricsApp.Models;
using MetricsApp.Services;

namespace MetricsApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MetricsController : ControllerBase
    {
        private readonly MetricsDbContext _context;
        private readonly ICacheService _cacheService;
        private const string AllMetricsCacheKey = "all_metrics";
        private const string FilteredMetricsCacheKeyPrefix = "filtered_metrics_";

        public MetricsController(MetricsDbContext context, ICacheService cacheService)
        {
            _context = context;
            _cacheService = cacheService;
        }

        // POST: api/Metrics
        [HttpPost]
        public async Task<ActionResult<MetricItem>> PostMetricItem(MetricItem metricItem)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            metricItem.Timestamp = DateTime.UtcNow;
            _context.MetricItems.Add(metricItem);
            await _context.SaveChangesAsync();

            // Invalidate cache for all metrics and any potentially related filtered results
            await _cacheService.RemoveAsync(AllMetricsCacheKey); 
            // More sophisticated cache invalidation for filtered results might be needed for production
            // For now, we can assume a simple prefix based removal or rely on TTL for filtered results
            // A more robust approach would involve tracking active filter keys or using tagged cache entries if supported.

            return CreatedAtAction(nameof(GetMetricItem), new { id = metricItem.Id }, metricItem);
        }

        // GET: api/Metrics
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MetricItem>>> GetMetricItems(
            [FromQuery] string? serverName, 
            [FromQuery] string? environment, 
            [FromQuery] string? metricType,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            string cacheKey = AllMetricsCacheKey;
            bool isFiltered = !string.IsNullOrEmpty(serverName) || 
                              !string.IsNullOrEmpty(environment) || 
                              !string.IsNullOrEmpty(metricType) ||
                              startDate.HasValue ||
                              endDate.HasValue;

            if (isFiltered)
            {
                cacheKey = $"{FilteredMetricsCacheKeyPrefix}{serverName}_{environment}_{metricType}_{startDate:yyyyMMddHHmmss}_{endDate:yyyyMMddHHmmss}";
            }

            var cachedMetrics = await _cacheService.GetAsync<List<MetricItem>>(cacheKey);
            if (cachedMetrics != null)
            {
                return Ok(cachedMetrics);
            }

            IQueryable<MetricItem> query = _context.MetricItems.AsQueryable();

            if (!string.IsNullOrEmpty(serverName))
            {
                query = query.Where(m => m.ServerName == serverName);
            }
            if (!string.IsNullOrEmpty(environment))
            {
                query = query.Where(m => m.Environment == environment);
            }
            if (!string.IsNullOrEmpty(metricType))
            {
                query = query.Where(m => m.MetricType == metricType);
            }
            if (startDate.HasValue)
            {
                query = query.Where(m => m.Timestamp >= startDate.Value.ToUniversalTime());
            }
            if (endDate.HasValue)
            {
                query = query.Where(m => m.Timestamp <= endDate.Value.ToUniversalTime());
            }

            var metrics = await query.OrderByDescending(m => m.Timestamp).ToListAsync();
            
            // Cache the result with a sliding expiration (e.g., 5 minutes)
            await _cacheService.SetAsync(cacheKey, metrics, TimeSpan.FromMinutes(5));

            return Ok(metrics);
        }

        // GET: api/Metrics/5
        // This is a helper for the POST CreatedAtAction, not typically used directly by the frontend for general metrics display
        [HttpGet("{id}")]
        public async Task<ActionResult<MetricItem>> GetMetricItem(int id)
        {
            var metricItem = await _context.MetricItems.FindAsync(id);

            if (metricItem == null)
            {
                return NotFound();
            }

            return metricItem;
        }
    }
}
