namespace MetricsApp.Abstractions.Plugins.Capabilities;

/// <summary>
/// Capability for plugins that add custom routes/pages to the application.
/// </summary>
public interface IRouteCapability : IPluginCapability
{
    /// <summary>
    /// Gets the routes this plugin provides
    /// </summary>
    IEnumerable<PluginRoute> GetRoutes();
    
    /// <summary>
    /// Gets navigation items to add to the UI
    /// </summary>
    IEnumerable<NavigationItem> GetNavigationItems();
}

/// <summary>
/// Defines a route added by a plugin
/// </summary>
public class PluginRoute
{
    /// <summary>
    /// URL path for the route (e.g., "/my-plugin/settings")
    /// </summary>
    public required string Path { get; init; }
    
    /// <summary>
    /// React component name to render (from the plugin's frontend bundle)
    /// </summary>
    public required string ComponentName { get; init; }
    
    /// <summary>
    /// Whether authentication is required
    /// </summary>
    public bool RequiresAuth { get; init; } = true;
    
    /// <summary>
    /// Required permissions to access this route
    /// </summary>
    public List<string> RequiredPermissions { get; init; } = new();
    
    /// <summary>
    /// Page title
    /// </summary>
    public string? Title { get; init; }
}

/// <summary>
/// Defines a navigation item to add to the UI
/// </summary>
public class NavigationItem
{
    /// <summary>
    /// Unique identifier
    /// </summary>
    public required string Id { get; init; }
    
    /// <summary>
    /// Display label
    /// </summary>
    public required string Label { get; init; }
    
    /// <summary>
    /// Icon identifier
    /// </summary>
    public string? IconName { get; init; }
    
    /// <summary>
    /// Route path to navigate to
    /// </summary>
    public required string Path { get; init; }
    
    /// <summary>
    /// Navigation section (e.g., "main", "admin", "settings")
    /// </summary>
    public string Section { get; init; } = "main";
    
    /// <summary>
    /// Sort order within the section
    /// </summary>
    public int Order { get; init; } = 100;
    
    /// <summary>
    /// Required permissions to show this item
    /// </summary>
    public List<string> RequiredPermissions { get; init; } = new();
    
    /// <summary>
    /// Child navigation items
    /// </summary>
    public List<NavigationItem> Children { get; init; } = new();
}

