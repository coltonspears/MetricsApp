using MetricsApp.Agent.Core.Abstractions;
using MetricsApp.Abstractions.Queue;
using MetricsApp.Core.Models;

namespace MetricsApp.Api.Services;

/// <summary>
/// Background service that runs metric collectors and emits data to the ingestion queue
/// </summary>
public class CollectorBackgroundService : BackgroundService
{
    private readonly ILogger<CollectorBackgroundService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly IMessageQueueProducer<EventDto> _queue;
    private readonly TimeSpan _collectionInterval = TimeSpan.FromSeconds(15);

    public CollectorBackgroundService(
        ILogger<CollectorBackgroundService> logger,
        IServiceProvider serviceProvider,
        IMessageQueueProducer<EventDto> queue)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _queue = queue;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Collector Background Service starting...");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CollectAndEmitMetrics(stoppingToken);
                await Task.Delay(_collectionInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected when cancellation is requested
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in collector background service");
                // Wait a bit before retrying
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        _logger.LogInformation("Collector Background Service stopped.");
    }

    private async Task CollectAndEmitMetrics(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var collectors = scope.ServiceProvider.GetServices<IMetricCollector>();

        foreach (var collector in collectors)
        {
            try
            {
                _logger.LogDebug("Collecting metrics from {CollectorName}", collector.CollectorName);
                
                var events = await collector.CollectAsync(cancellationToken);
                var eventCount = 0;

                foreach (var eventDto in events)
                {
                    await _queue.EnqueueAsync(eventDto, cancellationToken);
                    eventCount++;
                }

                if (eventCount > 0)
                {
                    _logger.LogDebug("Collected and queued {EventCount} events from {CollectorName}", 
                        eventCount, collector.CollectorName);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error collecting metrics from {CollectorName}", collector.CollectorName);
            }
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Collector Background Service stopping...");
        await base.StopAsync(cancellationToken);

        // Dispose collectors
        using var scope = _serviceProvider.CreateScope();
        var collectors = scope.ServiceProvider.GetServices<IMetricCollector>();
        
        foreach (var collector in collectors)
        {
            try
            {
                if (collector is IDisposable disposable)
                {
                    disposable.Dispose();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error disposing collector {CollectorName}", collector.CollectorName);
            }
        }
    }
} 