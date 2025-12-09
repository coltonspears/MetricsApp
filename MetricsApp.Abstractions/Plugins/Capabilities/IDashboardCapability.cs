namespace MetricsApp.Abstractions.Plugins.Capabilities;

/// <summary>
/// Capability for plugins that provide dashboard panels and visualizations.
/// </summary>
public interface IDashboardCapability : IPluginCapability
{
    /// <summary>
    /// Gets the panel types this plugin provides
    /// </summary>
    IEnumerable<PanelTypeDefinition> GetPanelTypes();
    
    /// <summary>
    /// Gets dashboard templates that can be imported
    /// </summary>
    IEnumerable<DashboardTemplate> GetDashboardTemplates();
}

/// <summary>
/// Definition of a custom panel type
/// </summary>
public class PanelTypeDefinition
{
    /// <summary>
    /// Unique type identifier (e.g., "time-series-chart", "gauge", "table")
    /// </summary>
    public required string Type { get; init; }
    
    /// <summary>
    /// Human-readable display name
    /// </summary>
    public required string DisplayName { get; init; }
    
    /// <summary>
    /// Description of the panel type
    /// </summary>
    public string? Description { get; init; }
    
    /// <summary>
    /// Icon identifier
    /// </summary>
    public string? IconName { get; init; }
    
    /// <summary>
    /// Default size when adding to dashboard
    /// </summary>
    public PanelSize DefaultSize { get; init; } = new() { Width = 6, Height = 4 };
    
    /// <summary>
    /// Configuration schema for this panel type
    /// </summary>
    public PanelConfigurationSchema? ConfigurationSchema { get; init; }
}

public class PanelSize
{
    public int Width { get; init; }
    public int Height { get; init; }
}

public class PanelConfigurationSchema
{
    public List<PanelConfigField> Fields { get; init; } = new();
}

public class PanelConfigField
{
    public required string Name { get; init; }
    public required string Label { get; init; }
    public string? Description { get; init; }
    public required string Type { get; init; } // text, number, select, boolean, color, query
    public object? DefaultValue { get; init; }
    public List<SelectOption>? Options { get; init; }
}

public class SelectOption
{
    public required string Value { get; init; }
    public required string Label { get; init; }
}

/// <summary>
/// A pre-built dashboard template
/// </summary>
public class DashboardTemplate
{
    /// <summary>
    /// Unique identifier for this template
    /// </summary>
    public required string Id { get; init; }
    
    /// <summary>
    /// Display name
    /// </summary>
    public required string Name { get; init; }
    
    /// <summary>
    /// Description of what this dashboard shows
    /// </summary>
    public string? Description { get; init; }
    
    /// <summary>
    /// Tags for categorization
    /// </summary>
    public List<string> Tags { get; init; } = new();
    
    /// <summary>
    /// Required data source types for this dashboard
    /// </summary>
    public List<string> RequiredDataSources { get; init; } = new();
    
    /// <summary>
    /// JSON definition of the dashboard
    /// </summary>
    public required string JsonDefinition { get; init; }
    
    /// <summary>
    /// Preview image URL
    /// </summary>
    public string? PreviewImageUrl { get; init; }
}

