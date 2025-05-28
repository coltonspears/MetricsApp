namespace Microsoft.Extensions.DependencyInjection
{
    using MetricsApp.Abstractions.Queue;
    using MetricsApp.Core.Models;
    using MetricsApp.Queue.InMemory;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.Extensions.Logging;
    
    public static class InMemoryQueueServiceCollectionExtensions
    {
        public static IServiceCollection AddInMemoryQueue(this IServiceCollection services)
        {
            // Register as Singleton. The InMemoryMessageQueue itself is thread-safe.
            services.AddSingleton(serviceProvider =>
            {
                var logger = serviceProvider.GetRequiredService<ILogger<InMemoryMessageQueue<EventDto>>>();
                return new InMemoryMessageQueue<EventDto>(logger);
            });

            services.AddSingleton<IMessageQueueProducer<EventDto>>(sp => sp.GetRequiredService<InMemoryMessageQueue<EventDto>>());
            services.AddSingleton<IMessageQueueConsumer<EventDto>>(sp => sp.GetRequiredService<InMemoryMessageQueue<EventDto>>());
            
            return services;
        }
    }
}