using System.Collections.Concurrent;
using MetricsApp.Abstractions.Data;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Repository.InMemory;

public class InMemoryDataRepository : IDataRepository
    {
        private readonly ConcurrentBag<Metric> _metricsStore = new ConcurrentBag<Metric>();
        private readonly ConcurrentBag<LogRecord> _logsStore = new ConcurrentBag<LogRecord>();
        private readonly ILogger<InMemoryDataRepository> _logger;

        public InMemoryDataRepository(ILogger<InMemoryDataRepository> logger)
        {
            _logger = logger;
            _logger.LogInformation("InMemoryDataRepository initialized.");
        }

        public Task StoreLogsAsync(IEnumerable<LogRecord> logs, CancellationToken cancellationToken = default)
        {
            if (logs == null) return Task.CompletedTask;

            int count = 0;
            foreach (var log in logs)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    _logger.LogWarning("StoreLogsAsync cancelled during batch processing.");
                    break;
                }
                _logsStore.Add(log);
                count++;
            }
            _logger.LogInformation("{Count} logs stored in-memory.", count);
            return Task.CompletedTask;
        }

        public Task StoreMetricsAsync(IEnumerable<Metric> metrics, CancellationToken cancellationToken = default)
        {
            if (metrics == null) return Task.CompletedTask;

            int count = 0;
            foreach (var metric in metrics)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    _logger.LogWarning("StoreMetricsAsync cancelled during batch processing.");
                    break;
                }
                _metricsStore.Add(metric);
                count++;
            }
            _logger.LogInformation("{Count} metrics stored in-memory.", count);
            return Task.CompletedTask;
        }

        public Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            _logger.LogDebug("Querying in-memory logs with criteria: Start={StartTime}, End={EndTime}, Query='{QueryString}', Limit={Limit}",
                criteria.StartTime, criteria.EndTime, criteria.Query, criteria.Limit);

            var queryableLogs = _logsStore.AsEnumerable(); // Work with a snapshot

            // Filter by time range
            queryableLogs = queryableLogs.Where(l => l.Timestamp >= criteria.StartTime && l.Timestamp <= criteria.EndTime);

            // Simple query filtering on body content
            if (!string.IsNullOrWhiteSpace(criteria.Query))
            {
                var query = criteria.Query.ToLowerInvariant();
                queryableLogs = queryableLogs.Where(l => 
                    l.Body?.ToString()?.ToLowerInvariant().Contains(query) == true ||
                    l.SeverityText?.ToLowerInvariant().Contains(query) == true ||
                    l.Attributes.Values.Any(v => v?.ToString()?.ToLowerInvariant().Contains(query) == true));
            }

            var filteredLogs = queryableLogs
                .OrderByDescending(l => l.Timestamp)
                .Skip(criteria.Offset)
                .Take(criteria.Limit)
                .ToList();

            _logger.LogInformation("Found {Count} logs matching criteria.", filteredLogs.Count);

            var result = new LogQueryResult
            {
                Logs = filteredLogs,
                TotalHits = filteredLogs.Count, // This is an approximation for in-memory impl
                NextPageToken = null // Simplified for in-memory impl
            };

            return Task.FromResult(result);
        }

        public Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            _logger.LogDebug("Querying in-memory metrics with criteria: Start={StartTime}, End={EndTime}, Query='{QueryString}', Limit={Limit}",
                criteria.StartTime, criteria.EndTime, criteria.Query, criteria.Limit);

            var queryableMetrics = _metricsStore.AsEnumerable(); // Work with a snapshot

            queryableMetrics = queryableMetrics.Where(m => m.Timestamp >= criteria.StartTime && m.Timestamp <= criteria.EndTime);

            // Parse criteria.Query (e.g., "metricName=win.cpu&resource.host=S1")
            // This is a simplified parser for the MVP.
            string? filterMetricName = null;
            var filters = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            if (!string.IsNullOrWhiteSpace(criteria.Query))
            {
                var pairs = criteria.Query.Split('&', StringSplitOptions.RemoveEmptyEntries);
                foreach (var pair in pairs)
                {
                    var keyValue = pair.Split('=', 2, StringSplitOptions.RemoveEmptyEntries);
                    if (keyValue.Length == 2)
                    {
                        if (keyValue[0].Equals("metricName", StringComparison.OrdinalIgnoreCase) ||
                            keyValue[0].Equals("name", StringComparison.OrdinalIgnoreCase))
                        {
                            filterMetricName = keyValue[1];
                        }
                        else
                        {
                            filters[keyValue[0]] = keyValue[1];
                        }
                    }
                }
            }
            
            if (!string.IsNullOrWhiteSpace(filterMetricName))
            {
                queryableMetrics = queryableMetrics.Where(m => m.Name.Equals(filterMetricName, StringComparison.OrdinalIgnoreCase));
            }

            if (filters.Any())
            {
                foreach (var filter in filters)
                {
                    queryableMetrics = queryableMetrics.Where(m =>
                    {
                        if (filter.Key.StartsWith("resource."))
                        {
                            var resourceKey = filter.Key.Substring("resource.".Length);
                            return m.Resource.TryGetValue(resourceKey, out var val) && val?.ToString()?.Equals(filter.Value, StringComparison.OrdinalIgnoreCase) == true;
                        }
                        if (filter.Key.StartsWith("attributes."))
                        {
                            var attributeKey = filter.Key.Substring("attributes.".Length);
                            return m.Attributes.TryGetValue(attributeKey, out var val) && val?.ToString()?.Equals(filter.Value, StringComparison.OrdinalIgnoreCase) == true;
                        }
                        // Allow filtering by top-level metric properties like 'unit' or 'type' if desired
                        // Example: if (filter.Key.Equals("unit", StringComparison.OrdinalIgnoreCase)) return m.Unit == filter.Value;
                        return false; // Unknown filter prefix or unhandled filter
                    });
                }
            }

            var filteredMetrics = queryableMetrics.OrderBy(m => m.Timestamp).Take(criteria.Limit).ToList();
            _logger.LogInformation("Found {Count} metrics matching criteria.", filteredMetrics.Count);

            // Group by metric definition (Name, Attributes, Resource)
            var groupedMetrics = filteredMetrics
                .GroupBy(m => new MetricDefinition { Name = m.Name, Attributes = m.Attributes, Resource = m.Resource })
                .Select(g => new MetricTimeSeries
                {
                    MetricInfo = g.Key, // Updated from Definition to MetricInfo
                    Values = g.Select(m => new Tuple<long, string>(
                                           m.Timestamp.ToUnixTimeSeconds(),
                                           (m.GaugeValueDouble?.ToString() ?? string.Empty) // Adjust for other types
                                       )).ToList()
                }).ToList();

            var result = new MetricQueryResult // Updated to user's MetricQueryResult
            {
                ResultType = "matrix", // Default as per user's model
                Result = groupedMetrics
            };

            return Task.FromResult(result);
        }
        
        public Task<RepositoryMetricSchema> GetMetricSchemaAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            _logger.LogDebug("Generating metric schema from in-memory data.");

            var metricNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var attributeKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var resourceKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            var currentMetrics = _metricsStore.ToList(); // Work on a snapshot

            foreach (var metric in currentMetrics)
            {
                if (!string.IsNullOrEmpty(metric.Name))
                {
                    metricNames.Add(metric.Name);
                }

                foreach (var attrKey in metric.Attributes.Keys)
                {
                    attributeKeys.Add(attrKey);
                }

                foreach (var resKey in metric.Resource.Keys)
                {
                    resourceKeys.Add(resKey);
                }
            }

            var schema = new RepositoryMetricSchema
            {
                MetricNames = metricNames.OrderBy(n => n).ToList(),
                AttributeKeys = attributeKeys.OrderBy(k => k).ToList(),
                ResourceKeys = resourceKeys.OrderBy(k => k).ToList()
            };

            _logger.LogInformation("Generated metric schema: {MetricCount} names, {AttributeKeyCount} attribute keys, {ResourceKeyCount} resource keys.",
                schema.MetricNames.Count, schema.AttributeKeys.Count, schema.ResourceKeys.Count);

            return Task.FromResult(schema);
        }

        /// <summary>
        /// Query traces by filtering logs that contain trace information
        /// </summary>
        public Task<LogQueryResult> QueryTracesAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();
            _logger.LogDebug("Querying traces (from logs) with criteria: Start={StartTime}, End={EndTime}, Query='{QueryString}', Limit={Limit}",
                criteria.StartTime, criteria.EndTime, criteria.Query, criteria.Limit);

            var queryableLogs = _logsStore.AsEnumerable(); // Work with a snapshot

            // Filter for trace-related logs only (logs that have trace.id or span.id)
            queryableLogs = queryableLogs.Where(l => 
                l.Attributes.ContainsKey("trace.id") || 
                l.Attributes.ContainsKey("span.id") ||
                l.Attributes.ContainsKey("span.name"));

            // Filter by time range
            queryableLogs = queryableLogs.Where(l => l.Timestamp >= criteria.StartTime && l.Timestamp <= criteria.EndTime);

            // Simple query filtering on trace/span attributes
            if (!string.IsNullOrWhiteSpace(criteria.Query))
            {
                var query = criteria.Query.ToLowerInvariant();
                queryableLogs = queryableLogs.Where(l => 
                    (l.Attributes.TryGetValue("trace.id", out var traceId) && traceId?.ToString()?.ToLowerInvariant().Contains(query) == true) ||
                    (l.Attributes.TryGetValue("span.name", out var spanName) && spanName?.ToString()?.ToLowerInvariant().Contains(query) == true) ||
                    (l.Attributes.TryGetValue("span.attr.service.name", out var serviceName) && serviceName?.ToString()?.ToLowerInvariant().Contains(query) == true) ||
                    l.Body?.ToString()?.ToLowerInvariant().Contains(query) == true);
            }

            var filteredTraces = queryableLogs
                .OrderByDescending(l => l.Timestamp)
                .Skip(criteria.Offset)
                .Take(criteria.Limit)
                .ToList();

            _logger.LogInformation("Found {Count} trace-related logs matching criteria.", filteredTraces.Count);

            var result = new LogQueryResult
            {
                Logs = filteredTraces,
                TotalHits = filteredTraces.Count, // This is an approximation for in-memory impl
                NextPageToken = null // Simplified for in-memory impl
            };

            return Task.FromResult(result);
        }

        /// <summary>
        /// Get telemetry statistics from stored data
        /// </summary>
        public Task<TelemetryStats> GetTelemetryStatsAsync(CancellationToken cancellationToken = default)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var metrics = _metricsStore.ToList();
            var logs = _logsStore.ToList();
            var traces = logs.Where(l => l.Attributes.ContainsKey("trace.id") || l.Attributes.ContainsKey("span.id")).ToList();

            var stats = new TelemetryStats
            {
                MetricsCount = metrics.Count,
                LogsCount = logs.Count - traces.Count, // Subtract traces that are stored as logs
                TracesCount = traces.Count,
                LastMetricReceived = metrics.Any() ? metrics.Max(m => m.Timestamp) : null,
                LastLogReceived = logs.Where(l => !l.Attributes.ContainsKey("trace.id") && !l.Attributes.ContainsKey("span.id")).Any() 
                    ? logs.Where(l => !l.Attributes.ContainsKey("trace.id") && !l.Attributes.ContainsKey("span.id")).Max(l => l.Timestamp) 
                    : null,
                LastTraceReceived = traces.Any() ? traces.Max(t => t.Timestamp) : null
            };

            return Task.FromResult(stats);
        }
    }

    /// <summary>
    /// Statistics about telemetry data
    /// </summary>
    public class TelemetryStats
    {
        public long MetricsCount { get; set; }
        public long LogsCount { get; set; }
        public long TracesCount { get; set; }
        public DateTimeOffset? LastMetricReceived { get; set; }
        public DateTimeOffset? LastLogReceived { get; set; }
        public DateTimeOffset? LastTraceReceived { get; set; }
    }