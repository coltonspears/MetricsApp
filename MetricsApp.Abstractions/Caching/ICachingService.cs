namespace MetricsApp.Abstractions.Caching;

/// <summary>
/// Generic caching service interface.
/// This can be implemented using IDistributedCache or other caching mechanisms.
/// </summary>
public interface ICachingService
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken) where T : class;
    Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpirationRelativeToNow = null, TimeSpan? slidingExpiration = null, CancellationToken cancellationToken = default) where T : class;
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
    //Task RefreshAsync(string key, CancellationToken cancellationToken = default);
}

// Note: Microsoft.Extensions.Caching.Abstractions.IDistributedCache
// can also be used directly if its byte[]-based API is acceptable for direct use.
// The ICachingService<T> above provides a slightly higher-level, generic-typed abstraction.
// If using IDistributedCache directly, serialization/deserialization (e.g., to JSON)
// would be handled by the calling code (e.g., in the Query API).
public class DistributedCacheEntryOptions
{
    
}