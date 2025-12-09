namespace MetricsApp.Api.Models;

public class PluginSummaryDto
{
    public string PluginId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public List<string> Capabilities { get; set; } = new();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public bool HasFrontend { get; set; }
}
