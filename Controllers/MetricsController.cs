using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MetricsApp.Data;
using MetricsApp.Models;
using MetricsApp.Services;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System;

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
        private const string MetricsSummaryCacheKey = "metrics_summary";
        private const string MetricTypesOverviewCacheKey = "metric_types_overview";

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

            // Invalidate relevant caches
            await _cacheService.RemoveAsync(AllMetricsCacheKey);
            await _cacheService.RemoveAsync(MetricsSummaryCacheKey); // Invalidate summary KPIs
            await _cacheService.RemoveAsync(MetricTypesOverviewCacheKey); // Invalidate overview page data
            // Consider more granular cache invalidation for filtered results if performance becomes an issue

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
                // Normalize date formats for consistent cache keys
                string start = startDate.HasValue ? startDate.Value.ToUniversalTime().ToString("o") : "null";
                string end = endDate.HasValue ? endDate.Value.ToUniversalTime().ToString("o") : "null";
                cacheKey = $"{FilteredMetricsCacheKeyPrefix}{serverName}_{environment}_{metricType}_{start}_{end}";
            }

            var cachedMetrics = await _cacheService.GetAsync<List<MetricItem>>(cacheKey);
            if (cachedMetrics != null)
            {
                return Ok(cachedMetrics);
            }

            IQueryable<MetricItem> query = _context.MetricItems.AsQueryable();

            if (!string.IsNullOrEmpty(serverName))
            {
                query = query.Where(m => m.ServerName != null && m.ServerName.Contains(serverName));
            }
            if (!string.IsNullOrEmpty(environment))
            {
                query = query.Where(m => m.Environment == environment);
            }
            if (!string.IsNullOrEmpty(metricType))
            {
                query = query.Where(m => m.MetricType != null && m.MetricType.Contains(metricType));
            }
            if (startDate.HasValue)
            {
                query = query.Where(m => m.Timestamp >= startDate.Value.ToUniversalTime());
            }
            if (endDate.HasValue)
            {
                query = query.Where(m => m.Timestamp <= endDate.Value.ToUniversalTime());
            }

            var metrics = await query.OrderByDescending(m => m.Timestamp).Take(1000).ToListAsync(); // Limit results for performance
            
            await _cacheService.SetAsync(cacheKey, metrics, TimeSpan.FromMinutes(5));

            return Ok(metrics);
        }

        // GET: api/Metrics/5
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

        // GET: api/Metrics/summary
        [HttpGet("summary")]
        public async Task<ActionResult<object>> GetMetricsSummary()
        {
            var cachedSummary = await _cacheService.GetAsync<object>(MetricsSummaryCacheKey);
            if (cachedSummary != null)
            {
                return Ok(cachedSummary);
            }

            var totalMetrics = await _context.MetricItems.CountAsync();
            var uniqueServers = await _context.MetricItems.Select(m => m.ServerName).Distinct().CountAsync();
            var uniqueMetricTypes = await _context.MetricItems.Select(m => m.MetricType).Distinct().CountAsync();
            var lastMetricTime = await _context.MetricItems.OrderByDescending(m => m.Timestamp).Select(m => m.Timestamp).FirstOrDefaultAsync();

            var summary = new
            {
                TotalMetrics = totalMetrics,
                UniqueServers = uniqueServers,
                UniqueMetricTypes = uniqueMetricTypes,
                LastMetricTime = lastMetricTime == DateTime.MinValue ? (DateTime?)null : lastMetricTime
            };

            await _cacheService.SetAsync(MetricsSummaryCacheKey, summary, TimeSpan.FromMinutes(1)); 
            return Ok(summary);
        }

        // GET: api/Metrics/overview
        [HttpGet("overview")]
        public async Task<ActionResult<IEnumerable<object>>> GetMetricTypesOverview()
        {
            var cachedOverview = await _cacheService.GetAsync<List<object>>(MetricTypesOverviewCacheKey);
            if (cachedOverview != null)
            {
                return Ok(cachedOverview);
            }

            var overview = await _context.MetricItems
                .GroupBy(m => m.MetricType)
                .Select(g => new
                {
                    MetricType = g.Key,
                    Quantity = g.Count(),
                    LastUpdateTime = g.Max(m => m.Timestamp)
                })
                .OrderBy(o => o.MetricType)
                .ToListAsync<object>();
            
            await _cacheService.SetAsync(MetricTypesOverviewCacheKey, overview, TimeSpan.FromMinutes(5));
            return Ok(overview);
        }

        // GET: api/Metrics/distribution/environment
        [HttpGet("distribution/environment")]
        public async Task<ActionResult<IEnumerable<object>>> GetMetricsByEnvironment()
        {
            // This could be cached similarly if needed
            var distribution = await _context.MetricItems
                .GroupBy(m => m.Environment)
                .Select(g => new { Name = g.Key ?? "Unknown", Count = g.Count() })
                .ToListAsync<object>();
            return Ok(distribution);
        }

        // GET: api/Metrics/distribution/type
        [HttpGet("distribution/type")]
        public async Task<ActionResult<IEnumerable<object>>> GetMetricsCountByType()
        {
            var distribution = await _context.MetricItems
                .GroupBy(m => m.MetricType)
                .Select(g => new { Name = g.Key ?? "Unknown", Count = g.Count() })
                .OrderByDescending(g => g.Count)
                .Take(10) // Top 10 for chart readability
                .ToListAsync<object>();
            return Ok(distribution);
        }

        // GET: api/Metrics/distribution/server
        [HttpGet("distribution/server")]
        public async Task<ActionResult<IEnumerable<object>>> GetMetricsCountByServer()
        {
            var distribution = await _context.MetricItems
                .GroupBy(m => m.ServerName)
                .Select(g => new { Name = g.Key ?? "Unknown", Count = g.Count() })
                .OrderByDescending(g => g.Count)
                .Take(10) // Top 10 for chart readability
                .ToListAsync<object>();
            return Ok(distribution);
        }

        // GET: api/Metrics/breakdown
        [HttpGet("breakdown")]
        public async Task<ActionResult<IEnumerable<object>>> GetMetricsBreakdown()
        {
            // This is an alias for the overview endpoint to support the new analytics dashboard
            return await GetMetricTypesOverview();
        }

        // GET: api/Metrics/alerts/summary
        [HttpGet("alerts/summary")]
        public async Task<ActionResult<object>> GetAlertsSummary()
        {
            // For now, return mock alert data until a proper alerting system is implemented
            // In a real application, this would query an alerts database or monitoring system
            
            var alertsSummary = new
            {
                ActiveAlerts = 2, // Mock data - would be dynamically calculated
                CriticalAlerts = 0,
                WarningAlerts = 2,
                InfoAlerts = 0,
                LastAlertTime = DateTime.UtcNow.AddMinutes(-15), // Mock recent alert
                AlertsLast24Hours = 5,
                AlertsResolved = 3
            };

            return Ok(alertsSummary);
        }

        // GET: api/Metrics/recent-alerts
        [HttpGet("recent-alerts")]
        public Task<ActionResult<IEnumerable<object>>> GetRecentAlerts()
        {
            // Mock recent alerts data - in a real application this would come from an alerts service
            var recentAlerts = new[]
            {
                new
                {
                    Id = 1,
                    Severity = "warning",
                    Message = "High CPU usage detected on PROD-WEB-01",
                    Timestamp = DateTime.UtcNow.AddMinutes(-5),
                    ServerName = "PROD-WEB-01",
                    MetricType = "CPUUsage",
                    Value = 85.5,
                    Threshold = 80,
                    Acknowledged = false
                },
                new
                {
                    Id = 2,
                    Severity = "info",
                    Message = "Memory usage returned to normal on DEV-DB-02",
                    Timestamp = DateTime.UtcNow.AddMinutes(-15),
                    ServerName = "DEV-DB-02",
                    MetricType = "MemoryUsage",
                    Value = 65.0,
                    Threshold = 85,
                    Acknowledged = true
                },
                new
                {
                    Id = 3,
                    Severity = "warning",
                    Message = "Disk space running low on PROD-APP-03",
                    Timestamp = DateTime.UtcNow.AddHours(-2),
                    ServerName = "PROD-APP-03",
                    MetricType = "DiskUsage",
                    Value = 88.2,
                    Threshold = 85,
                    Acknowledged = false
                }
            };

            return Task.FromResult<ActionResult<IEnumerable<object>>>(Ok(recentAlerts));
        }
    }
}

