using MetricsApp.Abstractions.Plugins;
using MetricsApp.Abstractions.Plugins.Capabilities;
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
    /// Get all plugins (for tiling in the UI).
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
                Capabilities = m.Capabilities,
                Title = m.Title ?? m.Name,
                Description = m.Description ?? string.Empty,
                Tags = m.Tags ?? new List<string>(),
                HasFrontend = !string.IsNullOrWhiteSpace(m.Entry?.FrontendBundle)
            })
            .ToList();

        return Ok(summaries);
    }

    /// <summary>
    /// Get only front-end/UI plugins (dashboards, setup screens, etc.).
    /// </summary>
    [HttpGet("frontend")]
    public IActionResult GetFrontendPlugins()
    {
        var manifests = _pluginManager
            .LoadManifests(_pluginsRoot)
            .Where(m => m.Capabilities.Contains("dashboard") || m.Capabilities.Contains("setup") || m.Capabilities.Contains("routes"))
            .Select(m => new FrontendPluginDefinition
            {
                PluginId = m.PluginId,
                Name = m.Name,
                Version = m.Version,
                MountPointId = m.PluginId,
                BundleUrl = m.Entry?.FrontendBundle
            })
            .ToList();

        return Ok(manifests);
    }

    /// <summary>
    /// Get the full manifest for a single plugin.
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

    /// <summary>
    /// Get all loaded plugins with their current state.
    /// </summary>
    [HttpGet("loaded")]
    public IActionResult GetLoadedPlugins()
    {
        var loaded = _pluginManager.LoadedPlugins.Values
            .Select(p => new
            {
                PluginId = p.Manifest.PluginId,
                Name = p.Manifest.Name,
                Version = p.Manifest.Version,
                Title = p.Manifest.Title,
                Description = p.Manifest.Description,
                Capabilities = p.Manifest.Capabilities,
                State = p.State.ToString(),
                Error = p.Error,
                HasFrontend = !string.IsNullOrWhiteSpace(p.Manifest.Entry?.FrontendBundle)
            })
            .ToList();

        return Ok(loaded);
    }

    /// <summary>
    /// Get plugins that provide a specific capability.
    /// </summary>
    [HttpGet("capability/{capability}")]
    public IActionResult GetPluginsByCapability(string capability)
    {
        var plugins = _pluginManager.LoadedPlugins.Values
            .Where(p => p.Manifest.Capabilities.Contains(capability, StringComparer.OrdinalIgnoreCase))
            .Select(p => new
            {
                PluginId = p.Manifest.PluginId,
                Name = p.Manifest.Name,
                Version = p.Manifest.Version,
                Title = p.Manifest.Title,
                Description = p.Manifest.Description,
                Capabilities = p.Manifest.Capabilities,
                State = p.State.ToString()
            })
            .ToList();

        return Ok(plugins);
    }

    /// <summary>
    /// Get all available data sources from plugins.
    /// </summary>
    [HttpGet("datasources")]
    public IActionResult GetDataSourcePlugins()
    {
        var dataSources = _pluginManager.GetCapabilities<IDataSourceCapability>()
            .Select(ds => new
            {
                Type = ds.DataSourceType,
                DisplayName = ds.DisplayName,
                Description = ds.Description,
                Icon = ds.IconName,
                Categories = ds.Categories
            })
            .ToList();

        return Ok(dataSources);
    }

    /// <summary>
    /// Get all available dashboard panels from plugins.
    /// </summary>
    [HttpGet("panels")]
    public IActionResult GetDashboardPanels()
    {
        var panels = _pluginManager.GetCapabilities<IDashboardCapability>()
            .SelectMany(dc => dc.GetPanelTypes())
            .Select(p => new
            {
                Type = p.Type,
                DisplayName = p.DisplayName,
                Description = p.Description,
                Icon = p.IconName,
                DefaultSize = p.DefaultSize
            })
            .ToList();

        return Ok(panels);
    }
}
