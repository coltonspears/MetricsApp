namespace MetricsApp.Abstractions.Queue;

/// <summary>
/// Interface for consuming messages from a queue.
/// </summary>
/// <typeparam name="T">The type of message to dequeue.</typeparam>
public interface IMessageQueueConsumer<T> where T : class
{
    // /// <summary>
    // /// Starts processing messages from the queue.
    // /// The implementation should handle message acknowledgement/rejection based on the outcome of the handlers.
    // /// </summary>
    // /// <param name="onMessageReceivedAsync">Handler for successfully received messages.</param>
    // /// <param name="onErrorAsync">Handler for errors during message processing (e.g., for DLQ logic).</param>
    // /// <param name="cancellationToken">Token to signal when to stop processing.</param>
    // Task StartProcessingAsync(
    //     Func<T, Task> onMessageReceivedAsync,
    //     Func<T, Exception, Task> onErrorAsync,
    //     CancellationToken cancellationToken);
    
    Task<T?> DequeueAsync(CancellationToken cancellationToken = default);
    // Task AcknowledgeMessageAsync(string messageId, CancellationToken cancellationToken = default);
    // Task NegativeAcknowledgeMessageAsync(string messageId, bool requeue = false, CancellationToken cancellationToken = default);
}

// public class QueueMessage<T> where T : class
// {
//     public string MessageId { get; set; } // Or delivery tag, receipt handle, etc.
//     public T Payload { get; set; }
//     public int DequeueCount { get; set; }
// }