using System.Text.Json;
using MetricsApp.Agent.Core.Abstractions;
using MetricsApp.Core.Models;
using MetricsApp.Parser.WindowsPerfCounters.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MetricsApp.Agent.Core.Services
{ 
    public class MetricCollectionService : BackgroundService
    {
        private readonly ILogger<MetricCollectionService> _logger;
        private readonly IEnumerable<IMetricCollector> _collectors;
        private readonly IMetricEmitter _emitter;
        private readonly AgentOptions _options;

        public MetricCollectionService(
            ILogger<MetricCollectionService> logger,
            IEnumerable<IMetricCollector> collectors,
            IMetricEmitter emitter,
            IOptions<AgentOptions> options)
        {
            _logger = logger;
            _collectors = collectors;
            _emitter = emitter;
            _options = options.Value;

            if (!_collectors.Any())
            {
                _logger.LogWarning("MetricCollectionService started with no registered metric collectors.");
            }
            _logger.LogInformation("MetricCollectionService initialized with {CollectorCount} collectors. Collection interval: {Interval}", 
                                   _collectors.Count(), _options.CollectionInterval);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("MetricCollectionService is starting.");
            await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogDebug("Starting metrics collection cycle at {Time}", DateTimeOffset.Now);
                var allCollectedEvents = new List<EventDto>();

                foreach (var collector in _collectors)
                {
                    if (stoppingToken.IsCancellationRequested) break;

                    try
                    {
                        _logger.LogDebug("Running collector: {CollectorName}", collector.CollectorName);
                        var collectedEvents = await collector.CollectAsync(stoppingToken);
                        if (collectedEvents.Any())
                        {
                            allCollectedEvents.AddRange(collectedEvents);
                            _logger.LogInformation("Collector {CollectorName} gathered {Count} events.", collector.CollectorName, collectedEvents.Count());
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error during metric collection from {CollectorName}.", collector.CollectorName);
                    }
                }

                if (stoppingToken.IsCancellationRequested) break;

                if (allCollectedEvents.Any())
                {
                    _logger.LogInformation("--- BEGIN Real-time Collected Metrics Visualization ---");
                    foreach (var collectedEvent in allCollectedEvents)
                    {
                        string payloadSummary = "N/A";
                        if (collectedEvent.Payload is WindowsPerfCounterPayload perfPayload)
                        {
                            payloadSummary = $"PerfCounter: {perfPayload.CounterSet}\\{perfPayload.CounterName}{(string.IsNullOrEmpty(perfPayload.InstanceName) ? "" : "\\" + perfPayload.InstanceName)} = {perfPayload.Value}";
                        }
                        else if (collectedEvent.Payload != null)
                        {
                            try
                            {
                                payloadSummary = JsonSerializer.Serialize(collectedEvent.Payload, new JsonSerializerOptions { WriteIndented = false });
                            }
                            catch { payloadSummary = "Error serializing payload."; }
                        }
                        _logger.LogInformation("  [VISUALIZATION] Host: {HostName}, Source: {SourceType}, Time: {Timestamp}, Payload: {PayloadSummary}",
                            collectedEvent.HostName,
                            collectedEvent.SourceType,
                            collectedEvent.Timestamp.ToString("o"),
                            payloadSummary);
                    }
                    _logger.LogInformation("--- END Real-time Collected Metrics Visualization ---");

                    
                    try
                    {
                        _logger.LogInformation("Attempting to emit {Count} collected events.", allCollectedEvents.Count);
                        await _emitter.EmitAsync(allCollectedEvents, stoppingToken);
                        _logger.LogInformation("Successfully emitted {Count} events.", allCollectedEvents.Count);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error emitting collected metrics.");
                        // Consider retry logic or local buffering/DLQ for the agent here
                    }
                }
                else
                {
                    _logger.LogInformation("No events collected in this cycle.");
                }
                
                try
                {
                    if (!stoppingToken.IsCancellationRequested)
                    {
                         _logger.LogDebug("Metrics collection cycle finished. Waiting for {Interval}.", _options.CollectionInterval);
                        await Task.Delay(_options.CollectionInterval, stoppingToken);
                    }
                }
                catch (OperationCanceledException)
                {
                    // This is expected when stopping
                    _logger.LogInformation("MetricCollectionService delay was canceled.");
                }
            }
            _logger.LogInformation("MetricCollectionService is stopping.");
        }
    }
}
