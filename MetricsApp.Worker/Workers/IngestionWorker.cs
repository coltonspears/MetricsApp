using MetricsApp.Abstractions.Queue;
using MetricsApp.Abstractions.Parsers;
using MetricsApp.Abstractions.Data;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MetricsApp.Queue.InMemory;

namespace MetricsApp.Worker.Workers;

public class IngestionWorker : BackgroundService
{
    private readonly ILogger<IngestionWorker> _logger;
    private readonly IMessageQueueConsumer<EventDto> _queueConsumer;
    private readonly IEnumerable<IDataParser> _parsers; // Get all registered parsers
    private readonly IDataRepository _dataRepository;
    // private readonly IServiceProvider _serviceProvider; // Not strictly needed if queueConsumer is the concrete type
    
    public IngestionWorker(
        ILogger<IngestionWorker> logger,
        IMessageQueueConsumer<EventDto> queueConsumer, // This will be InMemoryMessageQueue<EventDto>
        IEnumerable<IDataParser> parsers,
        IDataRepository dataRepository)
        // IServiceProvider serviceProvider) // Not strictly needed
    {
        _logger = logger;
        _queueConsumer = queueConsumer;
        _parsers = parsers;
        _dataRepository = dataRepository;
        // _serviceProvider = serviceProvider;
        _logger.LogInformation("IngestionWorker initialized with {ParserCount} parsers.", _parsers.Count());
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("IngestionWorker running.");

        await Task.Yield(); // Ensure this runs in a background thread

        while (!stoppingToken.IsCancellationRequested)
        {
            EventDto? rawEvent = null;
            try
            {
                _logger.LogDebug("IngestionWorker waiting to dequeue message...");
                rawEvent = await _queueConsumer.DequeueAsync(stoppingToken);

                if (rawEvent == null)
                {
                    _logger.LogTrace("Dequeued null event, possibly queue is empty or closing. Will check cancellation.");
                    if (stoppingToken.IsCancellationRequested) break; 
                    await Task.Delay(100, stoppingToken); 
                    continue;
                }

                _logger.LogInformation("Dequeued event with SourceType: {SourceType}, Host: {HostName}, Timestamp: {Timestamp}",
                    rawEvent.SourceType, rawEvent.HostName, rawEvent.Timestamp);

                IDataParser? parser = _parsers.FirstOrDefault(p => p.CanParse(rawEvent.SourceType));

                if (parser == null)
                {
                    _logger.LogWarning("No parser found for SourceType: {SourceType}. Event from host {HostName} will be skipped.", rawEvent.SourceType, rawEvent.HostName);
                    continue; 
                }

                _logger.LogDebug("Using parser {ParserType} for SourceType {SourceType}", parser.GetType().Name, rawEvent.SourceType);
                IEnumerable<object> processedItems = parser.Parse(rawEvent);

                var metricsToStore = new List<Metric>();
                // var logsToStore = new List<LogRecord>(); 

                foreach (var item in processedItems)
                {
                    if (item is Metric metric)
                    {
                        metricsToStore.Add(metric);
                    }
                    else
                    {
                        _logger.LogWarning("Parser returned an unknown item type: {ItemType}", item?.GetType().Name);
                    }
                }

                if (metricsToStore.Any())
                {
                    _logger.LogDebug("Storing {Count} metrics from SourceType {SourceType}, Host {HostName}.", metricsToStore.Count, rawEvent.SourceType, rawEvent.HostName);
                    await _dataRepository.StoreMetricsAsync(metricsToStore, stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("IngestionWorker ExecuteAsync loop cancelled.");
                break; 
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing event: {@RawEvent}. This event might be lost or retried depending on queue implementation.", rawEvent);
                await Task.Delay(1000, stoppingToken); 
            }
        }
        _logger.LogInformation("IngestionWorker stopping.");
    }

    public override async Task StopAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("IngestionWorker StopAsync called.");

        // Attempt to gracefully complete writing for in-memory queue.
        // This cast is a pragmatic choice for the MVP, as InMemoryMessageQueue is the only
        // implementation and has a specific method for graceful shutdown.
        // For other queue types or a more abstract approach, an IGracefulShutdownQueue interface
        // could be introduced, or rely on the queue client's own disposal/shutdown mechanisms.
        if (_queueConsumer is InMemoryMessageQueue<EventDto> inMemoryQueue)
        {
            _logger.LogInformation("Attempting to complete writing for InMemoryMessageQueue.");
            inMemoryQueue.CompleteWriting();
        }
        
        await base.StopAsync(stoppingToken);
        _logger.LogInformation("IngestionWorker has stopped.");
    }
}
