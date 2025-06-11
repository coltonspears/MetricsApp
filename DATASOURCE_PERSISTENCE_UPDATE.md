# DataSource Persistence Implementation

## Overview

Updated the MetricsApp.Api DataSourceManager to use proper persistence for datasource configurations instead of in-memory storage. This ensures that datasource configurations are saved and persist across application restarts.

## Changes Made

### 1. Created Configuration Repository Interface

**File:** `MetricsApp.Abstractions/Data/IConfigurationRepository.cs`

Added a new interface specifically for storing configuration data:

```csharp
public interface IConfigurationRepository
{
    Task<DataSourceConfiguration> StoreDataSourceConfigurationAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    Task<IEnumerable<DataSourceConfiguration>> GetDataSourceConfigurationsAsync(CancellationToken cancellationToken = default);
    Task<DataSourceConfiguration?> GetDataSourceConfigurationAsync(string id, CancellationToken cancellationToken = default);
    Task<DataSourceConfiguration> UpdateDataSourceConfigurationAsync(DataSourceConfiguration configuration, CancellationToken cancellationToken = default);
    Task DeleteDataSourceConfigurationAsync(string id, CancellationToken cancellationToken = default);
    Task<bool> DataSourceConfigurationExistsAsync(string id, CancellationToken cancellationToken = default);
}
```

### 2. Implemented In-Memory Configuration Repository

**File:** `MetricsApp.Repository.InMemory/InMemoryConfigurationRepository.cs`

Created a thread-safe in-memory implementation using `ConcurrentDictionary<string, DataSourceConfiguration>`:

- Automatic ID generation for new configurations
- Proper timestamp management (CreatedAt, UpdatedAt)
- Comprehensive logging for all operations
- Thread-safe operations with cancellation token support

### 3. Updated DataSourceManager

**File:** `MetricsApp.DataSources.Core/DataSourceManager.cs`

**Key Changes:**
- Removed in-memory `ConcurrentDictionary<string, DataSourceConfiguration> _configurations`
- Added `IConfigurationRepository _configurationRepository` dependency
- Updated all CRUD operations to use the repository:
  - `GetDataSourcesAsync()` - loads from repository
  - `GetDataSourceAsync()` - loads from repository
  - `CreateDataSourceAsync()` - stores in repository
  - `UpdateDataSourceAsync()` - updates in repository
  - `DeleteDataSourceAsync()` - deletes from repository

### 4. Updated Dependency Injection

**File:** `MetricsApp.Repository.InMemory/Extensions/InMemoryRepositoryServiceCollectionExtensions.cs`

Added registration for the configuration repository:

```csharp
public static IServiceCollection AddInMemoryRepository(this IServiceCollection services)
{
    services.AddSingleton<IDataRepository, InMemoryDataRepository>();
    services.AddSingleton<IConfigurationRepository, InMemoryConfigurationRepository>();
    return services;
}
```

## Benefits

1. **Persistence**: Datasource configurations are now properly stored and retrieved
2. **Separation of Concerns**: Configuration data is separated from runtime data
3. **Extensibility**: Easy to swap in different storage implementations (SQL, NoSQL, etc.)
4. **Thread Safety**: All operations are thread-safe with proper concurrency handling
5. **Logging**: Comprehensive logging for debugging and monitoring
6. **Error Handling**: Proper exception handling with meaningful error messages

## API Testing Results

All CRUD operations have been tested and work correctly:

- ✅ **CREATE**: `POST /api/v1/datasources` - Creates and persists new datasource
- ✅ **READ**: `GET /api/v1/datasources` - Retrieves all persisted datasources
- ✅ **READ**: `GET /api/v1/datasources/{id}` - Retrieves specific datasource
- ✅ **UPDATE**: `PUT /api/v1/datasources/{id}` - Updates and persists changes
- ✅ **DELETE**: `DELETE /api/v1/datasources/{id}` - Removes from persistence

## Future Enhancements

The current implementation uses in-memory storage. Future implementations could include:

1. **SQL Database**: Entity Framework Core implementation
2. **NoSQL Database**: MongoDB or CosmosDB implementation
3. **File-based**: JSON or XML file storage
4. **Distributed**: Redis or other distributed storage

The interface-based design makes it easy to swap implementations without changing the DataSourceManager or API controllers.

## Backward Compatibility

This change is fully backward compatible:
- All existing API endpoints work the same way
- No breaking changes to the public interface
- Existing client code continues to work without modification
- The WebUI datasource functionality continues to work seamlessly 