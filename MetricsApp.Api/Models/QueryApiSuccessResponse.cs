namespace MetricsApp.Api.Models;

public class QueryApiErrorResponse
{
    public string Status { get; set; } = "error";
    public string? ErrorType { get; set; }
    public string Message { get; set; } = string.Empty;
    public object? Details {get; set;}

    public QueryApiErrorResponse(string message, string? errorType = null, object? details = null)
    {
        Message = message;
        ErrorType = errorType;
        Details = details;
    }
}