namespace Microsoft.Extensions.DependencyInjection
{
    using MetricsApp.Abstractions.Data;
    using MetricsApp.Repository.InMemory;

    public static class InMemoryRepositoryServiceCollectionExtensions
    {
        public static IServiceCollection AddInMemoryRepository(this IServiceCollection services)
        {
            services.AddSingleton<IDataRepository, InMemoryDataRepository>();
            services.AddSingleton<IConfigurationRepository, InMemoryConfigurationRepository>();
            return services;
        }
    }
}