using Microsoft.Extensions.Caching.Memory;

namespace MetricsApp.Services;

public class FallbackCacheService : ICacheService
{
    private readonly IMemoryCache _memoryCache;

    public FallbackCacheService(IMemoryCache memoryCache, ILogger<FallbackCacheService> logger)
    {
        _memoryCache = memoryCache;
        logger.LogWarning("Using FallbackCacheService instead of Redis. This is less efficient for distributed scenarios.");
    }

    public Task<T?> GetAsync<T>(string key)
    {
        var value = _memoryCache.TryGetValue(key, out object? cachedValue) 
            ? (T?)cachedValue 
            : default;
        return Task.FromResult(value);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
    {
        var options = new MemoryCacheEntryOptions();
        if (expiry.HasValue)
        {
            options.SetAbsoluteExpiration(expiry.Value);
        }
        _memoryCache.Set(key, value, options);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key)
    {
        _memoryCache.Remove(key);
        return Task.CompletedTask;
    }
}