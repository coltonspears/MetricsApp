using System.Text.Json.Serialization;

namespace MetricsApp.Abstractions.Plugins;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PluginType
{
    Persistence,
    DataSource,
    Setup,
    Dashboard
}