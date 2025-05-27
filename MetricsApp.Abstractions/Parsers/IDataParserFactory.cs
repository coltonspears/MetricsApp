namespace MetricsApp.Abstractions.Parsers;

/// <summary>
/// Factory interface for getting data parsers.
/// This can be used by the Worker Service to select the appropriate parser.
/// </summary>
public interface IDataParserFactory
{
    IDataParser? GetParser(string sourceType);
}