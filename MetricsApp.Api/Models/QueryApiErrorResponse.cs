namespace MetricsApp.Api.Models;

public class QueryApiSuccessResponse<T>
{
    public string Status { get; set; } = "success";
    public T Data { get; set; }

    public QueryApiSuccessResponse(T data)
    {
        Data = data;
    }
}