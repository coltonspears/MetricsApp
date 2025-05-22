using Microsoft.AspNetCore.Mvc;
using MetricsApp.Models;
using System.Text.Json;
using System.IO;
using Microsoft.Extensions.Hosting;

namespace MetricsApp.Controllers
{

[Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly string _settingsFilePath;

        public SettingsController(IWebHostEnvironment env)
        {
            _settingsFilePath = Path.Combine(env.ContentRootPath, "applicationSettings.json");
        }

        // GET: api/Settings
        [HttpGet]
        public async Task<ActionResult<ApplicationSettings>> GetSettings()
        {
            try
            {
                if (!System.IO.File.Exists(_settingsFilePath))
                {
                    // Return default settings if file doesn't exist
                    return new ApplicationSettings();
                }

                var json = await System.IO.File.ReadAllTextAsync(_settingsFilePath);
                var settings = JsonSerializer.Deserialize<ApplicationSettings>(json);
                return settings == null ? NotFound("Settings could not be loaded.") : Ok(settings);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error reading settings: {ex.Message}");
                return StatusCode(500, "An error occurred while retrieving settings.");
            }
        }

        // POST: api/Settings
        [HttpPost]
        public async Task<IActionResult> UpdateSettings([FromBody] ApplicationSettings? settings)
        {
            if (settings == null)
            {
                return BadRequest("Settings cannot be null.");
            }

            try
            {
                var json = JsonSerializer.Serialize(settings, new JsonSerializerOptions { WriteIndented = true });
                await System.IO.File.WriteAllTextAsync(_settingsFilePath, json);
                return Ok(new { message = "Settings updated successfully." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error writing settings: {ex.Message}");
                return StatusCode(500, "An error occurred while updating settings.");
            }
        }
    }
}