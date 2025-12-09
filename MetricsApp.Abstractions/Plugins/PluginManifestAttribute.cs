namespace MetricsApp.Abstractions.Plugins;

/// <summary>
/// Attribute to provide additional manifest metadata for plugin classes.
/// Used by manifest generation tools.
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public class PluginManifestAttribute : Attribute
{
    /// <summary>
    /// Tags for categorizing the plugin.
    /// </summary>
    public string[]? Tags { get; set; }
    
    /// <summary>
    /// License identifier (e.g., "MIT", "Apache-2.0").
    /// </summary>
    public string? License { get; set; }
    
    /// <summary>
    /// Repository URL.
    /// </summary>
    public string? Repository { get; set; }
    
    /// <summary>
    /// Path to frontend bundle relative to plugin output.
    /// </summary>
    public string? FrontendBundle { get; set; }
    
    /// <summary>
    /// Required permissions.
    /// </summary>
    public string[]? Permissions { get; set; }
}

/// <summary>
/// Attribute to specify plugin author information.
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public class PluginAuthorAttribute : Attribute
{
    public string Name { get; }
    public string? Email { get; set; }
    public string? Homepage { get; set; }
    
    public PluginAuthorAttribute(string name)
    {
        Name = name;
    }
}

/// <summary>
/// Attribute to specify plugin dependencies.
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true, Inherited = false)]
public class PluginDependencyAttribute : Attribute
{
    public string PluginId { get; }
    public string? Version { get; set; }
    public bool Optional { get; set; }
    
    public PluginDependencyAttribute(string pluginId)
    {
        PluginId = pluginId;
    }
}

/// <summary>
/// Attribute to specify plugin asset files.
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = true, Inherited = false)]
public class PluginAssetAttribute : Attribute
{
    public PluginAssetType AssetType { get; }
    public string Path { get; }
    
    public PluginAssetAttribute(PluginAssetType assetType, string path)
    {
        AssetType = assetType;
        Path = path;
    }
}

public enum PluginAssetType
{
    Dashboard,
    Alert,
    Icon
}

