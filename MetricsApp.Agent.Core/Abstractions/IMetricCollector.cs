using MetricsApp.Core.Models; 
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace MetricsApp.Agent.Core.Abstractions
{
    /// <summary>
    /// Interface for a component that collects metrics.
    /// </summary>
    public interface IMetricCollector
    {
        string CollectorName { get; }
        Task<IEnumerable<EventDto>> CollectAsync(CancellationToken cancellationToken = default);
    }
}
