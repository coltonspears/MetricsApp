namespace MetricsApp.Serilog.OpenTelemetry.Helpers;

internal static class DateTimeExtensions
{
    /// <summary>
    /// Converts DateTimeOffset to Unix time in nanoseconds (as required by OpenTelemetry)
    /// </summary>
    public static long ToUnixTimeNanoseconds(this DateTimeOffset dateTime)
    {
        // Convert to Unix time in seconds, then to nanoseconds
        var unixTimeSeconds = dateTime.ToUnixTimeSeconds();
        var nanoseconds = dateTime.Millisecond * 1_000_000L; // Convert milliseconds to nanoseconds
        return (unixTimeSeconds * 1_000_000_000L) + nanoseconds;
    }
}

