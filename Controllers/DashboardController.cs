using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MetricsApp.Data;
using MetricsApp.Models;
using MetricsApp.Services;
using System.ComponentModel.DataAnnotations;

namespace MetricsApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly MetricsDbContext _context;
        private readonly ICacheService _cacheService;
        private const string DashboardConfigCacheKey = "dashboard_configs";

        public DashboardController(MetricsDbContext context, ICacheService cacheService)
        {
            _context = context;
            _cacheService = cacheService;
        }

        // GET: api/Dashboard/configs
        [HttpGet("configs")]
        public async Task<ActionResult<IEnumerable<DashboardConfig>>> GetDashboardConfigs()
        {
            var configs = await _context.DashboardConfigs
                .OrderByDescending(d => d.IsDefault)
                .ThenByDescending(d => d.LastModified)
                .ToListAsync();
            
            return Ok(configs);
        }

        // GET: api/Dashboard/configs/{id}
        [HttpGet("configs/{id}")]
        public async Task<ActionResult<DashboardConfig>> GetDashboardConfig(int id)
        {
            var config = await _context.DashboardConfigs.FindAsync(id);
            if (config == null)
            {
                return NotFound();
            }
            return Ok(config);
        }

        // GET: api/Dashboard/configs/default
        [HttpGet("configs/default")]
        public async Task<ActionResult<DashboardConfig>> GetDefaultDashboardConfig()
        {
            var defaultConfig = await _context.DashboardConfigs
                .FirstOrDefaultAsync(d => d.IsDefault);
            
            if (defaultConfig == null)
            {
                // Return a sensible default if none exists
                defaultConfig = new DashboardConfig
                {
                    Name = "Default Dashboard",
                    Layout = "2x1",
                    Widgets = """
                    [
                        {"id":"timeline","type":"timeline","position":0,"title":"Metric Timeline"},
                        {"id":"environment","type":"donut","position":1,"title":"Environment Distribution"}
                    ]
                    """,
                    Settings = """
                    {
                        "refreshInterval": 60,
                        "theme": "auto",
                        "fullscreen": true
                    }
                    """,
                    IsDefault = true
                };
            }
            
            return Ok(defaultConfig);
        }

        // POST: api/Dashboard/configs
        [HttpPost("configs")]
        public async Task<ActionResult<DashboardConfig>> CreateDashboardConfig(CreateDashboardRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // If this is being set as default, unset any existing default
            if (request.IsDefault)
            {
                var existingDefaults = await _context.DashboardConfigs
                    .Where(d => d.IsDefault)
                    .ToListAsync();
                
                foreach (var existing in existingDefaults)
                {
                    existing.IsDefault = false;
                }
            }

            var config = new DashboardConfig
            {
                Name = request.Name,
                Layout = request.Layout,
                Widgets = request.Widgets,
                Settings = request.Settings,
                IsDefault = request.IsDefault,
                CreatedAt = DateTime.UtcNow,
                LastModified = DateTime.UtcNow
            };

            _context.DashboardConfigs.Add(config);
            await _context.SaveChangesAsync();

            // Invalidate cache
            await _cacheService.RemoveAsync(DashboardConfigCacheKey);

            return CreatedAtAction(nameof(GetDashboardConfig), new { id = config.Id }, config);
        }

        // PUT: api/Dashboard/configs/{id}
        [HttpPut("configs/{id}")]
        public async Task<IActionResult> UpdateDashboardConfig(int id, UpdateDashboardRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var config = await _context.DashboardConfigs.FindAsync(id);
            if (config == null)
            {
                return NotFound();
            }

            // If this is being set as default, unset any existing default
            if (request.IsDefault && !config.IsDefault)
            {
                var existingDefaults = await _context.DashboardConfigs
                    .Where(d => d.IsDefault && d.Id != id)
                    .ToListAsync();
                
                foreach (var existing in existingDefaults)
                {
                    existing.IsDefault = false;
                }
            }

            config.Name = request.Name;
            config.Layout = request.Layout;
            config.Widgets = request.Widgets;
            config.Settings = request.Settings;
            config.IsDefault = request.IsDefault;
            config.LastModified = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Invalidate cache
            await _cacheService.RemoveAsync(DashboardConfigCacheKey);

            return Ok(config);
        }

        // DELETE: api/Dashboard/configs/{id}
        [HttpDelete("configs/{id}")]
        public async Task<IActionResult> DeleteDashboardConfig(int id)
        {
            var config = await _context.DashboardConfigs.FindAsync(id);
            if (config == null)
            {
                return NotFound();
            }

            // Don't allow deleting the default dashboard
            if (config.IsDefault)
            {
                return BadRequest("Cannot delete the default dashboard configuration");
            }

            _context.DashboardConfigs.Remove(config);
            await _context.SaveChangesAsync();

            // Invalidate cache
            await _cacheService.RemoveAsync(DashboardConfigCacheKey);

            return NoContent();
        }

        // POST: api/Dashboard/configs/{id}/set-default
        [HttpPost("configs/{id}/set-default")]
        public async Task<IActionResult> SetDefaultDashboard(int id)
        {
            var config = await _context.DashboardConfigs.FindAsync(id);
            if (config == null)
            {
                return NotFound();
            }

            // Unset existing defaults
            var existingDefaults = await _context.DashboardConfigs
                .Where(d => d.IsDefault)
                .ToListAsync();
            
            foreach (var existing in existingDefaults)
            {
                existing.IsDefault = false;
            }

            config.IsDefault = true;
            config.LastModified = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Invalidate cache
            await _cacheService.RemoveAsync(DashboardConfigCacheKey);

            return Ok(config);
        }
    }

    public class CreateDashboardRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = "";

        [Required]
        public string Layout { get; set; } = "";

        [Required]
        public string Widgets { get; set; } = "";

        public string Settings { get; set; } = "{}";

        public bool IsDefault { get; set; } = false;
    }

    public class UpdateDashboardRequest
    {
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = "";

        [Required]
        public string Layout { get; set; } = "";

        [Required]
        public string Widgets { get; set; } = "";

        public string Settings { get; set; } = "{}";

        public bool IsDefault { get; set; } = false;
    }
}

 