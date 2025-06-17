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
        
        /// <summary>
        /// Gets the schema of available metrics, including names, attribute keys, and resource keys.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A <see cref="RepositoryMetricSchema"/> detailing available metrics.</returns>
        Task<RepositoryMetricSchema> GetMetricSchemaAsync(CancellationToken cancellationToken = default);
    }