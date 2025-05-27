namespace Microsoft.Extensions.DependencyInjection
{
    using MetricsApp.Abstractions.Parsers;
    using MetricsApp.Parser.WindowsPerfCounters;

    public static class WindowsPerfCounterParserServiceCollectionExtensions
    {
        public static IServiceCollection AddWindowsPerfCounterParser(this IServiceCollection services)
        {
            // Register as Singleton or Scoped/Transient depending on its statefulness.
            // If stateless, Singleton is fine.
            services.AddSingleton<IDataParser, WindowsPerfCounterParser>();
            return services;
        }
    }
}