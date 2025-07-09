namespace MetricsApp.Abstractions.Setup;

/// <summary>
/// Runs any necessary database creation/migration/seed logic
/// during initial setup.
/// </summary>
public interface IDbInitializer
{
    /// <summary>
    /// Ensures the database is created and up-to-date.
    /// </summary>
    /// <param name="cancellationToken">Token to cancel initialization.</param>
    Task InitializeAsync(CancellationToken cancellationToken = default);
}