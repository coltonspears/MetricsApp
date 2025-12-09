using System.Text.Json.Serialization;

namespace MetricsApp.Abstractions.Plugins;

/// <summary>
/// Plugin manifest representing the contents of a plugin's manifest.json.
/// Supports dependencies, capabilities, exports, and settings schema.
/// </summary>
public class PluginManifest
{
    [JsonPropertyName("manifest_version")]
    public string ManifestVersion { get; set; } = "2.0.0";

    [JsonPropertyName("plugin_id")]
    public required string PluginId { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("version")]
    public required string Version { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("capabilities")]
    public List<string> Capabilities { get; set; } = new();

    [JsonPropertyName("tags")]
    public List<string> Tags { get; set; } = new();

    [JsonPropertyName("author")]
    public PluginAuthor? Author { get; set; }

    [JsonPropertyName("repository")]
    public string? Repository { get; set; }

    [JsonPropertyName("license")]
    public string? License { get; set; }

    [JsonPropertyName("entry")]
    public PluginEntry Entry { get; set; } = new();

    [JsonPropertyName("dependencies")]
    public PluginDependencies? Dependencies { get; set; }

    [JsonPropertyName("exports")]
    public PluginExports? Exports { get; set; }

    [JsonPropertyName("settings")]
    public PluginSettingsSchema? Settings { get; set; }

    [JsonPropertyName("permissions")]
    public List<string> Permissions { get; set; } = new();

    [JsonPropertyName("assets")]
    public PluginAssets? Assets { get; set; }
}

public class PluginAuthor
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("homepage")]
    public string? Homepage { get; set; }
}

public class PluginEntry
{
    [JsonPropertyName("assembly")]
    public string? Assembly { get; set; }

    [JsonPropertyName("frontend_bundle")]
    public string? FrontendBundle { get; set; }

    [JsonPropertyName("frontend_styles")]
    public string? FrontendStyles { get; set; }
}

public class PluginDependencies
{
    [JsonPropertyName("plugins")]
    public Dictionary<string, PluginDependencySpec>? Plugins { get; set; }

    [JsonPropertyName("platform")]
    public Dictionary<string, string>? Platform { get; set; }
}

public class PluginDependencySpec
{
    [JsonPropertyName("version")]
    public string? Version { get; set; }

    [JsonPropertyName("optional")]
    public bool Optional { get; set; }
    
    // Allow simple string version or full object
    public static implicit operator PluginDependencySpec(string version) => new() { Version = version };
}

public class PluginExports
{
    [JsonPropertyName("datasources")]
    public List<DataSourceExport>? DataSources { get; set; }

    [JsonPropertyName("dashboardPanels")]
    public List<DashboardPanelExport>? DashboardPanels { get; set; }

    [JsonPropertyName("routes")]
    public List<RouteExport>? Routes { get; set; }

    [JsonPropertyName("authProviders")]
    public List<AuthProviderExport>? AuthProviders { get; set; }

    [JsonPropertyName("alertChannels")]
    public List<AlertChannelExport>? AlertChannels { get; set; }
}

public class DataSourceExport
{
    [JsonPropertyName("type")]
    public required string Type { get; set; }

    [JsonPropertyName("displayName")]
    public required string DisplayName { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("icon")]
    public string? Icon { get; set; }

    [JsonPropertyName("categories")]
    public List<string>? Categories { get; set; }
}

public class DashboardPanelExport
{
    [JsonPropertyName("type")]
    public required string Type { get; set; }

    [JsonPropertyName("displayName")]
    public required string DisplayName { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("icon")]
    public string? Icon { get; set; }
}

public class RouteExport
{
    [JsonPropertyName("path")]
    public required string Path { get; set; }

    [JsonPropertyName("component")]
    public required string Component { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("requiresAuth")]
    public bool RequiresAuth { get; set; } = true;
}

public class AuthProviderExport
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("displayName")]
    public required string DisplayName { get; set; }

    [JsonPropertyName("icon")]
    public string? Icon { get; set; }
}

public class AlertChannelExport
{
    [JsonPropertyName("type")]
    public required string Type { get; set; }

    [JsonPropertyName("displayName")]
    public required string DisplayName { get; set; }

    [JsonPropertyName("icon")]
    public string? Icon { get; set; }
}

public class PluginSettingsSchema
{
    [JsonPropertyName("schema")]
    public Dictionary<string, object>? Schema { get; set; }
}

public class PluginAssets
{
    [JsonPropertyName("dashboards")]
    public List<string>? Dashboards { get; set; }

    [JsonPropertyName("alerts")]
    public List<string>? Alerts { get; set; }

    [JsonPropertyName("icons")]
    public PluginIcons? Icons { get; set; }
}

public class PluginIcons
{
    [JsonPropertyName("light")]
    public string? Light { get; set; }

    [JsonPropertyName("dark")]
    public string? Dark { get; set; }
}
