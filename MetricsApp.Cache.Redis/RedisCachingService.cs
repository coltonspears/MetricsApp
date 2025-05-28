using MetricsApp.Abstractions.Caching;

namespace MetricsApp.Cache.Redis;

public class RedisCachingService : ICachingService
{
    public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) where T : class
    {
        throw new NotImplementedException();
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? absoluteExpirationRelativeToNow = null,
        TimeSpan? slidingExpiration = null, CancellationToken cancellationToken = default) where T : class
    {
        throw new NotImplementedException();
    }
    

    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException();
    }
    
}