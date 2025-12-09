using System.Reflection;
using MetricsApp.Abstractions.Setup;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace InitialSetupPlugin;

/// <summary>
/// SQL Server database initializer for the initial setup plugin.
/// Creates and initializes the MetricsApp database schema.
/// </summary>
public class SqlServerDbInitializer : IDbInitializer
{
    private readonly string _connectionString;
    private readonly string _scriptPath;
    private readonly ILogger<SqlServerDbInitializer>? _logger;

    public SqlServerDbInitializer(IConfiguration configuration, ILogger<SqlServerDbInitializer>? logger = null)
    {
        _logger = logger;
        _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new InvalidOperationException(
                                "Connection string 'DefaultConnection' not found in configuration.");

        // schema.sql is copied next to the plugin DLL in the output folder
        var assemblyDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)
                          ?? throw new InvalidOperationException("Cannot locate plugin folder.");
        _scriptPath = Path.Combine(assemblyDir, "schema.sql");
    }

    /// <inheritdoc />
    public async Task<bool> IsDatabaseInitializedAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await using var conn = new SqlConnection(_connectionString);
            await conn.OpenAsync(cancellationToken);

            // Check if our marker table exists (indicates setup was completed)
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT COUNT(*) 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = 'MetricsApp_Settings'";
            
            var result = await cmd.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt32(result) > 0;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to check database initialization status");
            return false;
        }
    }

    /// <inheritdoc />
    public async Task InitializeDatabaseAsync(CancellationToken cancellationToken = default)
    {
        _logger?.LogInformation("Starting database initialization...");

        if (!File.Exists(_scriptPath))
            throw new FileNotFoundException("SQL schema file not found.", _scriptPath);

        var fullScript = await File.ReadAllTextAsync(_scriptPath, cancellationToken);

        // Split on lines containing only "GO"
        var batches = fullScript
            .Split(new[] { "\r\nGO\r\n", "\nGO\n", "\r\nGO\n", "\nGO\r\n" },
                StringSplitOptions.RemoveEmptyEntries);

        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync(cancellationToken);

        foreach (var batch in batches)
        {
            if (string.IsNullOrWhiteSpace(batch))
                continue;

            try
            {
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = batch;
                cmd.CommandType = System.Data.CommandType.Text;
                await cmd.ExecuteNonQueryAsync(cancellationToken);
            }
            catch (SqlException ex)
            {
                _logger?.LogError(ex, "Error executing SQL batch: {Batch}", batch.Substring(0, Math.Min(100, batch.Length)));
                throw;
            }
        }

        // Create settings table to mark initialization as complete
        await EnsureSettingsTableAsync(conn, cancellationToken);

        _logger?.LogInformation("Database initialization completed successfully");
    }

    private async Task EnsureSettingsTableAsync(SqlConnection conn, CancellationToken cancellationToken)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MetricsApp_Settings')
            BEGIN
                CREATE TABLE MetricsApp_Settings (
                    [Key] NVARCHAR(256) PRIMARY KEY,
                    [Value] NVARCHAR(MAX),
                    [UpdatedAt] DATETIME2 DEFAULT GETUTCDATE()
                );
                
                INSERT INTO MetricsApp_Settings ([Key], [Value]) 
                VALUES ('SetupCompleted', 'true'), ('SetupCompletedAt', CONVERT(NVARCHAR(50), GETUTCDATE(), 126));
            END";
        
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }
}