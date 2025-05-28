using System.Collections.Concurrent;
using MetricsApp.Abstractions.Data;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Repository.InMemory;

public class InMemoryDataRepository : IDataRepository
    {
        private readonly ConcurrentBag<Metric> _metricsStore = new ConcurrentBag<Metric>();
        private readonly ILogger<InMemoryDataRepository> _logger;

        public InMemoryDataRepository(ILogger<InMemoryDataRepository> logger)
        {
            _logger = logger;
            _logger.LogInformation("InMemoryDataRepository initialized.");
        }

        public Task StoreLogsAsync(IEnumerable<LogRecord> logs, CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException();
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
            throw new NotImplementedException();
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
    }