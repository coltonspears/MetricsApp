using MetricsApp.Core.Models; 

namespace MetricsApp.Agent.Core.Abstractions
{
    /// <summary>
    /// Interface for a component that emits/sends collected metrics.
    /// </summary>
    public interface IMetricEmitter
    {
        Task EmitAsync(IEnumerable<EventDto> events, CancellationToken cancellationToken = default);
    }
}
