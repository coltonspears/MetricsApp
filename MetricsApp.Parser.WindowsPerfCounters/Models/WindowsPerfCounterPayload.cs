namespace MetricsApp.Parser.WindowsPerfCounters.Models;

public class WindowsPerfCounterPayload
{
    public string? CounterSet { get; set; }
    public string? CounterName { get; set; }
    public string? InstanceName { get; set; }
    public double Value { get; set; }
}