namespace MetricsApp.Api.Models;

public class FrontendPluginDefinition
{
    public string PluginId { get; set; }
    public string Name { get; set; }
    public string Version { get; set; }
    public string MountPointId { get; set; }
    public string BundleUrl { get; set; }
}