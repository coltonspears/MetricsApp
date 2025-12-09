namespace MetricsApp.Abstractions.Plugins.Capabilities;

/// <summary>
/// Capability for plugins that provide authentication providers.
/// </summary>
public interface IAuthenticationCapability : IPluginCapability
{
    /// <summary>
    /// Unique identifier for this authentication provider (e.g., "oauth-github", "saml", "ldap")
    /// </summary>
    string ProviderId { get; }
    
    /// <summary>
    /// Human-readable name
    /// </summary>
    string ProviderName { get; }
    
    /// <summary>
    /// Icon identifier for UI
    /// </summary>
    string? IconName { get; }
    
    /// <summary>
    /// Gets the configuration schema for this auth provider
    /// </summary>
    AuthConfigurationSchema GetConfigurationSchema();
    
    /// <summary>
    /// Creates an authentication handler with the given configuration
    /// </summary>
    Task<IAuthenticationHandler> CreateHandlerAsync(
        AuthProviderConfiguration configuration,
        IServiceProvider services,
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Validates the configuration
    /// </summary>
    Task<AuthConfigValidationResult> ValidateConfigurationAsync(
        AuthProviderConfiguration configuration,
        CancellationToken cancellationToken = default);
}

public class AuthConfigurationSchema
{
    public List<AuthConfigField> Fields { get; init; } = new();
}

public class AuthConfigField
{
    public required string Name { get; init; }
    public required string Label { get; init; }
    public string? Description { get; init; }
    public required string Type { get; init; }
    public bool Required { get; init; }
    public bool Secret { get; init; }
    public object? DefaultValue { get; init; }
}

public class AuthProviderConfiguration
{
    public required string ProviderId { get; init; }
    public bool Enabled { get; init; }
    public Dictionary<string, object> Settings { get; init; } = new();
}

public class AuthConfigValidationResult
{
    public bool IsValid { get; init; }
    public List<string> Errors { get; init; } = new();
}

/// <summary>
/// Interface for handling authentication requests
/// </summary>
public interface IAuthenticationHandler
{
    Task<AuthenticationResult> AuthenticateAsync(AuthenticationRequest request, CancellationToken cancellationToken = default);
    Task<string?> GetLoginUrlAsync(string returnUrl, CancellationToken cancellationToken = default);
    Task<AuthenticationResult> HandleCallbackAsync(string code, string state, CancellationToken cancellationToken = default);
}

public class AuthenticationRequest
{
    public string? Username { get; init; }
    public string? Password { get; init; }
    public string? Token { get; init; }
    public Dictionary<string, string> Claims { get; init; } = new();
}

public class AuthenticationResult
{
    public bool Success { get; init; }
    public string? UserId { get; init; }
    public string? Username { get; init; }
    public string? Email { get; init; }
    public string? DisplayName { get; init; }
    public string? AccessToken { get; init; }
    public string? RefreshToken { get; init; }
    public DateTimeOffset? ExpiresAt { get; init; }
    public Dictionary<string, string> Claims { get; init; } = new();
    public string? ErrorMessage { get; init; }
}

