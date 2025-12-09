namespace MetricsApp.Abstractions.Plugins.Capabilities;

/// <summary>
/// Capability for plugins that provide setup/configuration wizards.
/// </summary>
public interface ISetupCapability : IPluginCapability
{
    /// <summary>
    /// Unique identifier for this setup step
    /// </summary>
    string SetupId { get; }
    
    /// <summary>
    /// Display name for the setup step
    /// </summary>
    string SetupName { get; }
    
    /// <summary>
    /// Description of what this setup configures
    /// </summary>
    string? Description { get; }
    
    /// <summary>
    /// Order in the setup flow (lower numbers run first)
    /// </summary>
    int Order { get; }
    
    /// <summary>
    /// Whether this setup step is required before the app can be used
    /// </summary>
    bool IsRequired { get; }
    
    /// <summary>
    /// Route path for the setup UI (e.g., "/setup/database")
    /// </summary>
    string SetupRoute { get; }
    
    /// <summary>
    /// Gets the current setup status
    /// </summary>
    Task<SetupStatus> GetStatusAsync(IServiceProvider services, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Completes the setup with the provided configuration
    /// </summary>
    Task<SetupResult> CompleteSetupAsync(
        SetupContext context,
        IServiceProvider services,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Resets the setup (if supported)
    /// </summary>
    Task<SetupResult> ResetSetupAsync(
        IServiceProvider services,
        CancellationToken cancellationToken = default);
}

public class SetupStatus
{
    public required string SetupId { get; init; }
    public required SetupState State { get; init; }
    public string? Message { get; init; }
    public DateTimeOffset? CompletedAt { get; init; }
    public Dictionary<string, object>? CurrentConfiguration { get; init; }
}

public enum SetupState
{
    NotStarted,
    InProgress,
    Completed,
    Failed,
    Skipped
}

public class SetupContext
{
    public required string SetupId { get; init; }
    public Dictionary<string, object> Configuration { get; init; } = new();
    public string? UserId { get; init; }
}

public class SetupResult
{
    public bool Success { get; init; }
    public string? Message { get; init; }
    public string? ErrorDetails { get; init; }
    public Dictionary<string, object>? OutputConfiguration { get; init; }
}

