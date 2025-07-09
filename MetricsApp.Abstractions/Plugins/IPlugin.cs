namespace MetricsApp.Abstractions.Plugins;

public interface IPlugin
{
    /// <summary>
    /// Unique identifier, e.g. "MetricsApp.Persistance.SqlServer"
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Semantic version, e.g. "1.0.0"
    /// </summary>
    string Version { get; }
}