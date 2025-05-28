using MetricsApp.Agent.Core.Abstractions;
using MetricsApp.Agent.Emitters.Queue;

namespace Microsoft.Extensions.DependencyInjection
{
    public static class QueueEmitterServiceCollectionExtensions
    {
        public static IServiceCollection AddQueueMetricEmitter(this IServiceCollection services)
        {
            // This emitter relies on IMessageQueueProducer<EventDto> being registered elsewhere.
            // For example, the host application would configure its chosen queue (InMemory, RabbitMQ, etc.)
            // which registers IMessageQueueProducer<EventDto>.
            services.AddSingleton<IMetricEmitter, QueueMetricEmitter>();
            return services;
        }
    }
}