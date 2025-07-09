using System.Reflection;
using MetricsApp.Abstractions.Setup;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace InitialSetupPlugin;

public class SqlServerDbInitializer : IDbInitializer
{
    private readonly string _connectionString;
    private readonly string _scriptPath;

    public SqlServerDbInitializer(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
                            ?? throw new InvalidOperationException(
                                "Connection string 'DefaultConnection' not found in configuration.");

        // schema.sql is copied next to the plugin DLL in the output folder
        var assemblyDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location)
                          ?? throw new InvalidOperationException("Cannot locate plugin folder.");
        _scriptPath = Path.Combine(assemblyDir, "schema.sql");
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        if (!File.Exists(_scriptPath))
            throw new FileNotFoundException("SQL schema file not found.", _scriptPath);

        var fullScript = await File.ReadAllTextAsync(_scriptPath, cancellationToken);

        // split on lines containing only "GO"
        var batches = fullScript
            .Split(new[] { "\r\nGO\r\n", "\nGO\n", "\r\nGO\n", "\nGO\r\n" },
                StringSplitOptions.RemoveEmptyEntries);

        await using var conn = new SqlConnection(_connectionString);
        await conn.OpenAsync(cancellationToken);

        foreach (var batch in batches)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = batch;
            cmd.CommandType = System.Data.CommandType.Text;
            await cmd.ExecuteNonQueryAsync(cancellationToken);
        }
    }
}