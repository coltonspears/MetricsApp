using System.Diagnostics;
using MetricsApp.Agent.Core.Abstractions;
using MetricsApp.Agent.Core.Services;
using MetricsApp.Core.Models;
using MetricsApp.Parser.WindowsPerfCounters.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MetricsApp.Agent.Collectors.WindowsPerfCounters
{
        
    public class PerfCounterSetting
    {
        public string CounterSet { get; set; } = string.Empty;
        public string CounterName { get; set; } = string.Empty;
        public string? InstanceName { get; set; } // Can be null, or "*" for all instances
        public string? DisplayName { get; set; } // Optional: for a more friendly metric name if needed
    }

    public class WindowsPerfCounterCollectorOptions
    {
        public List<PerfCounterSetting> Counters { get; set; } = new List<PerfCounterSetting>();
        public string HostNameOverride { get; set; } = string.Empty; // Optional: override default hostname
    }

    public class WindowsPerfCounterCollector : IMetricCollector
    {
        private readonly ILogger<WindowsPerfCounterCollector> _logger;
        private readonly List<PerformanceCounter> _performanceCounters;
        private readonly List<PerfCounterSetting> _counterSettings;
        private readonly string _hostName;
        public string CollectorName => "WindowsPerformanceCounters";

        public WindowsPerfCounterCollector(
            ILogger<WindowsPerfCounterCollector> logger,
            IOptions<WindowsPerfCounterCollectorOptions> options,
            IOptions<AgentOptions> agentOptions) // To get default hostname
        {
            _logger = logger;
            _counterSettings = options.Value.Counters ?? new List<PerfCounterSetting>();
            _performanceCounters = new List<PerformanceCounter>();

            _hostName = !string.IsNullOrWhiteSpace(options.Value.HostNameOverride)
                            ? options.Value.HostNameOverride
                            : agentOptions.Value.DefaultHostName;

            if (OperatingSystem.IsWindows())
            {
                InitializeCounters();
            }
            else
            {
                _logger.LogWarning("{CollectorName}: Skipping initialization as not running on Windows.", CollectorName);
            }
        }

        private void InitializeCounters()
        {
            if (!_counterSettings.Any())
            {
                _logger.LogWarning("No performance counters configured for {CollectorName}.", CollectorName);
                return;
            }

            foreach (var setting in _counterSettings)
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(setting.CounterSet) || string.IsNullOrWhiteSpace(setting.CounterName))
                    {
                        _logger.LogWarning("Invalid performance counter setting: CounterSet or CounterName is missing. Setting: {@Setting}", setting);
                        continue;
                    }

                    if (setting.InstanceName == "*") // Collect all instances
                    {
                        var category = new PerformanceCounterCategory(setting.CounterSet);
                        string[] instanceNames = category.GetInstanceNames();
                        if (instanceNames.Length == 0) // Instance-less counter
                        {
                             _performanceCounters.Add(new PerformanceCounter(setting.CounterSet, setting.CounterName, readOnly: true));
                            _logger.LogInformation("Initialized instance-less counter: {Category}\\{Counter}", setting.CounterSet, setting.CounterName);
                        }
                        else
                        {
                            foreach (var instance in instanceNames)
                            {
                                _performanceCounters.Add(new PerformanceCounter(setting.CounterSet, setting.CounterName, instance, readOnly: true));
                                _logger.LogInformation("Initialized counter: {Category}\\{Counter}, Instance: {Instance}", setting.CounterSet, setting.CounterName, instance);
                            }
                        }
                    }
                    else if (string.IsNullOrEmpty(setting.InstanceName)) // Instance-less counter
                    {
                        _performanceCounters.Add(new PerformanceCounter(setting.CounterSet, setting.CounterName, readOnly: true));
                        _logger.LogInformation("Initialized instance-less counter: {Category}\\{Counter}", setting.CounterSet, setting.CounterName);
                    }
                    else // Specific instance
                    {
                        _performanceCounters.Add(new PerformanceCounter(setting.CounterSet, setting.CounterName, setting.InstanceName, readOnly: true));
                        _logger.LogInformation("Initialized counter: {Category}\\{Counter}, Instance: {Instance}", setting.CounterSet, setting.CounterName, setting.InstanceName);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to initialize performance counter: {Category}\\{Counter}, Instance: {Instance}",
                                     setting.CounterSet, setting.CounterName, setting.InstanceName ?? "(none)");
                }
            }
            _logger.LogInformation("WindowsPerfCounterCollector initialized with {Count} active counters.", _performanceCounters.Count);
        }

        public Task<IEnumerable<EventDto>> CollectAsync(CancellationToken cancellationToken = default)
        {
            var events = new List<EventDto>();
            if (!_performanceCounters.Any())
            {
                _logger.LogDebug("No performance counters available to collect.");
                return Task.FromResult(Enumerable.Empty<EventDto>());
            }

            _logger.LogDebug("Collecting values for {Count} performance counters.", _performanceCounters.Count);
            foreach (var counter in _performanceCounters)
            {
                if (cancellationToken.IsCancellationRequested) break;
                try
                {
                    float value = counter.NextValue(); // Get the current value
                    var payload = new WindowsPerfCounterPayload
                    {
                        CounterSet = counter.CategoryName,
                        CounterName = counter.CounterName,
                        InstanceName = string.IsNullOrEmpty(counter.InstanceName) ? null : counter.InstanceName,
                        Value = Convert.ToDouble(value)
                    };

                    events.Add(new EventDto
                    {
                        SourceType = "WindowsPerfCounter", // Matches your sink's parser
                        Timestamp = DateTimeOffset.UtcNow,
                        HostName = _hostName,
                        Payload = payload
                    });
                    _logger.LogTrace("Collected: {Category}\\{Counter}\\{Instance} = {Value}", 
                                     counter.CategoryName, counter.CounterName, counter.InstanceName ?? "(none)", value);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error reading performance counter: {Category}\\{Counter}, Instance: {Instance}",
                                     counter.CategoryName, counter.CounterName, counter.InstanceName ?? "(none)");
                }
            }
            return Task.FromResult<IEnumerable<EventDto>>(events);
        }
        
        public void Dispose()
        {
            foreach (var counter in _performanceCounters)
            {
                counter.Dispose();
            }
            _performanceCounters.Clear();
            _logger.LogInformation("{CollectorName}: Disposed.", CollectorName);
            GC.SuppressFinalize(this);
        }
    }
}
