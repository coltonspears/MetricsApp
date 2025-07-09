using MetricsApp.Abstractions.Plugins;

namespace MetricsApp.Api.Models;

public class PluginSummaryDto
{
    public string PluginId { get; set; }
    public string Name { get; set; }
    public string Version { get; set; }
    public PluginType Type { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public List<string> Tags { get; set; }
    public bool HasFrontend { get; set; }
}