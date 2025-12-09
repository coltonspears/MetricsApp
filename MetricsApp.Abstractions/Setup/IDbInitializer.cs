namespace MetricsApp.Abstractions.Setup;

/// <summary>
/// Runs any necessary database creation/migration/seed logic
/// during initial setup.
/// </summary>
public interface IDbInitializer
{
    /// <summary>
    /// Checks if the database has been initialized.
    /// </summary>
    /// <param name="cancellationToken">Token to cancel the check.</param>
    /// <returns>True if the database is initialized, false otherwise.</returns>
    Task<bool> IsDatabaseInitializedAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Ensures the database is created and up-to-date.
    /// </summary>
    /// <param name="cancellationToken">Token to cancel initialization.</param>
    Task InitializeDatabaseAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Legacy method - use InitializeDatabaseAsync instead.
    /// </summary>
    [Obsolete("Use InitializeDatabaseAsync instead")]
    Task InitializeAsync(CancellationToken cancellationToken = default) => InitializeDatabaseAsync(cancellationToken);
}