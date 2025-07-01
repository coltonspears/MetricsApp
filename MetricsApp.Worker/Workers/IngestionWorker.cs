using MetricsApp.Abstractions.Queue;
using MetricsApp.Abstractions.Parsers;
using MetricsApp.Abstractions.Data;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MetricsApp.Queue.InMemory;
using Microsoft.Extensions.DependencyInjection;

namespace MetricsApp.Worker.Workers;

public class IngestionWorker : BackgroundService
{
    private readonly ILogger<IngestionWorker> _logger;
    private readonly IEnumerable<IDataParser> _parsers;
    private readonly IServiceProvider _serviceProvider; 
    
    public IngestionWorker(
        ILogger<IngestionWorker> logger,
        IEnumerable<IDataParser> parsers,
        IDataRepository dataRepository,
        IServiceProvider serviceProvider) 
    {
        _logger = logger;
        _parsers = parsers;
        _serviceProvider = serviceProvider;
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
                using var scope = _serviceProvider.CreateScope();
                
                var consumer = scope.ServiceProvider.GetRequiredService<IMessageQueueConsumer<EventDto>>();
                var dataRepository = scope.ServiceProvider.GetRequiredService<IDataRepository>();

                rawEvent = await consumer.DequeueAsync(stoppingToken);

                if (rawEvent == null)
                {
                    _logger.LogTrace(
                        "Dequeued null event, possibly queue is empty or closing. Will check cancellation.");
                    if (stoppingToken.IsCancellationRequested) break;
                    await Task.Delay(100, stoppingToken);
                    continue;
                }

                _logger.LogInformation(
                    "Dequeued event with SourceType: {SourceType}, Host: {HostName}, Timestamp: {Timestamp}",
                    rawEvent.SourceType, rawEvent.HostName, rawEvent.Timestamp);

                IDataParser? parser = _parsers.FirstOrDefault(p => p.CanParse(rawEvent.SourceType));

                if (parser == null)
                {
                    _logger.LogWarning(
                        "No parser found for SourceType: {SourceType}. Event from host {HostName} will be skipped.",
                        rawEvent.SourceType, rawEvent.HostName);
                    continue;
                }

                _logger.LogDebug("Using parser {ParserType} for SourceType {SourceType}", parser.GetType().Name,
                    rawEvent.SourceType);
                IEnumerable<object> processedItems = parser.Parse(rawEvent);

                var metricsToStore = new List<Metric>();
                var logsToStore = new List<LogRecord>();

                foreach (var item in processedItems)
                {
                    if (item is Metric metric)
                    {
                        metricsToStore.Add(metric);
                    }
                    else if (item is LogRecord log)
                    {
                        logsToStore.Add(log);
                    }
                    else
                    {
                        _logger.LogWarning("Parser returned an unknown item type: {ItemType}",
                            item?.GetType().Name);
                    }
                }

                if (metricsToStore.Any())
                {
                    _logger.LogDebug("Storing {Count} metrics from SourceType {SourceType}, Host {HostName}.",
                        metricsToStore.Count, rawEvent.SourceType, rawEvent.HostName);
                    
                    await dataRepository.StoreMetricsAsync(metricsToStore, stoppingToken);
                }

                if (logsToStore.Any())
                {
                    _logger.LogDebug("Storing {Count} logs from SourceType {SourceType}, Host {HostName}.",
                        logsToStore.Count, rawEvent.SourceType, rawEvent.HostName);
                    
                    await dataRepository.StoreLogsAsync(logsToStore, stoppingToken);
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
        
        using var scope = _serviceProvider.CreateScope();
                
        var consumer = scope.ServiceProvider.GetRequiredService<IMessageQueueConsumer<EventDto>>();
        
        if (consumer is InMemoryMessageQueue<EventDto> inMemoryQueue)
        {
            _logger.LogInformation("Attempting to complete writing for InMemoryMessageQueue.");
            inMemoryQueue.CompleteWriting();
        }
        
        await base.StopAsync(stoppingToken);
        _logger.LogInformation("IngestionWorker has stopped.");
    }
}
