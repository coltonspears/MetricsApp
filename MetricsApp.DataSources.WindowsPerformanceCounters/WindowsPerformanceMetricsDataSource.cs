using System.Diagnostics;
using System.Text.Json;
using MetricsApp.Abstractions.Data;
using MetricsApp.Abstractions.DataSources;
using MetricsApp.Agent.Collectors.WindowsPerfCounters;
using MetricsApp.Core.Models;
using MetricsApp.Parser.WindowsPerfCounters.Models;
using Microsoft.Extensions.Logging;


namespace MetricsApp.DataSources.WindowsPerformanceCounters;

public class WindowsPerformanceMetricsDataSource : IDataSource
{
    private readonly ILogger<WindowsPerformanceMetricsDataSource> _logger;
    private DataSourceConfiguration? _configuration;
    private List<PerformanceCounterWrapper> _counters;

    public string DataSourceType => "windowsperformancemetrics";
    public string DisplayName => "Windows Performance Counters";
    public string Description => "Query metrics from Windows Performance Counters.";
    public string Version => "1.0.0";

    // Helper class to manage PerformanceCounter instances
    private class PerformanceCounterWrapper : IDisposable
    {
        public PerformanceCounter Counter { get; }
        public string ConfiguredName { get; } // User-friendly name from config (DisplayName from payload)
        public string Category { get; }
        public string CounterNameProper { get; }
        public string? InstanceName { get; }


        public PerformanceCounterWrapper(string category, string counterName, string? instanceName, string configuredName)
        {
            ConfiguredName = configuredName;
            Category = category;
            CounterNameProper = counterName;
            InstanceName = instanceName;
            try
            {
                Counter = string.IsNullOrWhiteSpace(instanceName) || instanceName == "*"
                    ? new PerformanceCounter(category, counterName, true) // Read-only for single instance or aggregate
                    : new PerformanceCounter(category, counterName, instanceName, true); // Read-only
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to initialize performance counter '{category}\\{counterName}{(string.IsNullOrWhiteSpace(instanceName) ? "" : $"\\{instanceName}")}': {ex.Message}", ex);
            }
        }
        public void Dispose() => Counter?.Dispose();
    }


    public WindowsPerformanceMetricsDataSource(ILogger<WindowsPerformanceMetricsDataSource> logger)
    {
        _logger = logger;
        _counters = new List<PerformanceCounterWrapper>();
    }

    public DataSourceConfigurationSchema GetConfigurationSchema()
    {
        return new DataSourceConfigurationSchema
        {
            Fields = new List<ConfigurationField>
            {
                new ConfigurationField
                {
                    Name = "counters",
                    Label = "Performance Counters",
                    Description = "Define performance counters to monitor. Each counter needs a displayName, counterSet (category), counterName, and optionally instanceName. Example: [{\"displayName\": \"cpu_total\", \"counterSet\": \"Processor\", \"counterName\": \"% Processor Time\", \"instanceName\": \"_Total\"}]",
                    Type = ConfigurationFieldType.TextArea,
                    Required = true,
                    DefaultValue = "[{\"displayName\": \"cpu_total\", \"counterSet\": \"Processor\", \"counterName\": \"% Processor Time\", \"instanceName\": \"_Total\"}]"
                }
            },
             ValidationRules = new List<ValidationRule>
            {
                new ValidationRule
                {
                    FieldName = "counters",
                    Type = ValidationType.Required,
                    ErrorMessage = "At least one performance counter must be defined."
                }
            }
        };
    }

    public Task InitializeAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        _configuration = configuration;
        _counters.ForEach(c => c.Dispose());
        _counters.Clear();

        var countersConfigJson = GetConfigValue<string>(configuration.Properties, "counters", null);
        if (string.IsNullOrWhiteSpace(countersConfigJson))
        {
            _logger.LogWarning("No performance counters configured.");
            return Task.CompletedTask;
        }

        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var counterDefinitions = JsonSerializer.Deserialize<List<WindowsPerfCounterPayload>>(countersConfigJson, options);

            if (counterDefinitions == null || !counterDefinitions.Any())
            {
                _logger.LogWarning("Performance counters configuration is empty or could not be parsed.");
                return Task.CompletedTask;
            }

            foreach (var def in counterDefinitions)
            {
                if (string.IsNullOrWhiteSpace(def.CounterSet) || string.IsNullOrWhiteSpace(def.CounterName) || string.IsNullOrWhiteSpace(def.DisplayName))
                {
                    _logger.LogWarning("Skipping counter definition due to missing CounterSet, CounterName, or DisplayName. Payload: {Payload}", JsonSerializer.Serialize(def));
                    continue;
                }
                try
                {
                    _counters.Add(new PerformanceCounterWrapper(def.CounterSet, def.CounterName, def.InstanceName, def.DisplayName));
                    _logger.LogInformation("Initialized Performance Counter: {Category}\\{CounterNameProper}\\{InstanceName} as {MetricName}",
                        def.CounterSet, def.CounterName, def.InstanceName ?? "N/A", def.DisplayName);
                }
                catch (Exception ex)
                {
                     _logger.LogError(ex, "Failed to initialize performance counter: {DisplayName} ({Category}\\{CounterNameProper}\\{InstanceName})",
                        def.DisplayName, def.CounterSet, def.CounterName, def.InstanceName ?? "N/A");
                }
            }
        }
        catch (JsonException jsonEx)
        {
            _logger.LogError(jsonEx, "Error parsing performance counters JSON configuration.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error during performance counters initialization.");
        }
        return Task.CompletedTask;
    }


    public Task<DataSourceTestResult> TestConnectionAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            var countersConfigJson = GetConfigValue<string>(configuration.Properties, "counters", null);
            if (string.IsNullOrWhiteSpace(countersConfigJson))
            {
                 return Task.FromResult(DataSourceTestResult.Failure("No counters configured to test."));
            }

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var counterDefinitions = JsonSerializer.Deserialize<List<WindowsPerfCounterPayload>>(countersConfigJson, options);

            if (counterDefinitions == null || !counterDefinitions.Any())
            {
                return Task.FromResult(DataSourceTestResult.Failure("Could not parse any counter definitions from configuration."));
            }

            // Test the first valid counter definition
            var firstValidDef = counterDefinitions.FirstOrDefault(def =>
                !string.IsNullOrWhiteSpace(def.CounterSet) &&
                !string.IsNullOrWhiteSpace(def.CounterName) &&
                !string.IsNullOrWhiteSpace(def.DisplayName));

            if (firstValidDef == null)
            {
                return Task.FromResult(DataSourceTestResult.Failure("No valid counter definitions found in configuration to test."));
            }

            using var pc = new PerformanceCounter(firstValidDef.CounterSet, firstValidDef.CounterName, firstValidDef.InstanceName ?? (firstValidDef.CounterSet == "Processor" && firstValidDef.CounterName == "% Processor Time" ? "_Total" : null ), true);
            pc.NextValue(); // Initial call to ensure it's working

            stopwatch.Stop();
            return Task.FromResult(DataSourceTestResult.Success(stopwatch.ElapsedMilliseconds, $"Successfully initialized and tested performance counter: {firstValidDef.DisplayName}."));
        }
        catch (JsonException jsonEx)
        {
            stopwatch.Stop();
            _logger.LogError(jsonEx, "Failed to parse performance counters configuration for testing.");
            return Task.FromResult(DataSourceTestResult.Failure($"Test failed: Error parsing configuration - {jsonEx.Message}", jsonEx.ToString()));
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Failed to test Windows Performance Counters");
            return Task.FromResult(DataSourceTestResult.Failure($"Test failed: {ex.Message}", ex.ToString()));
        }
    }

    public Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("QueryLogsAsync is not applicable for WindowsPerformanceMetricsDataSource.");
        return Task.FromResult(new LogQueryResult { Logs = new List<LogRecord>(), ErrorMessage = "Log querying is not supported by this data source." });
    }

    public Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
    {
        if (_configuration == null)
            throw new InvalidOperationException("Datasource not initialized.");

        var timeSeriesList = new List<MetricTimeSeries>();

        foreach (var pcWrapper in _counters)
        {
            if (!string.IsNullOrWhiteSpace(criteria.Query) && !pcWrapper.ConfiguredName.Equals(criteria.Query, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            try
            {
                float value = pcWrapper.Counter.NextValue();
                var series = new MetricTimeSeries
                {
                    MetricInfo = new MetricDefinition
                    {
                        Name = pcWrapper.ConfiguredName,
                        Attributes = new Dictionary<string, object>
                        {
                            { "category", pcWrapper.Category },
                            { "counter", pcWrapper.CounterNameProper },
                            { "instance", pcWrapper.InstanceName ?? "N/A" }
                        }
                    },
                    Values = new List<Tuple<long, string>>
                    {
                        new Tuple<long, string>(DateTimeOffset.UtcNow.ToUnixTimeSeconds(), value.ToString("G", System.Globalization.CultureInfo.InvariantCulture))
                    }
                };
                timeSeriesList.Add(series);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading performance counter: {Name} ({Category}\\{CounterNameProper}\\{InstanceName})",
                    pcWrapper.ConfiguredName, pcWrapper.Category, pcWrapper.CounterNameProper, pcWrapper.InstanceName ?? "N/A");
            }
        }
        return Task.FromResult(new MetricQueryResult { ResultType = "matrix", Result = timeSeriesList });
    }

    public Task<DataSourceMetadata> GetMetadataAsync(CancellationToken cancellationToken = default)
    {
        var metadata = new DataSourceMetadata
        {
            AvailableMetrics = _counters.Select(c => c.ConfiguredName).Distinct().ToList(),
            AvailableFields = new List<DataSourceField>
            {
                new DataSourceField { Name = "value", Type = "number", IsAggregatable = true },
                new DataSourceField { Name = "category", Type = "string" },
                new DataSourceField { Name = "counter", Type = "string" },
                new DataSourceField { Name = "instance", Type = "string" }
            }
        };
        _logger.LogInformation("GetMetadataAsync for WindowsPerformanceMetricsDataSource returns configured counters.");
        return Task.FromResult(metadata);
    }

    public ValueTask DisposeAsync()
    {
        foreach (var counter in _counters)
        {
            counter.Dispose();
        }
        _counters.Clear();
        _configuration = null;
        return ValueTask.CompletedTask;
    }

    private T GetConfigValue<T>(Dictionary<string, object> properties, string key, T defaultValue)
    {
        if (properties.TryGetValue(key, out var value) && value != null)
        {
            try
            {
                if (value is JsonElement jsonElement)
                {
                    if (typeof(T) == typeof(string)) return (T)(object)jsonElement.GetString()!;
                    // For other types, JsonSerializer can deserialize from JsonElement
                    return JsonSerializer.Deserialize<T>(jsonElement.GetRawText())!;
                }
                return (T)Convert.ChangeType(value, typeof(T));
            }
            catch (Exception ex) { _logger.LogWarning(ex, "Failed to convert config value '{Key}'. Current value type: {Type}", key, value.GetType().FullName); }
        }
        return defaultValue;
    }
}