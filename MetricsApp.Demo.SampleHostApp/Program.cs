// See https://aka.ms/new-console-template for more information

// Set up configuration to load appsettings.json

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.IO; // For Path
using System.Threading.Tasks; // For Task
using System.Text.Json; // For JsonSerializer
using MetricsApp.Abstractions.Queue; // For IMessageQueueConsumer
using MetricsApp.Core.Models; // For EventDto
using System.Threading; // For CancellationToken
using System;
using MetricsApp.Queue.InMemory; // For Environment, TimeSpan
using Microsoft.Extensions.Configuration;

namespace MetricsApp.Demo.SampleHostApp
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT") ?? "Production"}.json", optional: true)
                .AddEnvironmentVariables();
            
            var configuration = builder.Build();
            
            var host = Host.CreateDefaultBuilder(args)
                .ConfigureAppConfiguration((hostingContext, config) =>
                {
                    // Clear existing providers if necessary, or just add ours.
                    // config.Sources.Clear(); // Optional: if you want to remove default providers
                    config.AddConfiguration(configuration); // Add our pre-built configuration
                })
                .ConfigureLogging(logging =>
                {
                    logging.ClearProviders();
                    logging.AddConsole();
                    // Configure log levels based on appsettings.json
                    logging.AddConfiguration(configuration.GetSection("Logging"));
                })
                .ConfigureServices((hostContext, services) =>
                {
                    // 1. Register InMemoryQueue (provides IMessageQueueProducer for the Emitter)
                    services.AddInMemoryQueue();

                    // 2. Register Agent Core Services
                    services.AddMetricsAgentCore(hostContext.Configuration);
                    

                    // 3. Register Specific Collectors
                    if (OperatingSystem.IsWindows()) // Only add PerfCounter collector on Windows
                    {
                        services.AddWindowsPerfCounterCollector(hostContext.Configuration);
                    }
                    else
                    {
                        Console.WriteLine("Skipping Windows Performance Counter Collector as not running on Windows.");
                    }


                    // 4. Register Specific Emitter (Queue Emitter for this demo)
                    services.AddHttpMetricEmitter(hostContext.Configuration);
                    //services.AddQueueMetricEmitter();

                    // 5. Add a Verifying Consumer (optional, to see metrics in console)
                    //services.AddHostedService<VerifyingMetricConsumer>();
                })
                .Build();
            
            Console.WriteLine("Demo Metrics Agent Host starting...");
            Console.WriteLine("This agent will collect metrics and attempt to send them to the configured HTTP endpoint.");
            Console.WriteLine("Ensure your Metrics Sink API (from csharp_mvp_perf_counters) is running and accessible.");
            Console.WriteLine($"Target API for metrics: {configuration.GetValue<string>("MetricsAgent:HttpEmitter:BaseUrl")}{configuration.GetValue<string>("MetricsAgent:HttpEmitter:IngestPath", "/api/v1/ingest")}");
            Console.WriteLine($"Collection interval: {configuration.GetValue<string>("MetricsAgent:CollectionInterval", "00:00:10")}");
            
            await host.RunAsync();
        }
    }
    
    public class VerifyingMetricConsumer : BackgroundService
    {
        private readonly ILogger<VerifyingMetricConsumer> _logger;
        private readonly IMessageQueueConsumer<EventDto> _queueConsumer;

        public VerifyingMetricConsumer(ILogger<VerifyingMetricConsumer> logger, IMessageQueueConsumer<EventDto> queueConsumer)
        {
            _logger = logger;
            _queueConsumer = queueConsumer;
            _logger.LogInformation("VerifyingMetricConsumer: Initialized.");
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("VerifyingMetricConsumer: Starting to listen for metrics on the in-memory queue.");
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var eventDto = await _queueConsumer.DequeueAsync(stoppingToken);
                    if (eventDto != null)
                    {
                        // Log the received metric (or a summary)
                        string payloadJson = eventDto.Payload != null ? JsonSerializer.Serialize(eventDto.Payload) : "null";
                        _logger.LogInformation("VerifyingMetricConsumer: Dequeued Metric! Host: {HostName}, SourceType: {SourceType}, Timestamp: {Timestamp}, Payload: {Payload}",
                                               eventDto.HostName, eventDto.SourceType, eventDto.Timestamp, payloadJson);
                    }
                    else
                    {
                        // Queue might be empty or closing down
                        if(stoppingToken.IsCancellationRequested) break;
                        await Task.Delay(100, stoppingToken); // Small delay if queue is empty
                    }
                }
                catch (OperationCanceledException)
                {
                     _logger.LogInformation("VerifyingMetricConsumer: Operation canceled, stopping.");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "VerifyingMetricConsumer: Error dequeuing or processing metric.");
                    await Task.Delay(1000, stoppingToken); // Delay before retrying on error
                }
            }
            _logger.LogInformation("VerifyingMetricConsumer: Stopped.");
        }
    }
}


