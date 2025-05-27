namespace Microsoft.Extensions.DependencyInjection
{
    using MetricsApp.Abstractions.Caching;
    using MetricsApp.Cache.InMemory;

    public static class InMemoryCachingServiceCollectionExtensions
    {
        public static IServiceCollection AddInMemoryCaching(this IServiceCollection services)
        {
            services.AddMemoryCache();
            services.AddSingleton<ICachingService, InMemoryCachingService>();
            return services;
        }
    }
}