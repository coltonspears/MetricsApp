# MetricsApp.Queue.InMemory

## Overview

The InMemory Queue library provides an in-memory message queue implementation for the MetricsApp projects. It implements both `IMessageQueueProducer<T>` and `IMessageQueueConsumer<T>` interfaces using .NET's concurrent collections for thread-safe operations.

## Features

- **High Performance**: In-memory operations with minimal overhead
- **Thread Safety**: Concurrent access support using thread-safe collections
- **Type Safety**: Generic implementation supporting any message type
- **Event-Driven**: Event notifications for message arrival
- **Batch Operations**: Support for batch enqueue/dequeue operations
- **Bounded Queues**: Optional capacity limits to prevent memory exhaustion

## Implementation

### InMemoryMessageQueue<T>

The main implementation that provides both producer and consumer functionality.

```csharp
public class InMemoryMessageQueue<T> : IMessageQueueProducer<T>, IMessageQueueConsumer<T> where T : class
{
    // Producer methods
    public async Task EnqueueAsync(T message, CancellationToken cancellationToken = default);
    public async Task EnqueueBatchAsync(IEnumerable<T> messages, CancellationToken cancellationToken = default);
    
    // Consumer methods
    public async Task<T?> DequeueAsync(CancellationToken cancellationToken = default);
    public async Task<IEnumerable<T>> DequeueBatchAsync(int maxCount, CancellationToken cancellationToken = default);
    public event EventHandler<T> MessageReceived;
    public async Task StartListeningAsync(CancellationToken cancellationToken = default);
    public async Task StopListeningAsync();
}
```

## Configuration

### Dependency Injection

```csharp
// Basic registration
services.AddSingleton<IMessageQueueProducer<EventDto>, InMemoryMessageQueue<EventDto>>();
services.AddSingleton<IMessageQueueConsumer<EventDto>>(provider => 
    (InMemoryMessageQueue<EventDto>)provider.GetService<IMessageQueueProducer<EventDto>>());

// With configuration
services.Configure<InMemoryQueueOptions>(options =>
{
    options.MaxCapacity = 10000;
    options.EnableEvents = true;
});
```

### Extension Methods

```csharp
// Convenient extension method
services.AddInMemoryQueue<EventDto>();

// With options
services.AddInMemoryQueue<EventDto>(options =>
{
    options.MaxCapacity = 10000;
    options.EnableEvents = true;
    options.WaitTimeout = TimeSpan.FromSeconds(30);
});
```

### Configuration Options

```json
{
  "InMemoryQueue": {
    "MaxCapacity": 10000,
    "EnableEvents": true,
    "WaitTimeout": "00:00:30",
    "BatchSize": 100
  }
}
```

**Options:**
- `MaxCapacity`: Maximum number of messages in queue (0 = unlimited)
- `EnableEvents`: Whether to raise MessageReceived events
- `WaitTimeout`: Maximum wait time for dequeue operations
- `BatchSize`: Default batch size for batch operations

## Usage

### Basic Producer/Consumer

```csharp
public class EventProcessor
{
    private readonly IMessageQueueProducer<EventDto> _producer;
    private readonly IMessageQueueConsumer<EventDto> _consumer;

    public EventProcessor(
        IMessageQueueProducer<EventDto> producer,
        IMessageQueueConsumer<EventDto> consumer)
    {
        _producer = producer;
        _consumer = consumer;
    }

    public async Task ProduceEventAsync(EventDto eventDto)
    {
        await _producer.EnqueueAsync(eventDto);
    }

    public async Task<EventDto?> ConsumeEventAsync()
    {
        return await _consumer.DequeueAsync();
    }
}
```

### Batch Operations

```csharp
public class BatchProcessor
{
    private readonly IMessageQueueProducer<EventDto> _producer;
    private readonly IMessageQueueConsumer<EventDto> _consumer;

    public async Task ProcessBatchAsync(IEnumerable<EventDto> events)
    {
        // Enqueue batch
        await _producer.EnqueueBatchAsync(events);

        // Dequeue batch
        var processedEvents = await _consumer.DequeueBatchAsync(100);
        
        foreach (var evt in processedEvents)
        {
            await ProcessEvent(evt);
        }
    }
}
```

### Event-Driven Processing

```csharp
public class EventDrivenProcessor
{
    private readonly IMessageQueueConsumer<EventDto> _consumer;

    public EventDrivenProcessor(IMessageQueueConsumer<EventDto> consumer)
    {
        _consumer = consumer;
        _consumer.MessageReceived += OnMessageReceived;
    }

    public async Task StartAsync()
    {
        await _consumer.StartListeningAsync();
    }

    private async void OnMessageReceived(object sender, EventDto eventDto)
    {
        try
        {
            await ProcessEvent(eventDto);
        }
        catch (Exception ex)
        {
            // Handle processing errors
            _logger.LogError(ex, "Error processing event");
        }
    }
}
```

### Background Service Integration

```csharp
public class QueueProcessorService : BackgroundService
{
    private readonly IMessageQueueConsumer<EventDto> _consumer;
    private readonly ILogger<QueueProcessorService> _logger;

    public QueueProcessorService(
        IMessageQueueConsumer<EventDto> consumer,
        ILogger<QueueProcessorService> logger)
    {
        _consumer = consumer;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var events = await _consumer.DequeueBatchAsync(100, stoppingToken);
                
                foreach (var evt in events)
                {
                    await ProcessEvent(evt, stoppingToken);
                }

                if (!events.Any())
                {
                    await Task.Delay(1000, stoppingToken); // Wait if no messages
                }
            }
            catch (OperationCanceledException)
            {
                // Expected when cancellation is requested
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing queue");
                await Task.Delay(5000, stoppingToken); // Wait before retry
            }
        }
    }
}
```

## Performance Characteristics

### Advantages
- **Ultra-fast operations**: Direct memory access with no serialization
- **Low latency**: Sub-millisecond enqueue/dequeue times
- **High throughput**: Thousands of operations per second
- **No external dependencies**: Self-contained implementation
- **Thread-safe**: Concurrent producer/consumer support

### Limitations
- **Single instance**: Queue is not shared across processes
- **Memory bound**: Limited by available system memory
- **Volatile**: Messages are lost on application restart
- **No persistence**: Messages are not persisted to disk

## Memory Management

### Capacity Management

```csharp
public class BoundedInMemoryQueue<T> : InMemoryMessageQueue<T>
{
    private readonly int _maxCapacity;
    private readonly SemaphoreSlim _semaphore;

    public override async Task EnqueueAsync(T message, CancellationToken cancellationToken = default)
    {
        await _semaphore.WaitAsync(cancellationToken);
        try
        {
            if (_queue.Count >= _maxCapacity)
            {
                throw new InvalidOperationException("Queue capacity exceeded");
            }
            
            await base.EnqueueAsync(message, cancellationToken);
        }
        finally
        {
            _semaphore.Release();
        }
    }
}
```

### Memory Monitoring

```csharp
public class QueueMetrics<T>
{
    private readonly InMemoryMessageQueue<T> _queue;

    public int QueueDepth => _queue.Count;
    public long EstimatedMemoryUsage => CalculateMemoryUsage();
    public double ThroughputPerSecond => CalculateThroughput();
    
    private long CalculateMemoryUsage()
    {
        // Estimate memory usage based on queue depth and message size
        return QueueDepth * EstimateMessageSize();
    }
}
```

## Error Handling

### Retry Logic

```csharp
public class ReliableQueueProcessor
{
    private readonly IMessageQueueConsumer<EventDto> _consumer;
    private readonly IMessageQueueProducer<EventDto> _deadLetterQueue;

    public async Task ProcessWithRetryAsync()
    {
        var message = await _consumer.DequeueAsync();
        if (message == null) return;

        var retryCount = 0;
        const int maxRetries = 3;

        while (retryCount < maxRetries)
        {
            try
            {
                await ProcessMessage(message);
                return; // Success
            }
            catch (Exception ex)
            {
                retryCount++;
                _logger.LogWarning(ex, "Processing failed, attempt {Attempt}", retryCount);
                
                if (retryCount >= maxRetries)
                {
                    // Send to dead letter queue
                    await _deadLetterQueue.EnqueueAsync(message);
                    _logger.LogError("Message sent to dead letter queue after {MaxRetries} attempts", maxRetries);
                }
                else
                {
                    await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, retryCount))); // Exponential backoff
                }
            }
        }
    }
}
```

## Best Practices

### Queue Design
- Use appropriate message types for your use case
- Consider message size and memory impact
- Implement proper error handling
- Monitor queue depth and throughput

### Performance Optimization
- Use batch operations for high-volume scenarios
- Implement backpressure mechanisms
- Monitor memory usage
- Consider queue partitioning for very high loads

### Error Handling
- Implement retry logic with exponential backoff
- Use dead letter queues for failed messages
- Log processing errors with context
- Monitor error rates and patterns

## Monitoring

### Queue Metrics

```csharp
public class QueueMonitor<T>
{
    private readonly InMemoryMessageQueue<T> _queue;
    private readonly IMetrics _metrics;

    public void RecordEnqueue()
    {
        _metrics.Measure.Counter.Increment("queue.enqueue");
        _metrics.Measure.Gauge.SetValue("queue.depth", _queue.Count);
    }

    public void RecordDequeue()
    {
        _metrics.Measure.Counter.Increment("queue.dequeue");
        _metrics.Measure.Gauge.SetValue("queue.depth", _queue.Count);
    }

    public void RecordProcessingTime(TimeSpan duration)
    {
        _metrics.Measure.Timer.Time("queue.processing_time", duration);
    }
}
```

### Health Checks

```csharp
public class QueueHealthCheck : IHealthCheck
{
    private readonly InMemoryMessageQueue<EventDto> _queue;

    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var queueDepth = _queue.Count;
            var maxDepth = 10000; // Configure based on your needs

            if (queueDepth > maxDepth)
            {
                return Task.FromResult(HealthCheckResult.Unhealthy($"Queue depth too high: {queueDepth}"));
            }

            return Task.FromResult(HealthCheckResult.Healthy($"Queue depth: {queueDepth}"));
        }
        catch (Exception ex)
        {
            return Task.FromResult(HealthCheckResult.Unhealthy("Queue health check failed", ex));
        }
    }
}
```

## Dependencies

```xml
<PackageReference Include="System.Threading.Channels" Version="9.0.5" />
<PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="9.0.5" />
<PackageReference Include="MetricsApp.Abstractions" />
```

## Migration to External Queues

When you need to scale beyond in-memory queues, consider:

### RabbitMQ
- Persistent messaging
- Clustering support
- Advanced routing

### Azure Service Bus
- Cloud-native messaging
- Built-in retry policies
- Dead letter queues

### Apache Kafka
- High-throughput streaming
- Partitioning support
- Event sourcing capabilities

The abstractions in MetricsApp make it easy to swap implementations without changing your application code. 