using MetricsApp.Core.Models;

namespace MetricsApp.Abstractions.Data;

/// <summary>
    /// Interface for the data repository, abstracting storage and retrieval of logs and metrics.
    /// </summary>
    public interface IDataRepository
    {
        Task StoreLogsAsync(IEnumerable<LogRecord> logs, CancellationToken cancellationToken = default);
        Task StoreMetricsAsync(IEnumerable<Metric> metrics, CancellationToken cancellationToken = default);

        Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken cancellationToken = default);
        Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria, CancellationToken cancellationToken = default);
    }