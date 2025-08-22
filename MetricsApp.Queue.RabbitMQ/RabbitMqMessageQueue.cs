using MetricsApp.Abstractions.Queue;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace MetricsApp.Queue.RabbitMQ;

public class RabbitMqMessageQueue<T> : IMessageQueueProducer<T>, IMessageQueueConsumer<T>, IDisposable
    where T : class
{
    private readonly ILogger<RabbitMqMessageQueue<T>> _logger;
    private readonly RabbitMqOptions _options;
    private readonly IConnection _connection;
    private readonly IModel _channel;
    private readonly string _queueName;
    private readonly bool _disposed = false;

    public RabbitMqMessageQueue(
        ILogger<RabbitMqMessageQueue<T>> logger,
        IOptions<RabbitMqOptions> options,
        IConnection connection)
    {
        _logger = logger;
        _options = options.Value;
        _connection = connection;
        _channel = _connection.CreateModel();
        
        // Use type name as queue name with prefix
        _queueName = $"{_options.QueuePrefix}{typeof(T).Name.ToLowerInvariant()}";
        
        // Declare the queue
        _channel.QueueDeclare(
            queue: _queueName,
            durable: _options.Durable,
            exclusive: false,
            autoDelete: false,
            arguments: null);

        _logger.LogInformation("RabbitMQ queue '{QueueName}' initialized", _queueName);
    }

    public async Task EnqueueAsync(T message, CancellationToken cancellationToken = default)
    {
        try
        {
            var json = JsonSerializer.Serialize(message);
            var body = Encoding.UTF8.GetBytes(json);

            var properties = _channel.CreateBasicProperties();
            properties.Persistent = _options.Persistent;
            properties.MessageId = Guid.NewGuid().ToString();
            properties.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

            _channel.BasicPublish(
                exchange: _options.ExchangeName,
                routingKey: _queueName,
                basicProperties: properties,
                body: body);

            _logger.LogDebug("Message enqueued to '{QueueName}' with ID '{MessageId}'", 
                _queueName, properties.MessageId);

            await Task.CompletedTask; // Make it async for consistency
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to enqueue message to '{QueueName}'", _queueName);
            throw;
        }
    }

    public async Task<T?> DequeueAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var result = _channel.BasicGet(_queueName, autoAck: false);
            
            if (result == null)
            {
                return null;
            }

            var json = Encoding.UTF8.GetString(result.Body.ToArray());
            var message = JsonSerializer.Deserialize<T>(json);

            // Acknowledge the message
            _channel.BasicAck(result.DeliveryTag, multiple: false);

            _logger.LogDebug("Message dequeued from '{QueueName}' with delivery tag '{DeliveryTag}'", 
                _queueName, result.DeliveryTag);

            await Task.CompletedTask; // Make it async for consistency
            return message;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to dequeue message from '{QueueName}'", _queueName);
            throw;
        }
    }

    public void SetupConsumer(Func<T, Task> messageHandler)
    {
        var consumer = new EventingBasicConsumer(_channel);
        
        consumer.Received += async (model, args) =>
        {
            try
            {
                var json = Encoding.UTF8.GetString(args.Body.ToArray());
                var message = JsonSerializer.Deserialize<T>(json);

                if (message != null)
                {
                    await messageHandler(message);
                    _channel.BasicAck(args.DeliveryTag, multiple: false);
                }
                else
                {
                    _logger.LogWarning("Failed to deserialize message from '{QueueName}'", _queueName);
                    _channel.BasicNack(args.DeliveryTag, multiple: false, requeue: false);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing message from '{QueueName}'", _queueName);
                _channel.BasicNack(args.DeliveryTag, multiple: false, requeue: true);
            }
        };

        _channel.BasicConsume(
            queue: _queueName,
            autoAck: false,
            consumer: consumer);

        _logger.LogInformation("Consumer setup for queue '{QueueName}'", _queueName);
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            try
            {
                _channel?.Dispose();
                _logger.LogInformation("RabbitMQ channel disposed for queue '{QueueName}'", _queueName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disposing RabbitMQ channel for queue '{QueueName}'", _queueName);
            }
        }
    }

    public async Task EnqueueBatchAsync(IEnumerable<T> messages, CancellationToken cancellationToken = default)
    {
        // Enqueue the batched messages
        foreach (var message in messages)
        {
            await EnqueueAsync(message, cancellationToken);
        }
    }
} 