using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using MetricsApp.Abstractions.Plugins.Capabilities;

namespace MetricsApp.Abstractions.Plugins;

/// <summary>
/// Generates manifest.json files from plugin implementations.
/// Can be used at build time via MSBuild or at runtime for validation.
/// </summary>
public static class PluginManifestGenerator
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter() }
    };

    /// <summary>
    /// Generates a PluginManifest from a plugin instance.
    /// </summary>
    public static PluginManifest GenerateManifest(IPlugin plugin, PluginManifestOptions? options = null)
    {
        options ??= new PluginManifestOptions();
        
        var manifest = new PluginManifest
        {
            ManifestVersion = "2.0.0",
            PluginId = plugin.Id,
            Name = plugin.Name,
            Version = plugin.Version,
            Title = plugin.Title,
            Description = plugin.Description,
            Capabilities = DiscoverCapabilities(plugin),
            Tags = options.Tags ?? new List<string>(),
            Author = options.Author,
            License = options.License,
            Repository = options.Repository,
            Entry = new PluginEntry
            {
                Assembly = options.AssemblyName ?? $"{plugin.GetType().Assembly.GetName().Name}.dll",
                FrontendBundle = options.FrontendBundle
            },
            Dependencies = options.Dependencies,
            Exports = GenerateExports(plugin),
            Settings = options.Settings,
            Permissions = options.Permissions ?? new List<string>(),
            Assets = options.Assets
        };

        return manifest;
    }

    /// <summary>
    /// Generates manifest JSON string from a plugin instance.
    /// </summary>
    public static string GenerateManifestJson(IPlugin plugin, PluginManifestOptions? options = null)
    {
        var manifest = GenerateManifest(plugin, options);
        return JsonSerializer.Serialize(manifest, JsonOptions);
    }

    /// <summary>
    /// Writes manifest.json to the specified path.
    /// </summary>
    public static void WriteManifest(IPlugin plugin, string outputPath, PluginManifestOptions? options = null)
    {
        var json = GenerateManifestJson(plugin, options);
        File.WriteAllText(outputPath, json);
    }

    /// <summary>
    /// Validates that an existing manifest matches the plugin implementation.
    /// </summary>
    public static ManifestValidationResult ValidateManifest(IPlugin plugin, PluginManifest manifest)
    {
        var errors = new List<string>();
        var warnings = new List<string>();

        // Check required fields match
        if (manifest.PluginId != plugin.Id)
            errors.Add($"PluginId mismatch: manifest has '{manifest.PluginId}', plugin has '{plugin.Id}'");
        
        if (manifest.Name != plugin.Name)
            warnings.Add($"Name mismatch: manifest has '{manifest.Name}', plugin has '{plugin.Name}'");
        
        if (manifest.Version != plugin.Version)
            warnings.Add($"Version mismatch: manifest has '{manifest.Version}', plugin has '{plugin.Version}'");

        // Check capabilities
        var pluginCapabilities = DiscoverCapabilities(plugin);
        foreach (var cap in pluginCapabilities)
        {
            if (!manifest.Capabilities.Contains(cap, StringComparer.OrdinalIgnoreCase))
            {
                warnings.Add($"Plugin implements '{cap}' capability but it's not in manifest");
            }
        }

        return new ManifestValidationResult
        {
            IsValid = errors.Count == 0,
            Errors = errors,
            Warnings = warnings
        };
    }

    private static List<string> DiscoverCapabilities(IPlugin plugin)
    {
        var capabilities = new List<string>();
        
        if (plugin.HasCapability<IDataSourceCapability>())
            capabilities.Add("datasource");
        
        if (plugin.HasCapability<IDashboardCapability>())
            capabilities.Add("dashboard");
        
        if (plugin.HasCapability<ISetupCapability>())
            capabilities.Add("setup");
        
        if (plugin.HasCapability<IRouteCapability>())
            capabilities.Add("routes");
        
        if (plugin.HasCapability<IAuthenticationCapability>())
            capabilities.Add("authentication");
        
        if (plugin.HasCapability<IAlertChannelCapability>())
            capabilities.Add("alertchannel");
        
        return capabilities;
    }

    private static PluginExports? GenerateExports(IPlugin plugin)
    {
        var exports = new PluginExports();
        var hasExports = false;

        // Export routes
        if (plugin.GetCapability<IRouteCapability>() is { } routeCap)
        {
            exports.Routes = routeCap.GetRoutes()
                .Select(r => new RouteExport
                {
                    Path = r.Path,
                    Component = r.ComponentName,
                    Title = r.Title,
                    RequiresAuth = r.RequiresAuth
                })
                .ToList();
            hasExports = true;
        }

        // Export data sources
        if (plugin.GetCapability<IDataSourceCapability>() is { } dsCap)
        {
            exports.DataSources = new List<DataSourceExport>
            {
                new DataSourceExport
                {
                    Type = dsCap.DataSourceType,
                    DisplayName = dsCap.DisplayName,
                    Description = dsCap.Description,
                    Icon = dsCap.IconName,
                    Categories = dsCap.Categories?.ToList()
                }
            };
            hasExports = true;
        }

        // Export dashboard panels
        if (plugin.GetCapability<IDashboardCapability>() is { } dashCap)
        {
            exports.DashboardPanels = dashCap.GetPanelTypes()
                .Select(p => new DashboardPanelExport
                {
                    Type = p.Type,
                    DisplayName = p.DisplayName,
                    Description = p.Description,
                    Icon = p.IconName
                })
                .ToList();
            hasExports = true;
        }

        return hasExports ? exports : null;
    }
}

/// <summary>
/// Options for manifest generation that can't be inferred from the plugin.
/// </summary>
public class PluginManifestOptions
{
    public string? AssemblyName { get; set; }
    public string? FrontendBundle { get; set; }
    public List<string>? Tags { get; set; }
    public PluginAuthor? Author { get; set; }
    public string? License { get; set; }
    public string? Repository { get; set; }
    public PluginDependencies? Dependencies { get; set; }
    public PluginSettingsSchema? Settings { get; set; }
    public List<string>? Permissions { get; set; }
    public PluginAssets? Assets { get; set; }
}

/// <summary>
/// Result of manifest validation.
/// </summary>
public class ManifestValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

