using System.Threading.Channels;
using MetricsApp.Abstractions.Queue;
using MetricsApp.Core.Models;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Queue.InMemory;

public class InMemoryMessageQueue<T> : IMessageQueueProducer<T>, IMessageQueueConsumer<T> where T : class
    {
        private readonly Channel<T> _channel;
        private readonly ILogger<InMemoryMessageQueue<T>> _logger;

        public InMemoryMessageQueue(ILogger<InMemoryMessageQueue<T>> logger, int capacity = 1000) // Bounded capacity
        {
            _logger = logger;
            var options = new BoundedChannelOptions(capacity)
            {
                // Wait for space if channel is full
                FullMode = BoundedChannelFullMode.Wait 
            };
            _channel = Channel.CreateBounded<T>(options);
            _logger.LogInformation("InMemoryMessageQueue initialized with capacity {Capacity}.", capacity);
        }

        public async Task EnqueueAsync(T message, CancellationToken cancellationToken = default)
        {
            if (message == null) return;
            await _channel.Writer.WriteAsync(message, cancellationToken);
            _logger.LogDebug("Message enqueued.");
        }

        public async Task EnqueueBatchAsync(IEnumerable<T> messages, CancellationToken cancellationToken = default)
        {
            foreach (var message in messages)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    _logger.LogWarning("Batch enqueue cancelled.");
                    break;
                }
                await EnqueueAsync(message, cancellationToken);
            }
            _logger.LogDebug("Batch of {Count} messages enqueued.", ((List<T>)messages).Count);
        }

        public async Task<T?> DequeueAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                // TryRead is non-blocking, ReadAsync is blocking
                // For a worker, ReadAsync is usually preferred.
                var message = await _channel.Reader.ReadAsync(cancellationToken);
                _logger.LogDebug("Message dequeued.");
                return message;
            }
            catch (ChannelClosedException exception)
            {
                _logger.LogInformation("Channel closed, no more messages to dequeue: {Message}", exception.Message);
                return null;
            }
            catch (OperationCanceledException exception) when (cancellationToken.IsCancellationRequested)
            {
                _logger.LogInformation("Dequeue operation cancelled: {Message}", exception.Message);
                return null;
            }
        }

        // Call this on application shutdown to allow graceful processing of remaining items
        public void CompleteWriting()
        {
            _channel.Writer.TryComplete();
            _logger.LogInformation("InMemoryMessageQueue writing completed.");
        }
    }