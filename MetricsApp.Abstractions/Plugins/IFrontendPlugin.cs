namespace MetricsApp.Abstractions.Plugins;

public interface IFrontendPlugin : IPlugin
{
    /// <summary>
    /// Where the React app should mount this plugin’s component.
    /// </summary>
    string MountPointId { get; }

    /// <summary>
    /// URL or local path to the built plugin bundle.
    /// </summary>
    string BundlePath { get; }
}