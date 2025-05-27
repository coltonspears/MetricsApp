namespace MetricsApp.Abstractions.Queue;

/// <summary>
/// Interface for producing messages to a queue.
/// </summary>
/// <typeparam name="T">The type of message to enqueue.</typeparam>
public interface IMessageQueueProducer<T> where T : class
{
    Task EnqueueAsync(T message, CancellationToken cancellationToken = default);
    Task EnqueueBatchAsync(IEnumerable<T> messages, CancellationToken cancellationToken = default);
}

