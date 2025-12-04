using MetricsApp.Abstractions.Plugins;
using MetricsApp.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace MetricsApp.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class PluginsController : ControllerBase
{
    private readonly IPluginManager _pluginManager;
    private readonly string _pluginsRoot;

    public PluginsController(IPluginManager pluginManager, IHostEnvironment env)
    {
        _pluginManager = pluginManager;
        _pluginsRoot = Path.Combine(AppContext.BaseDirectory, "Plugins");
    }

    /// <summary>
    /// Get all plugins (for tiling in the UI)
    /// </summary>
    [HttpGet]
    public IActionResult GetPlugins()
    {
        var summaries = _pluginManager
            .LoadManifests(_pluginsRoot)
            .Select(m => new PluginSummaryDto
            {
                PluginId = m.PluginId,
                Name = m.Name,
                Version = m.Version,
                Type = m.Type,
                Title = m.Title,
                Description = m.Description,
                Tags = m.Tags ?? new List<string>(),
                HasFrontend = !string.IsNullOrWhiteSpace(m.Entry.FrontendBundle)
            })
            .ToList();

        return Ok(summaries);
    }

    /// <summary>
    /// Get only front-end/UI plugins (dashboards, setup screens, etc.)
    /// </summary>
    [HttpGet("frontend")]
    public IActionResult GetFrontendPlugins()
    {
        var manifests = _pluginManager
            .LoadManifests(_pluginsRoot)
            .Where(m => m.Type == PluginType.Dashboard || m.Type == PluginType.Setup)
            .Select(m => new FrontendPluginDefinition
            {
                PluginId = m.PluginId,
                Name = m.Name,
                Version = m.Version,
                MountPointId = m.PluginId,
                BundleUrl = m.Entry.FrontendBundle
            })
            .ToList();

        return Ok(manifests);
    }

    /// <summary>
    /// Get the full manifest for a single plugin
    /// </summary>
    [HttpGet("{pluginId}")]
    public IActionResult GetPlugin(string pluginId)
    {
        var manifest = _pluginManager
            .LoadManifests(_pluginsRoot)
            .FirstOrDefault(m =>
                string.Equals(m.PluginId, pluginId, StringComparison.OrdinalIgnoreCase));

        if (manifest == null)
            return NotFound();

        return Ok(manifest);
    }
}
