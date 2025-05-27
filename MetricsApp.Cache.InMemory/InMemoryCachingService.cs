using MetricsApp.Abstractions.Caching;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace MetricsApp.Cache.InMemory;

public class InMemoryCachingService : ICachingService
{
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<InMemoryCachingService> _logger;

    public InMemoryCachingService(IMemoryCache memoryCache, ILogger<InMemoryCachingService> logger)
    {
        _memoryCache = memoryCache;
        _logger = logger;
        _logger.LogInformation("InMemoryCachingService initialized.");
    }

    public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) where T : class
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (_memoryCache.TryGetValue(key, out T? value))
        {
            _logger.LogDebug("Cache hit for key: {Key}", key);
            return Task.FromResult(value);
        }
        _logger.LogDebug("Cache miss for key: {Key}", key);
        return Task.FromResult<T?>(null);
    }
    

    public Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpirationRelativeToNow = null, TimeSpan? slidingExpiration = null, CancellationToken cancellationToken = default) where T : class
    {
        cancellationToken.ThrowIfCancellationRequested();
        var options = new MemoryCacheEntryOptions();

        if (absoluteExpirationRelativeToNow.HasValue)
        {
            options.AbsoluteExpirationRelativeToNow = absoluteExpirationRelativeToNow;
        }
        if (slidingExpiration.HasValue)
        {
            options.SlidingExpiration = slidingExpiration;
        }

        // If no expiration is set, use a default (e.g., 5 minutes) to prevent memory leaks
        if (!absoluteExpirationRelativeToNow.HasValue && !slidingExpiration.HasValue)
        {
            options.SlidingExpiration = TimeSpan.FromMinutes(5);
            _logger.LogDebug("Setting cache for key: {Key} with default sliding expiration 5 mins", key);
        }
        else
        {
            _logger.LogDebug("Setting cache for key: {Key} with custom expiration.", key);
        }


        _memoryCache.Set(key, value, options);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _memoryCache.Remove(key);
        _logger.LogDebug("Cache removed for key: {Key}", key);
        return Task.CompletedTask;
    }
}