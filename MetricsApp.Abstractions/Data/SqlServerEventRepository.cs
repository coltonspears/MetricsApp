using System.Text.Json;
using MetricsApp.Core.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

public interface IEventRepository
{
    Task StoreEventsAsync(IEnumerable<EventDto> events, CancellationToken cancellationToken = default);
}
public class SqlServerEventRepository : IEventRepository
{
    private readonly string _connectionString;

    public SqlServerEventRepository(IConfiguration config)
    {   
        _connectionString = config.GetConnectionString("MetricsDatabase")!;
    }

    public async Task StoreEventsAsync(IEnumerable<EventDto> events, CancellationToken cancellationToken = default)
    {        
        using var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);

        foreach (var evt in events)
        {
            using var cmd = new SqlCommand(@"
                INSERT INTO [dbo].[Events]
                ([Timestamp], [TenantId], [AppId], [Type], [SourceName], [HostName], [Ip], [LogLevel], [Payload])
                VALUES (@Timestamp, @TenantId, @AppId, @Type, @SourceName, @HostName, @Ip, @LogLevel, @Payload)", connection);

            cmd.Parameters.AddWithValue("@Timestamp", evt.Timestamp);
            cmd.Parameters.AddWithValue("@TenantId", (object?)evt.TenantId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@AppId", (object?)evt.AppId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@Type", evt.Type ?? "log");
            cmd.Parameters.AddWithValue("@SourceName", (object?)evt.SourceType ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@HostName", (object?)evt.HostName ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@Ip", (object?)evt.Ip ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@LogLevel", (object?)evt.LogLevel ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@Payload", JsonSerializer.Serialize(evt.Payload));

            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }
}