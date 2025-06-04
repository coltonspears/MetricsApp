namespace MetricsApp.Core.Models;

/// <summary>
/// Authentication configuration for datasources
/// </summary>
public class DataSourceAuthentication
{
    /// <summary>
    /// Type of authentication (None, Basic, Bearer, ApiKey, OAuth2)
    /// </summary>
    public AuthenticationType Type { get; set; } = AuthenticationType.None;
    
    /// <summary>
    /// Username for basic authentication
    /// </summary>
    public string? Username { get; set; }
    
    /// <summary>
    /// Password for basic authentication
    /// </summary>
    public string? Password { get; set; }
    
    /// <summary>
    /// Bearer token for token-based authentication
    /// </summary>
    public string? Token { get; set; }
    
    /// <summary>
    /// API key for API key authentication
    /// </summary>
    public string? ApiKey { get; set; }
    
    /// <summary>
    /// API key header name (default: "X-API-Key")
    /// </summary>
    public string ApiKeyHeader { get; set; } = "X-API-Key";
    
    /// <summary>
    /// Additional authentication properties
    /// </summary>
    public Dictionary<string, string> Properties { get; set; } = new();
}

/// <summary>
/// Supported authentication types
/// </summary>
public enum AuthenticationType
{
    None,
    Basic,
    Bearer,
    ApiKey,
    OAuth2
} 