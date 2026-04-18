# MetricsApp - Modular Splunk Clone Architecture

## Overview

MetricsApp is a modular, scalable metrics and logging platform inspired by Splunk. The application has been decomposed into focused, reusable NuGet packages that follow clean architecture principles and provide flexibility for different deployment scenarios.

## Architecture Principles

- **Separation of Concerns**: Each module has a single, well-defined responsibility
- **Dependency Inversion**: Core business logic depends on abstractions, not implementations
- **Pluggable Components**: Multiple implementations for caching, queuing, and data storage
- **Scalability**: Designed for horizontal scaling with queue-based processing
- **Observability**: Built-in support for metrics collection and monitoring

## System Components

### Core Layer
- **MetricsApp.Core**: Fundamental models and data structures
- **MetricsApp.Abstractions**: Interfaces and contracts for all components

### Data Layer
- **MetricsApp.Repository.InMemory**: In-memory data storage implementation
- **MetricsApp.Cache.InMemory**: In-memory caching implementation
- **MetricsApp.Cache.Redis**: Redis-based distributed caching

### Messaging Layer
- **MetricsApp.Queue.InMemory**: In-memory message queue implementation

### Processing Layer
- **MetricsApp.Parser.WindowsPerfCounters**: Windows Performance Counter data parser
- **MetricsApp.Worker**: Background processing services

### Agent Layer
- **MetricsApp.Agent.Core**: Core agent framework and abstractions
- **MetricsApp.Agent.Collectors.WindowsPerfCounters**: Windows metrics collector
- **MetricsApp.Agent.Emitters.Http**: HTTP-based metric emission
- **MetricsApp.Agent.Emitters.Queue**: Queue-based metric emission

### Application Layer
- **MetricsApp.Api**: REST API for data ingestion and querying
- **MetricsApp.Demo.SampleHostApp**: Demonstration application

## Data Flow

```
[Agents] → [Emitters] → [API/Queue] → [Workers] → [Parsers] → [Repository]
                                           ↓
[Query API] ← [Cache] ← [Repository]
```

1. **Collection**: Agents collect metrics from various sources
2. **Emission**: Emitters send data via HTTP or queue
3. **Ingestion**: API receives data and queues for processing
4. **Processing**: Workers consume queue messages and parse data
5. **Storage**: Parsed data is stored in repositories
6. **Querying**: API provides cached query results

## Technology Stack

- **.NET 9.0**: Core framework
- **ASP.NET Core**: Web API framework
- **Microsoft.Extensions.Hosting**: Background services
- **Redis**: Distributed caching (optional)
- **Entity Framework Core**: Data access (in main app)

## Deployment Scenarios

### Single Instance
- All components running in one process
- In-memory implementations for cache and queue
- Suitable for development and small deployments

### Distributed
- API and Worker as separate services
- Redis for distributed caching
- External message queue (future: RabbitMQ, Azure Service Bus)
- Horizontal scaling of workers

### Agent-Only
- Deploy only agent components
- Collect and forward metrics to central instance
- Minimal resource footprint

## Configuration

Each component supports configuration through:
- `appsettings.json`
- Environment variables
- Dependency injection container

## Future Enhancements

- Additional data sources (logs, traces, custom metrics)
- More storage backends (Elasticsearch, InfluxDB)
- Advanced querying capabilities
- Real-time dashboards
- Alerting and notifications 