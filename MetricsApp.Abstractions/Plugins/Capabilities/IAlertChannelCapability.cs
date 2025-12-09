namespace MetricsApp.Abstractions.Plugins.Capabilities;

/// <summary>
/// Capability for plugins that provide alert notification channels.
/// </summary>
public interface IAlertChannelCapability : IPluginCapability
{
    /// <summary>
    /// Unique identifier for this channel type (e.g., "slack", "pagerduty", "email", "webhook")
    /// </summary>
    string ChannelType { get; }
    
    /// <summary>
    /// Human-readable display name
    /// </summary>
    string DisplayName { get; }
    
    /// <summary>
    /// Description of this notification channel
    /// </summary>
    string? Description { get; }
    
    /// <summary>
    /// Icon identifier
    /// </summary>
    string? IconName { get; }
    
    /// <summary>
    /// Gets the configuration schema for this channel
    /// </summary>
    AlertChannelConfigSchema GetConfigurationSchema();
    
    /// <summary>
    /// Sends an alert notification
    /// </summary>
    Task<AlertSendResult> SendAlertAsync(
        AlertNotification alert,
        AlertChannelConfiguration configuration,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Tests the channel configuration
    /// </summary>
    Task<AlertChannelTestResult> TestAsync(
        AlertChannelConfiguration configuration,
        CancellationToken cancellationToken = default);
}

public class AlertChannelConfigSchema
{
    public List<AlertChannelConfigField> Fields { get; init; } = new();
}

public class AlertChannelConfigField
{
    public required string Name { get; init; }
    public required string Label { get; init; }
    public string? Description { get; init; }
    public required string Type { get; init; }
    public bool Required { get; init; }
    public bool Secret { get; init; }
    public object? DefaultValue { get; init; }
    public string? Placeholder { get; init; }
}

public class AlertChannelConfiguration
{
    public required string ChannelType { get; init; }
    public required string Name { get; init; }
    public bool Enabled { get; init; } = true;
    public Dictionary<string, object> Settings { get; init; } = new();
}

public class AlertNotification
{
    public required string AlertId { get; init; }
    public required string AlertName { get; init; }
    public required AlertSeverity Severity { get; init; }
    public required string Message { get; init; }
    public DateTimeOffset FiredAt { get; init; }
    public string? DashboardUrl { get; init; }
    public string? AlertRuleUrl { get; init; }
    public Dictionary<string, object> Labels { get; init; } = new();
    public Dictionary<string, object> Annotations { get; init; } = new();
    public List<AlertValue>? Values { get; init; }
}

public enum AlertSeverity
{
    Info,
    Warning,
    Critical
}

public class AlertValue
{
    public required string MetricName { get; init; }
    public required double Value { get; init; }
    public DateTimeOffset Timestamp { get; init; }
}

public class AlertSendResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public string? ExternalId { get; init; }
}

public class AlertChannelTestResult
{
    public bool Success { get; init; }
    public string? Message { get; init; }
    public string? ErrorDetails { get; init; }
}

