using MetricsApp.Core.Models.Dashboard;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Concurrent;
using System.Text.Json;

namespace MetricsApp.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class DashboardsController : ControllerBase
{
    // In-memory stores (replace with proper repository in production)
    private static readonly ConcurrentDictionary<string, DashboardTemplate> Templates = new();
    private static readonly ConcurrentDictionary<string, DashboardInstance> Instances = new();
    private static readonly ConcurrentDictionary<string, DashboardFolder> Folders = new();
    private static readonly ConcurrentDictionary<string, List<DashboardVersion>> Versions = new();

    public DashboardsController()
    {
        // Seed with some default templates if empty
        if (Templates.IsEmpty)
        {
            SeedDefaultTemplates();
        }
    }

    #region Templates

    /// <summary>
    /// Get all dashboard templates
    /// </summary>
    [HttpGet("templates")]
    public IActionResult GetTemplates(
        [FromQuery] string? category = null,
        [FromQuery] string? search = null,
        [FromQuery] List<string>? tags = null)
    {
        var templates = Templates.Values.AsQueryable();

        if (!string.IsNullOrWhiteSpace(category))
        {
            templates = templates.Where(t => t.Category == category);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            // Avoid null-propagation inside expression-tree lambda
            templates = templates.Where(t =>
                t.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (t.Description != null && t.Description.Contains(search, StringComparison.OrdinalIgnoreCase)));
        }

        if (tags?.Any() == true)
        {
            templates = templates.Where(t => tags.Any(tag => t.Tags.Contains(tag)));
        }

        return Ok(templates.Where(t => t.IsPublished).OrderBy(t => t.Name).ToList());
    }

    /// <summary>
    /// Get a specific template by ID
    /// </summary>
    [HttpGet("templates/{templateId}")]
    public IActionResult GetTemplate(string templateId)
    {
        if (!Templates.TryGetValue(templateId, out var template))
        {
            return NotFound(new { error = "Template not found" });
        }

        return Ok(template);
    }

    /// <summary>
    /// Create a new template
    /// </summary>
    [HttpPost("templates")]
    public IActionResult CreateTemplate([FromBody] DashboardTemplate template)
    {
        template.Id = Guid.NewGuid().ToString();
        template.CreatedAt = DateTime.UtcNow;
        template.UpdatedAt = DateTime.UtcNow;

        if (!Templates.TryAdd(template.Id, template))
        {
            return Conflict(new { error = "Failed to create template" });
        }

        return CreatedAtAction(nameof(GetTemplate), new { templateId = template.Id }, template);
    }

    /// <summary>
    /// Update a template
    /// </summary>
    [HttpPut("templates/{templateId}")]
    public IActionResult UpdateTemplate(string templateId, [FromBody] DashboardTemplate template)
    {
        if (!Templates.TryGetValue(templateId, out var existing))
        {
            return NotFound(new { error = "Template not found" });
        }

        if (existing.IsSystem)
        {
            return BadRequest(new { error = "Cannot modify system templates" });
        }

        template.Id = templateId;
        template.CreatedAt = existing.CreatedAt;
        template.UpdatedAt = DateTime.UtcNow;

        Templates[templateId] = template;
        return Ok(template);
    }

    /// <summary>
    /// Delete a template
    /// </summary>
    [HttpDelete("templates/{templateId}")]
    public IActionResult DeleteTemplate(string templateId)
    {
        if (!Templates.TryGetValue(templateId, out var template))
        {
            return NotFound(new { error = "Template not found" });
        }

        if (template.IsSystem)
        {
            return BadRequest(new { error = "Cannot delete system templates" });
        }

        Templates.TryRemove(templateId, out _);
        return NoContent();
    }

    /// <summary>
    /// Get template categories
    /// </summary>
    [HttpGet("templates/categories")]
    public IActionResult GetTemplateCategories()
    {
        var categories = Templates.Values
            .Where(t => !string.IsNullOrWhiteSpace(t.Category))
            .Select(t => t.Category!)
            .Distinct()
            .OrderBy(c => c)
            .ToList();

        return Ok(categories);
    }

    #endregion

    #region Instances

    /// <summary>
    /// Get dashboard instances for a tenant
    /// </summary>
    [HttpGet("instances")]
    public IActionResult GetInstances(
        [FromQuery] string? tenantId = null,
        [FromQuery] string? appId = null,
        [FromQuery] string? folderId = null,
        [FromQuery] string? search = null,
        [FromQuery] bool? starred = null)
    {
        var instances = Instances.Values.AsQueryable();

        if (!string.IsNullOrWhiteSpace(tenantId))
        {
            instances = instances.Where(i => i.TenantId == tenantId);
        }

        if (!string.IsNullOrWhiteSpace(appId))
        {
            instances = instances.Where(i => i.AppId == appId);
        }

        if (!string.IsNullOrWhiteSpace(folderId))
        {
            instances = instances.Where(i => i.FolderId == folderId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            // Avoid null-propagation inside expression-tree lambda
            instances = instances.Where(i =>
                i.Name.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                (i.Description != null && i.Description.Contains(search, StringComparison.OrdinalIgnoreCase)));
        }

        if (starred.HasValue)
        {
            instances = instances.Where(i => i.IsStarred == starred.Value);
        }

        return Ok(instances.OrderByDescending(i => i.UpdatedAt).ToList());
    }

    /// <summary>
    /// Get a specific dashboard instance
    /// </summary>
    [HttpGet("instances/{instanceId}")]
    public IActionResult GetInstance(string instanceId)
    {
        if (!Instances.TryGetValue(instanceId, out var instance))
        {
            return NotFound(new { error = "Dashboard not found" });
        }

        return Ok(instance);
    }

    /// <summary>
    /// Get a dashboard instance by slug
    /// </summary>
    [HttpGet("instances/by-slug/{tenantId}/{slug}")]
    public IActionResult GetInstanceBySlug(string tenantId, string slug)
    {
        var instance = Instances.Values
            .FirstOrDefault(i => i.TenantId == tenantId && i.Slug == slug);

        if (instance == null)
        {
            return NotFound(new { error = "Dashboard not found" });
        }

        return Ok(instance);
    }

    /// <summary>
    /// Create a new dashboard instance from a template
    /// </summary>
    [HttpPost("instances/from-template")]
    public IActionResult CreateFromTemplate([FromBody] CreateFromTemplateRequest request)
    {
        if (!Templates.TryGetValue(request.TemplateId, out var template))
        {
            return NotFound(new { error = "Template not found" });
        }

        var instance = new DashboardInstance
        {
            Id = Guid.NewGuid().ToString(),
            TenantId = request.TenantId,
            AppId = request.AppId,
            Name = request.Name ?? template.Name,
            Description = request.Description ?? template.Description,
            Slug = GenerateSlug(request.Name ?? template.Name),
            TemplateId = template.Id,
            TemplateVersion = template.Version,
            OwnerId = request.OwnerId,
            FolderId = request.FolderId,
            Tags = request.Tags ?? template.Tags.ToList(),
            VariableValues = request.VariableValues ?? new Dictionary<string, DashboardVariableValue>(),
            TimeRange = template.DefaultTimeRange,
            RefreshIntervalSeconds = template.RefreshIntervalSeconds,
            SyncWithTemplate = request.SyncWithTemplate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Initialize default variable values from template
        foreach (var variable in template.Variables)
        {
            if (!instance.VariableValues.ContainsKey(variable.Name))
            {
                instance.VariableValues[variable.Name] = new DashboardVariableValue
                {
                    Value = variable.DefaultValue ?? string.Empty,
                    IsDefault = true
                };
            }
        }

        if (!Instances.TryAdd(instance.Id, instance))
        {
            return Conflict(new { error = "Failed to create dashboard" });
        }

        return CreatedAtAction(nameof(GetInstance), new { instanceId = instance.Id }, instance);
    }

    /// <summary>
    /// Create a new standalone dashboard instance
    /// </summary>
    [HttpPost("instances")]
    public IActionResult CreateInstance([FromBody] DashboardInstance instance)
    {
        instance.Id = Guid.NewGuid().ToString();
        instance.Slug = GenerateSlug(instance.Name);
        instance.Version = 1;
        instance.CreatedAt = DateTime.UtcNow;
        instance.UpdatedAt = DateTime.UtcNow;

        if (!Instances.TryAdd(instance.Id, instance))
        {
            return Conflict(new { error = "Failed to create dashboard" });
        }

        // Save initial version
        SaveVersion(instance, "Initial creation");

        return CreatedAtAction(nameof(GetInstance), new { instanceId = instance.Id }, instance);
    }

    /// <summary>
    /// Update a dashboard instance
    /// </summary>
    [HttpPut("instances/{instanceId}")]
    public IActionResult UpdateInstance(string instanceId, [FromBody] DashboardInstance instance, [FromQuery] string? message = null)
    {
        if (!Instances.TryGetValue(instanceId, out var existing))
        {
            return NotFound(new { error = "Dashboard not found" });
        }

        instance.Id = instanceId;
        instance.TenantId = existing.TenantId;
        instance.CreatedAt = existing.CreatedAt;
        instance.Version = existing.Version + 1;
        instance.UpdatedAt = DateTime.UtcNow;
        instance.Slug = existing.Slug;

        Instances[instanceId] = instance;

        // Save version history
        SaveVersion(instance, message ?? "Updated dashboard");

        return Ok(instance);
    }

    /// <summary>
    /// Partial update (PATCH) for dashboard
    /// </summary>
    [HttpPatch("instances/{instanceId}")]
    public IActionResult PatchInstance(string instanceId, [FromBody] DashboardPatchRequest patch)
    {
        if (!Instances.TryGetValue(instanceId, out var instance))
        {
            return NotFound(new { error = "Dashboard not found" });
        }

        if (patch.Name != null) instance.Name = patch.Name;
        if (patch.Description != null) instance.Description = patch.Description;
        if (patch.Tags != null) instance.Tags = patch.Tags;
        if (patch.FolderId != null) instance.FolderId = patch.FolderId;
        if (patch.IsStarred.HasValue) instance.IsStarred = patch.IsStarred.Value;
        if (patch.TimeRange != null) instance.TimeRange = patch.TimeRange;
        if (patch.RefreshIntervalSeconds.HasValue) instance.RefreshIntervalSeconds = patch.RefreshIntervalSeconds;
        if (patch.Panels != null)
        {
            instance.Panels = patch.Panels;
            instance.Version++;
            SaveVersion(instance, patch.Message ?? "Panels updated");
        }
        if (patch.VariableValues != null)
        {
            foreach (var kv in patch.VariableValues)
            {
                instance.VariableValues[kv.Key] = kv.Value;
            }
        }

        instance.UpdatedAt = DateTime.UtcNow;
        instance.LastModifiedBy = patch.ModifiedBy;

        return Ok(instance);
    }

    /// <summary>
    /// Delete a dashboard instance
    /// </summary>
    [HttpDelete("instances/{instanceId}")]
    public IActionResult DeleteInstance(string instanceId)
    {
        if (!Instances.TryRemove(instanceId, out _))
        {
            return NotFound(new { error = "Dashboard not found" });
        }

        Versions.TryRemove(instanceId, out _);
        return NoContent();
    }

    /// <summary>
    /// Toggle star status
    /// </summary>
    [HttpPost("instances/{instanceId}/star")]
    public IActionResult ToggleStar(string instanceId)
    {
        if (!Instances.TryGetValue(instanceId, out var instance))
        {
            return NotFound(new { error = "Dashboard not found" });
        }

        instance.IsStarred = !instance.IsStarred;
        instance.UpdatedAt = DateTime.UtcNow;

        return Ok(new { isStarred = instance.IsStarred });
    }

    #endregion

    #region Versions

    /// <summary>
    /// Get version history for a dashboard
    /// </summary>
    [HttpGet("instances/{instanceId}/versions")]
    public IActionResult GetVersions(string instanceId)
    {
        if (!Instances.ContainsKey(instanceId))
        {
            return NotFound(new { error = "Dashboard not found" });
        }

        Versions.TryGetValue(instanceId, out var versions);
        return Ok(versions?.OrderByDescending(v => v.Version).ToList() ?? new List<DashboardVersion>());
    }

    /// <summary>
    /// Restore a specific version
    /// </summary>
    [HttpPost("instances/{instanceId}/versions/{version}/restore")]
    public IActionResult RestoreVersion(string instanceId, int version)
    {
        if (!Instances.TryGetValue(instanceId, out var instance))
        {
            return NotFound(new { error = "Dashboard not found" });
        }

        if (!Versions.TryGetValue(instanceId, out var versions))
        {
            return NotFound(new { error = "No version history found" });
        }

        var versionToRestore = versions.FirstOrDefault(v => v.Version == version);
        if (versionToRestore == null)
        {
            return NotFound(new { error = "Version not found" });
        }

        var restored = JsonSerializer.Deserialize<DashboardInstance>(versionToRestore.Data);
        if (restored == null)
        {
            return BadRequest(new { error = "Failed to restore version" });
        }

        restored.Id = instanceId;
        restored.Version = instance.Version + 1;
        restored.UpdatedAt = DateTime.UtcNow;

        Instances[instanceId] = restored;
        SaveVersion(restored, $"Restored from version {version}");

        return Ok(restored);
    }

    #endregion

    #region Folders

    /// <summary>
    /// Get folders for a tenant
    /// </summary>
    [HttpGet("folders")]
    public IActionResult GetFolders([FromQuery] string tenantId)
    {
        var folders = Folders.Values
            .Where(f => f.TenantId == tenantId)
            .OrderBy(f => f.SortOrder)
            .ThenBy(f => f.Name)
            .ToList();

        return Ok(folders);
    }

    /// <summary>
    /// Create a folder
    /// </summary>
    [HttpPost("folders")]
    public IActionResult CreateFolder([FromBody] DashboardFolder folder)
    {
        folder.Id = Guid.NewGuid().ToString();
        folder.CreatedAt = DateTime.UtcNow;
        folder.UpdatedAt = DateTime.UtcNow;

        if (!Folders.TryAdd(folder.Id, folder))
        {
            return Conflict(new { error = "Failed to create folder" });
        }

        return CreatedAtAction(nameof(GetFolders), new { tenantId = folder.TenantId }, folder);
    }

    /// <summary>
    /// Update a folder
    /// </summary>
    [HttpPut("folders/{folderId}")]
    public IActionResult UpdateFolder(string folderId, [FromBody] DashboardFolder folder)
    {
        if (!Folders.TryGetValue(folderId, out var existing))
        {
            return NotFound(new { error = "Folder not found" });
        }

        folder.Id = folderId;
        folder.TenantId = existing.TenantId;
        folder.CreatedAt = existing.CreatedAt;
        folder.UpdatedAt = DateTime.UtcNow;

        Folders[folderId] = folder;
        return Ok(folder);
    }

    /// <summary>
    /// Delete a folder
    /// </summary>
    [HttpDelete("folders/{folderId}")]
    public IActionResult DeleteFolder(string folderId, [FromQuery] bool moveContentsToRoot = true)
    {
        if (!Folders.TryRemove(folderId, out _))
        {
            return NotFound(new { error = "Folder not found" });
        }

        // Handle dashboards in this folder
        if (moveContentsToRoot)
        {
            foreach (var instance in Instances.Values.Where(i => i.FolderId == folderId))
            {
                instance.FolderId = null;
            }
        }

        return NoContent();
    }

    #endregion

    #region Export/Import

    /// <summary>
    /// Export a dashboard as JSON
    /// </summary>
    [HttpGet("instances/{instanceId}/export")]
    public IActionResult ExportDashboard(string instanceId)
    {
        if (!Instances.TryGetValue(instanceId, out var instance))
        {
            return NotFound(new { error = "Dashboard not found" });
        }

        // Create export format with resolved template
        var export = new DashboardExport
        {
            Instance = instance,
            Template = instance.TemplateId != null && Templates.TryGetValue(instance.TemplateId, out var t) ? t : null,
            ExportedAt = DateTime.UtcNow,
            Version = "1.0"
        };

        return Ok(export);
    }

    /// <summary>
    /// Import a dashboard from JSON
    /// </summary>
    [HttpPost("import")]
    public IActionResult ImportDashboard([FromBody] DashboardExport import, [FromQuery] string tenantId)
    {
        var instance = import.Instance;
        instance.Id = Guid.NewGuid().ToString();
        instance.TenantId = tenantId;
        instance.Slug = GenerateSlug(instance.Name);
        instance.Version = 1;
        instance.CreatedAt = DateTime.UtcNow;
        instance.UpdatedAt = DateTime.UtcNow;
        instance.TemplateId = null; // Don't link to original template

        // If template was included, also import it
        if (import.Template != null)
        {
            var template = import.Template;
            template.Id = Guid.NewGuid().ToString();
            template.IsSystem = false;
            template.CreatedAt = DateTime.UtcNow;
            template.UpdatedAt = DateTime.UtcNow;
            Templates.TryAdd(template.Id, template);
            instance.TemplateId = template.Id;
        }

        // Copy panels from template if instance doesn't have its own
        if (instance.Panels == null && import.Template != null)
        {
            instance.Panels = import.Template.Panels.ToList();
        }

        if (!Instances.TryAdd(instance.Id, instance))
        {
            return Conflict(new { error = "Failed to import dashboard" });
        }

        SaveVersion(instance, "Imported dashboard");

        return CreatedAtAction(nameof(GetInstance), new { instanceId = instance.Id }, instance);
    }

    #endregion

    #region Helpers

    private static void SaveVersion(DashboardInstance instance, string message)
    {
        var version = new DashboardVersion
        {
            Id = Guid.NewGuid().ToString(),
            DashboardId = instance.Id,
            Version = instance.Version,
            Message = message,
            Data = JsonSerializer.Serialize(instance),
            CreatedAt = DateTime.UtcNow
        };

        Versions.AddOrUpdate(
            instance.Id,
            new List<DashboardVersion> { version },
            (_, list) =>
            {
                list.Add(version);
                // Keep only last 50 versions
                if (list.Count > 50)
                {
                    list.RemoveRange(0, list.Count - 50);
                }
                return list;
            });
    }

    private static string GenerateSlug(string name)
    {
        var slug = name.ToLowerInvariant()
            .Replace(" ", "-")
            .Replace("_", "-");

        // Remove special characters
        slug = new string(slug.Where(c => char.IsLetterOrDigit(c) || c == '-').ToArray());

        // Ensure uniqueness
        var baseSlug = slug;
        var counter = 1;
        while (Instances.Values.Any(i => i.Slug == slug))
        {
            slug = $"{baseSlug}-{counter++}";
        }

        return slug;
    }

    private void SeedDefaultTemplates()
    {
        var templates = new[]
        {
            new DashboardTemplate
            {
                Id = "system-overview",
                Name = "System Overview",
                Description = "Monitor CPU, memory, disk, and network metrics for your infrastructure",
                Category = "Infrastructure",
                Tags = new List<string> { "infrastructure", "system", "monitoring" },
                IsSystem = true,
                RequiredDataSourceTypes = new List<string> { "prometheus", "opentelemetry" },
                Variables = new List<DashboardVariable>
                {
                    new() { Name = "datasource", Label = "Data Source", Type = DashboardVariableType.DataSource, AllowedDataSourceTypes = new List<string> { "prometheus", "opentelemetry" } },
                    new() { Name = "instance", Label = "Instance", Type = DashboardVariableType.Query, Query = "label_values(up, instance)", DataSourceRef = "$datasource" }
                },
                Panels = new List<DashboardPanel>
                {
                    new() { Id = "cpu", Title = "CPU Usage", Type = "timeseries", GridPos = new PanelGridPosition { X = 0, Y = 0, Width = 12, Height = 8 }, DataSourceRef = "$datasource", Queries = new List<PanelQuery> { new() { RefId = "A", Expression = "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\", instance=~\"$instance\"}[5m])) * 100)", LegendFormat = "{{instance}}" } } },
                    new() { Id = "memory", Title = "Memory Usage", Type = "timeseries", GridPos = new PanelGridPosition { X = 12, Y = 0, Width = 12, Height = 8 }, DataSourceRef = "$datasource", Queries = new List<PanelQuery> { new() { RefId = "A", Expression = "(node_memory_MemTotal_bytes{instance=~\"$instance\"} - node_memory_MemAvailable_bytes{instance=~\"$instance\"}) / node_memory_MemTotal_bytes{instance=~\"$instance\"} * 100", LegendFormat = "{{instance}}" } } },
                    new() { Id = "disk", Title = "Disk Usage", Type = "stat", GridPos = new PanelGridPosition { X = 0, Y = 8, Width = 6, Height = 4 }, DataSourceRef = "$datasource", Queries = new List<PanelQuery> { new() { RefId = "A", Expression = "100 - (node_filesystem_avail_bytes{instance=~\"$instance\",fstype!=\"tmpfs\"} / node_filesystem_size_bytes{instance=~\"$instance\",fstype!=\"tmpfs\"} * 100)" } } },
                    new() { Id = "network", Title = "Network Traffic", Type = "timeseries", GridPos = new PanelGridPosition { X = 6, Y = 8, Width = 18, Height = 8 }, DataSourceRef = "$datasource", Queries = new List<PanelQuery> { new() { RefId = "A", Expression = "rate(node_network_receive_bytes_total{instance=~\"$instance\"}[5m])", LegendFormat = "{{device}} received" }, new() { RefId = "B", Expression = "rate(node_network_transmit_bytes_total{instance=~\"$instance\"}[5m])", LegendFormat = "{{device}} transmitted" } } }
                }
            },
            new DashboardTemplate
            {
                Id = "application-metrics",
                Name = "Application Metrics",
                Description = "Monitor application performance including request rates, latency, and errors",
                Category = "Application",
                Tags = new List<string> { "application", "apm", "performance" },
                IsSystem = true,
                RequiredDataSourceTypes = new List<string> { "prometheus", "opentelemetry" },
                Variables = new List<DashboardVariable>
                {
                    new() { Name = "datasource", Label = "Data Source", Type = DashboardVariableType.DataSource },
                    new() { Name = "service", Label = "Service", Type = DashboardVariableType.Query, Query = "label_values(http_requests_total, service)", DataSourceRef = "$datasource" }
                },
                Panels = new List<DashboardPanel>
                {
                    new() { Id = "requests", Title = "Request Rate", Type = "timeseries", GridPos = new PanelGridPosition { X = 0, Y = 0, Width = 12, Height = 8 }, DataSourceRef = "$datasource", Queries = new List<PanelQuery> { new() { RefId = "A", Expression = "sum(rate(http_requests_total{service=~\"$service\"}[5m])) by (service)", LegendFormat = "{{service}}" } } },
                    new() { Id = "latency", Title = "Request Latency (p99)", Type = "timeseries", GridPos = new PanelGridPosition { X = 12, Y = 0, Width = 12, Height = 8 }, DataSourceRef = "$datasource", Queries = new List<PanelQuery> { new() { RefId = "A", Expression = "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{service=~\"$service\"}[5m])) by (le, service))", LegendFormat = "{{service}} p99" } } },
                    new() { Id = "errors", Title = "Error Rate", Type = "stat", GridPos = new PanelGridPosition { X = 0, Y = 8, Width = 8, Height = 4 }, DataSourceRef = "$datasource", Queries = new List<PanelQuery> { new() { RefId = "A", Expression = "sum(rate(http_requests_total{service=~\"$service\", status=~\"5..\"}[5m])) / sum(rate(http_requests_total{service=~\"$service\"}[5m])) * 100" } }, FieldConfig = new PanelFieldConfig { Defaults = new PanelFieldDefaults { Unit = "percent", Thresholds = new List<Threshold> { new() { Value = 0, Color = "green" }, new() { Value = 1, Color = "yellow" }, new() { Value = 5, Color = "red" } } } } },
                    new() { Id = "uptime", Title = "Uptime", Type = "stat", GridPos = new PanelGridPosition { X = 8, Y = 8, Width = 8, Height = 4 }, DataSourceRef = "$datasource", Queries = new List<PanelQuery> { new() { RefId = "A", Expression = "avg(up{job=~\"$service\"})" } } }
                }
            },
            new DashboardTemplate
            {
                Id = "database-metrics",
                Name = "Database Metrics",
                Description = "Monitor database performance, connections, and query metrics",
                Category = "Database",
                Tags = new List<string> { "database", "sql", "performance" },
                IsSystem = true,
                RequiredDataSourceTypes = new List<string> { "prometheus", "sqlserver", "postgresql" },
                Variables = new List<DashboardVariable>
                {
                    new() { Name = "datasource", Label = "Data Source", Type = DashboardVariableType.DataSource },
                    new() { Name = "database", Label = "Database", Type = DashboardVariableType.Query, Query = "label_values(pg_database_size_bytes, datname)", DataSourceRef = "$datasource" }
                },
                Panels = new List<DashboardPanel>
                {
                    new() { Id = "connections", Title = "Active Connections", Type = "timeseries", GridPos = new PanelGridPosition { X = 0, Y = 0, Width = 12, Height = 8 }, DataSourceRef = "$datasource", Queries = new List<PanelQuery> { new() { RefId = "A", Expression = "pg_stat_activity_count{datname=~\"$database\"}", LegendFormat = "{{datname}} - {{state}}" } } },
                    new() { Id = "qps", Title = "Queries per Second", Type = "timeseries", GridPos = new PanelGridPosition { X = 12, Y = 0, Width = 12, Height = 8 }, DataSourceRef = "$datasource", Queries = new List<PanelQuery> { new() { RefId = "A", Expression = "rate(pg_stat_database_xact_commit{datname=~\"$database\"}[5m])", LegendFormat = "{{datname}} commits" } } }
                }
            }
        };

        foreach (var template in templates)
        {
            Templates.TryAdd(template.Id, template);
        }
    }

    #endregion
}

#region Request/Response Models

public class CreateFromTemplateRequest
{
    public string TemplateId { get; set; } = string.Empty;
    public string TenantId { get; set; } = string.Empty;
    public string? AppId { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? OwnerId { get; set; }
    public string? FolderId { get; set; }
    public List<string>? Tags { get; set; }
    public Dictionary<string, DashboardVariableValue>? VariableValues { get; set; }
    public bool SyncWithTemplate { get; set; } = true;
}

public class DashboardPatchRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public List<string>? Tags { get; set; }
    public string? FolderId { get; set; }
    public bool? IsStarred { get; set; }
    public TimeRangeConfig? TimeRange { get; set; }
    public int? RefreshIntervalSeconds { get; set; }
    public List<DashboardPanel>? Panels { get; set; }
    public Dictionary<string, DashboardVariableValue>? VariableValues { get; set; }
    public string? ModifiedBy { get; set; }
    public string? Message { get; set; }
}

public class DashboardExport
{
    public DashboardInstance Instance { get; set; } = new();
    public DashboardTemplate? Template { get; set; }
    public DateTime ExportedAt { get; set; }
    public string Version { get; set; } = "1.0";
}

#endregion