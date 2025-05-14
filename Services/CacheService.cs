using System.Text.Json;
using StackExchange.Redis;

namespace MetricsApp.Services
{
    public interface ICacheService
    {
        Task<T?> GetAsync<T>(string key);
        Task SetAsync<T>(string key, T value, TimeSpan? expiry = null);
        Task RemoveAsync(string key);
    }

    public class RedisCacheService : ICacheService
    {
        private readonly IDatabase _db;
        private readonly IConnectionMultiplexer _redis;

        public RedisCacheService(IConnectionMultiplexer redis)
        {
            _redis = redis;
            _db = redis.GetDatabase();
        }

        public async Task<T?> GetAsync<T>(string key)
        {
            var redisValue = await _db.StringGetAsync(key);
            if (redisValue.IsNullOrEmpty)
            {
                return default;
            }
            return JsonSerializer.Deserialize<T>(redisValue.ToString());
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
        {
            var stringValue = JsonSerializer.Serialize(value);
            await _db.StringSetAsync(key, stringValue, expiry);
        }

        public async Task RemoveAsync(string key)
        {
            await _db.KeyDeleteAsync(key);
        }
    }
}
