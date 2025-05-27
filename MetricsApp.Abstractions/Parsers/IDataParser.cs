using MetricsApp.Core.Models;

namespace MetricsApp.Abstractions.Parsers;

/// <summary>
/// Interface for data parsers that transform raw EventDto payloads
/// into unified LogRecord or Metric objects.
/// </summary>
public interface IDataParser
{
    /// <summary>
    /// Determines if this parser can handle the given source type.
    /// </summary>
    /// <param name="sourceType">The source type string from the EventDto.</param>
    /// <returns>True if the parser can handle it, false otherwise.</returns>
    bool CanParse(string sourceType);

    /// <summary>
    /// Parses the raw event and transforms it into a collection of LogRecord and/or Metric objects.
    /// A single incoming event might result in multiple unified records.
    /// </summary>
    /// <param name="rawEvent">The raw event DTO containing the payload to parse.</param>
    /// <returns>An enumerable of parsed objects (LogRecord or Metric).</returns>
    IEnumerable<object> Parse(EventDto rawEvent);
}