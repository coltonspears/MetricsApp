# MetricsApp Datasource Plugin System - Implementation Plan

## Overview

This document outlines the implementation plan for a Grafana-style datasource plugin system in MetricsApp. The system will allow users to dynamically configure and manage connections to various data sources like Prometheus, Elasticsearch, InfluxDB, and more.

## Architecture Design

### Core Components

#### 1. Abstractions Layer (`MetricsApp.Abstractions.DataSources`)
- **IDataSource**: Core interface for all datasource plugins
- **IDataSourceRegistry**: Manages available datasource types
- **IDataSourceManager**: Manages configured datasource instances
- **Data Models**: Configuration, authentication, metadata models

#### 2. Core Implementation (`MetricsApp.DataSources.Core`)
- **DataSourceRegistry**: Registry implementation
- **DataSourceManager**: Manager implementation with caching
- **Extension Methods**: DI registration helpers

#### 3. Plugin Implementations
- **MetricsApp.DataSources.Prometheus**: Prometheus datasource
- **MetricsApp.DataSources.Elasticsearch**: Elasticsearch datasource (future)
- **MetricsApp.DataSources.InfluxDB**: InfluxDB datasource (future)

#### 4. API Integration (`MetricsApp.Api`)
- **DataSourcesController**: REST endpoints for datasource management
- **Enhanced TelemetryController**: Multi-datasource querying

#### 5. UI Integration (`MetricsApp.WebUI`)
- **Datasource Management Pages**: CRUD operations
- **Configuration Forms**: Dynamic form generation
- **Query Builder**: Multi-datasource query interface

## Implementation Status

### ✅ Completed Components

1. **Core Abstractions**
   - `IDataSource` interface with all required methods
   - `IDataSourceRegistry` for type management
   - `IDataSourceManager` for instance management
   - Complete data model hierarchy

2. **Data Models**
   - `DataSourceConfiguration`: Connection settings
   - `DataSourceAuthentication`: Multi-auth support
   - `DataSourceConfigurationSchema`: UI schema definition
   - `DataSourceTestResult`: Connection test results
   - `DataSourceMetadata`: Available fields/metrics

3. **Core Implementation**
   - `DataSourceRegistry`: Type registration and factory
   - `DataSourceManager`: Instance management with caching
   - DI extension methods for easy registration

4. **Sample Implementation**
   - `PrometheusDataSource`: Complete Prometheus integration
   - Configuration schema with validation
   - Connection testing and metadata discovery

5. **API Layer**
   - `DataSourcesController`: Full CRUD operations
   - Connection testing endpoints
   - Query endpoints for logs and metrics

### 🚧 In Progress

1. **UI Components** (Next Phase)
   - Datasource management interface
   - Dynamic configuration forms
   - Connection testing UI

### 📋 Planned Components

1. **Additional Datasources**
   - Elasticsearch datasource
   - InfluxDB datasource
   - Grafana Loki datasource
   - Azure Monitor datasource
   - AWS CloudWatch datasource

2. **Enhanced Features**
   - Persistent configuration storage
   - Configuration encryption
   - Advanced query builder
   - Dashboard integration

## Key Features

### 1. Plugin Architecture
- **Dynamic Registration**: Datasources register themselves at startup
- **Factory Pattern**: Service provider creates instances
- **Metadata-Driven**: Configuration UI generated from schemas
- **Extensible**: Easy to add new datasource types

### 2. Configuration Management
- **Schema-Based UI**: Dynamic form generation
- **Validation**: Client and server-side validation
- **Authentication**: Multiple auth methods (Basic, Bearer, API Key)
- **Testing**: Built-in connection testing

### 3. Query Capabilities
- **Multi-Source**: Query across multiple datasources
- **Unified Interface**: Common query models for logs and metrics
- **Caching**: Instance caching for performance
- **Error Handling**: Comprehensive error management

### 4. Security
- **Authentication**: Secure credential storage
- **Validation**: Input validation and sanitization
- **Encryption**: Configuration encryption (planned)
- **Access Control**: Role-based access (planned)

## Usage Examples

### 1. Register Datasources

```csharp
// In Program.cs
builder.Services.AddDataSources();
builder.Services.AddDataSource<PrometheusDataSource>();
builder.Services.AddDataSource<ElasticsearchDataSource>();
```

### 2. Create Datasource Configuration

```http
POST /api/v1/datasources
{
  "name": "Production Prometheus",
  "dataSourceType": "prometheus",
  "url": "https://prometheus.company.com",
  "authentication": {
    "type": "Bearer",
    "token": "your-token-here"
  },
  "properties": {
    "timeout": 30
  }
}
```

### 3. Query Multiple Datasources

```http
POST /api/v1/query/metrics
{
  "dataSourceIds": ["prometheus-1", "prometheus-2"],
  "query": "up",
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-01T01:00:00Z"
}
```

## Benefits

### 1. Grafana-Style Experience
- **Familiar Interface**: Similar to Grafana's datasource management
- **Dynamic Configuration**: Schema-driven configuration forms
- **Connection Testing**: Built-in connection validation
- **Metadata Discovery**: Automatic field/metric discovery

### 2. Extensibility
- **Plugin Architecture**: Easy to add new datasource types
- **Modular Design**: Each datasource is a separate package
- **Factory Pattern**: Flexible instance creation
- **DI Integration**: Full dependency injection support

### 3. Performance
- **Instance Caching**: Reuse initialized connections
- **Parallel Queries**: Query multiple sources simultaneously
- **Efficient Pooling**: HTTP client pooling and reuse
- **Lazy Loading**: Initialize only when needed

### 4. Maintainability
- **Clean Architecture**: Clear separation of concerns
- **Interface-Based**: Easy testing and mocking
- **Consistent Patterns**: Following existing project patterns
- **Documentation**: Comprehensive documentation and examples

## Integration with Existing System

### 1. Follows Current Patterns
- **Abstractions Layer**: Consistent with existing interfaces
- **DI Registration**: Uses same extension method patterns
- **Error Handling**: Follows existing error handling patterns
- **Logging**: Integrated with existing logging infrastructure

### 2. Extends Current Capabilities
- **Enhanced Querying**: Multi-source query capabilities
- **External Data**: Connect to external systems
- **Unified Interface**: Common interface for all data sources
- **Scalable Architecture**: Supports horizontal scaling

### 3. Backward Compatibility
- **Existing APIs**: Current APIs remain unchanged
- **Data Models**: Extends existing query models
- **Configuration**: Additive configuration changes
- **Migration Path**: Clear upgrade path

## Next Steps

### Phase 1: Core Implementation ✅
- [x] Core abstractions and interfaces
- [x] Data models and configuration schema
- [x] Registry and manager implementations
- [x] Sample Prometheus datasource
- [x] API endpoints

### Phase 2: UI Implementation 🚧
- [ ] Datasource management pages
- [ ] Dynamic configuration forms
- [ ] Connection testing interface
- [ ] Query builder enhancements

### Phase 3: Additional Datasources 📋
- [ ] Elasticsearch datasource
- [ ] InfluxDB datasource
- [ ] Grafana Loki datasource
- [ ] Azure Monitor datasource

### Phase 4: Advanced Features 📋
- [ ] Persistent configuration storage
- [ ] Configuration encryption
- [ ] Advanced query capabilities
- [ ] Dashboard integration

## Conclusion

The datasource plugin system provides a powerful, extensible foundation for connecting MetricsApp to various external data sources. The implementation follows Grafana's proven patterns while maintaining consistency with your existing project architecture.

Key advantages:
- **Familiar User Experience**: Grafana-style interface
- **Extensible Architecture**: Easy to add new datasources
- **Performance Optimized**: Caching and parallel querying
- **Secure**: Multiple authentication methods
- **Well-Documented**: Comprehensive documentation and examples

The system is designed to grow with your needs, supporting everything from simple Prometheus connections to complex multi-source queries across different platforms. 
