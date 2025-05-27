using Microsoft.Extensions.Logging;
using MetricsApp.Abstractions.Queue; 
using MetricsApp.Agent.Core.Abstractions;
using MetricsApp.Core.Models; 
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Agent.Emitters.Queue
{
    public class QueueMetricEmitter : IMetricEmitter
    {
        private readonly IMessageQueueProducer<EventDto> _queueProducer;
        private readonly ILogger<QueueMetricEmitter> _logger;

        public QueueMetricEmitter(IMessageQueueProducer<EventDto> queueProducer, ILogger<QueueMetricEmitter> logger)
        {
            _queueProducer = queueProducer;
            _logger = logger;
            _logger.LogInformation("QueueMetricEmitter initialized.");
        }

        public async Task EmitAsync(IEnumerable<EventDto> events, CancellationToken cancellationToken = default)
        {
            if (events == null || !events.Any())
            {
                _logger.LogDebug("No events to emit to queue.");
                return;
            }

            try
            {
                await _queueProducer.EnqueueBatchAsync(events, cancellationToken);
                _logger.LogInformation("Successfully enqueued {Count} events via QueueMetricEmitter.", events.Count());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enqueuing events via QueueMetricEmitter.");
                throw; // Re-throw to allow MetricCollectionService to handle/log
            }
        }
    }
}

