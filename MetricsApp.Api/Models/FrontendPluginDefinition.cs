namespace MetricsApp.Api.Models;

public class FrontendPluginDefinition
{
    public string PluginId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string MountPointId { get; set; } = string.Empty;
    public string? BundleUrl { get; set; }
}
