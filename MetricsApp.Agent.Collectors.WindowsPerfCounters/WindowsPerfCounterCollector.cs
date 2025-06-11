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
        /// <summary>
        /// Performance counter category (e.g., "Processor", "Memory", "PhysicalDisk")
        /// </summary>
        public string CounterSet { get; set; } = string.Empty;
        
        /// <summary>
        /// Counter name (e.g., "% Processor Time", "Available MBytes")
        /// </summary>
        public string CounterName { get; set; } = string.Empty;
        
        /// <summary>
        /// Instance name - null for no instance, "*" for all instances, or specific instance name
        /// </summary>
        public string? InstanceName { get; set; }
        
        /// <summary>
        /// Optional friendly name for the metric (used in graphs/dashboards)
        /// </summary>
        public string? DisplayName { get; set; }
        
        /// <summary>
        /// Collection frequency in seconds (overrides global frequency for this counter)
        /// </summary>
        public int? FrequencySeconds { get; set; }
        
        /// <summary>
        /// Whether this counter is enabled for collection
        /// </summary>
        public bool Enabled { get; set; } = true;
        
        /// <summary>
        /// Tags to apply to this metric for filtering/grouping
        /// </summary>
        public Dictionary<string, string> Tags { get; set; } = new();
        
        /// <summary>
        /// Scaling factor to apply to the raw counter value
        /// </summary>
        public double ScaleFactor { get; set; } = 1.0;
        
        /// <summary>
        /// Unit of measurement (e.g., "percent", "bytes", "count")
        /// </summary>
        public string Unit { get; set; } = "value";
    }

    public class WindowsPerfCounterCollectorOptions
    {
        /// <summary>
        /// List of performance counters to collect
        /// </summary>
        public List<PerfCounterSetting> Counters { get; set; } = new();
        
        /// <summary>
        /// Default collection frequency in seconds (can be overridden per counter)
        /// </summary>
        public int DefaultFrequencySeconds { get; set; } = 30;
        
        /// <summary>
        /// Optional hostname override
        /// </summary>
        public string HostNameOverride { get; set; } = string.Empty;
        
        /// <summary>
        /// Whether to collect system-wide counters automatically
        /// </summary>
        public bool EnableSystemCounters { get; set; } = true;
        
        /// <summary>
        /// Whether to collect process-specific counters
        /// </summary>
        public bool EnableProcessCounters { get; set; } = false;
        
        /// <summary>
        /// Maximum number of counter instances to collect (prevents memory issues)
        /// </summary>
        public int MaxInstances { get; set; } = 100;
        
        /// <summary>
        /// Global tags to apply to all metrics from this collector
        /// </summary>
        public Dictionary<string, string> GlobalTags { get; set; } = new();
        
        /// <summary>
        /// Predefined counter sets for easy configuration
        /// </summary>
        public List<string> CounterSets { get; set; } = new();
    }

    /// <summary>
    /// Predefined sets of commonly used performance counters
    /// </summary>
    public static class PredefinedCounterSets
    {
        public static readonly Dictionary<string, List<PerfCounterSetting>> Sets = new()
        {
            ["system-basic"] = new List<PerfCounterSetting>
            {
                new() { CounterSet = "Processor", CounterName = "% Processor Time", InstanceName = "_Total", DisplayName = "CPU Usage", Unit = "percent" },
                new() { CounterSet = "Memory", CounterName = "Available MBytes", DisplayName = "Available Memory", Unit = "MB" },
                new() { CounterSet = "Memory", CounterName = "% Committed Bytes In Use", DisplayName = "Memory Usage", Unit = "percent" }
            },
            
            ["system-detailed"] = new List<PerfCounterSetting>
            {
                new() { CounterSet = "Processor", CounterName = "% Processor Time", InstanceName = "_Total", DisplayName = "CPU Usage", Unit = "percent" },
                new() { CounterSet = "Processor", CounterName = "% User Time", InstanceName = "_Total", DisplayName = "CPU User Time", Unit = "percent" },
                new() { CounterSet = "Processor", CounterName = "% Privileged Time", InstanceName = "_Total", DisplayName = "CPU System Time", Unit = "percent" },
                new() { CounterSet = "Memory", CounterName = "Available MBytes", DisplayName = "Available Memory", Unit = "MB" },
                new() { CounterSet = "Memory", CounterName = "% Committed Bytes In Use", DisplayName = "Memory Usage", Unit = "percent" },
                new() { CounterSet = "Memory", CounterName = "Cache Bytes", DisplayName = "Cache Memory", Unit = "bytes", ScaleFactor = 1.0/(1024*1024) },
                new() { CounterSet = "PhysicalDisk", CounterName = "% Disk Time", InstanceName = "_Total", DisplayName = "Disk Usage", Unit = "percent" },
                new() { CounterSet = "PhysicalDisk", CounterName = "Disk Reads/sec", InstanceName = "_Total", DisplayName = "Disk Reads", Unit = "ops/sec" },
                new() { CounterSet = "PhysicalDisk", CounterName = "Disk Writes/sec", InstanceName = "_Total", DisplayName = "Disk Writes", Unit = "ops/sec" }
            },
            
            ["network"] = new List<PerfCounterSetting>
            {
                new() { CounterSet = "Network Interface", CounterName = "Bytes Total/sec", InstanceName = "*", DisplayName = "Network Throughput", Unit = "bytes/sec" },
                new() { CounterSet = "Network Interface", CounterName = "Bytes Received/sec", InstanceName = "*", DisplayName = "Network Received", Unit = "bytes/sec" },
                new() { CounterSet = "Network Interface", CounterName = "Bytes Sent/sec", InstanceName = "*", DisplayName = "Network Sent", Unit = "bytes/sec" }
            },
            
            ["iis"] = new List<PerfCounterSetting>
            {
                new() { CounterSet = "Web Service", CounterName = "Current Connections", InstanceName = "_Total", DisplayName = "IIS Connections", Unit = "count" },
                new() { CounterSet = "Web Service", CounterName = "Get Requests/sec", InstanceName = "_Total", DisplayName = "HTTP GET Requests", Unit = "requests/sec" },
                new() { CounterSet = "Web Service", CounterName = "Post Requests/sec", InstanceName = "_Total", DisplayName = "HTTP POST Requests", Unit = "requests/sec" },
                new() { CounterSet = "ASP.NET Applications", CounterName = "Requests/Sec", InstanceName = "_Total", DisplayName = "ASP.NET Requests", Unit = "requests/sec" }
            }
        };
        
        /// <summary>
        /// Get counters for the specified predefined sets
        /// </summary>
        public static List<PerfCounterSetting> GetCountersForSets(IEnumerable<string> setNames)
        {
            var counters = new List<PerfCounterSetting>();
            foreach (var setName in setNames)
            {
                if (Sets.TryGetValue(setName, out var setCounters))
                {
                    counters.AddRange(setCounters);
                }
            }
            return counters;
        }
    }

    public class WindowsPerfCounterCollector : IMetricCollector
    {
        private readonly ILogger<WindowsPerfCounterCollector> _logger;
        private readonly List<PerformanceCounter> _performanceCounters;
        private readonly List<PerfCounterSetting> _counterSettings;
        private readonly string _hostName;
        private readonly WindowsPerfCounterCollectorOptions _options;

        public string CollectorName => "WindowsPerformanceCounters";

        public WindowsPerfCounterCollector(
            ILogger<WindowsPerfCounterCollector> logger,
            IOptions<WindowsPerfCounterCollectorOptions> options,
            IOptions<AgentOptions> agentOptions)
        {
            _logger = logger;
            _options = options.Value;
            _performanceCounters = new List<PerformanceCounter>();

            // Combine explicitly configured counters with predefined sets
            _counterSettings = new List<PerfCounterSetting>(_options.Counters);
            if (_options.CounterSets.Any())
            {
                var predefinedCounters = PredefinedCounterSets.GetCountersForSets(_options.CounterSets);
                _counterSettings.AddRange(predefinedCounters);
            }

            // Filter to only enabled counters
            _counterSettings = _counterSettings.Where(c => c.Enabled).ToList();

            _hostName = !string.IsNullOrWhiteSpace(_options.HostNameOverride)
                            ? _options.HostNameOverride
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

            var initializedCount = 0;
            foreach (var setting in _counterSettings)
            {
                if (initializedCount >= _options.MaxInstances)
                {
                    _logger.LogWarning("Reached maximum instance limit ({MaxInstances}), skipping remaining counters.", _options.MaxInstances);
                    break;
                }

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
                            initializedCount++;
                        }
                        else
                        {
                            foreach (var instance in instanceNames.Take(_options.MaxInstances - initializedCount))
                            {
                                _performanceCounters.Add(new PerformanceCounter(setting.CounterSet, setting.CounterName, instance, readOnly: true));
                                _logger.LogInformation("Initialized counter: {Category}\\{Counter}, Instance: {Instance}", setting.CounterSet, setting.CounterName, instance);
                                initializedCount++;
                                
                                if (initializedCount >= _options.MaxInstances) break;
                            }
                        }
                    }
                    else if (string.IsNullOrEmpty(setting.InstanceName)) // Instance-less counter
                    {
                        _performanceCounters.Add(new PerformanceCounter(setting.CounterSet, setting.CounterName, readOnly: true));
                        _logger.LogInformation("Initialized instance-less counter: {Category}\\{Counter}", setting.CounterSet, setting.CounterName);
                        initializedCount++;
                    }
                    else // Specific instance
                    {
                        _performanceCounters.Add(new PerformanceCounter(setting.CounterSet, setting.CounterName, setting.InstanceName, readOnly: true));
                        _logger.LogInformation("Initialized counter: {Category}\\{Counter}, Instance: {Instance}", setting.CounterSet, setting.CounterName, setting.InstanceName);
                        initializedCount++;
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
                    float rawValue = counter.NextValue();
                    var setting = FindSettingForCounter(counter);
                    var scaledValue = rawValue * setting.ScaleFactor;
                    
                    var payload = new MetricsApp.Parser.WindowsPerfCounters.Models.WindowsPerfCounterPayload
                    {
                        CounterSet = counter.CategoryName,
                        CounterName = counter.CounterName,
                        InstanceName = string.IsNullOrEmpty(counter.InstanceName) ? null : counter.InstanceName,
                        Value = Convert.ToDouble(scaledValue),
                        Unit = setting.Unit,
                        DisplayName = setting.DisplayName ?? $"{counter.CategoryName}\\{counter.CounterName}",
                        Tags = CombineTags(setting.Tags)
                    };

                    events.Add(new EventDto
                    {
                        SourceType = "WindowsPerfCounter",
                        Timestamp = DateTimeOffset.UtcNow,
                        HostName = _hostName,
                        Payload = payload
                    });
                    
                    _logger.LogTrace("Collected: {DisplayName} = {Value} {Unit}", 
                                     payload.DisplayName, scaledValue, setting.Unit);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error reading performance counter: {Category}\\{Counter}, Instance: {Instance}",
                                     counter.CategoryName, counter.CounterName, counter.InstanceName ?? "(none)");
                }
            }
            
            return Task.FromResult<IEnumerable<EventDto>>(events);
        }

        private PerfCounterSetting FindSettingForCounter(PerformanceCounter counter)
        {
            return _counterSettings.FirstOrDefault(s => 
                s.CounterSet == counter.CategoryName && 
                s.CounterName == counter.CounterName &&
                (s.InstanceName == null || s.InstanceName == "*" || s.InstanceName == counter.InstanceName)
            ) ?? new PerfCounterSetting 
            { 
                CounterSet = counter.CategoryName, 
                CounterName = counter.CounterName, 
                InstanceName = counter.InstanceName 
            };
        }

        private Dictionary<string, string> CombineTags(Dictionary<string, string> counterTags)
        {
            var combined = new Dictionary<string, string>(_options.GlobalTags);
            foreach (var tag in counterTags)
            {
                combined[tag.Key] = tag.Value;
            }
            return combined;
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
