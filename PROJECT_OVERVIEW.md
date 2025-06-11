# MetricsApp - Project Overview

## Introduction

MetricsApp is a modular, scalable metrics and logging platform inspired by Splunk. The project has been decomposed from a monolithic application into focused, reusable NuGet packages that follow clean architecture principles and provide flexibility for different deployment scenarios.

## Project Structure

### Core Foundation
| Project | Purpose | Dependencies |
|---------|---------|--------------|
| **MetricsApp.Core** | Fundamental data models and structures | None |
| **MetricsApp.Abstractions** | Interfaces and contracts for all components | MetricsApp.Core |

### Data Layer
| Project | Purpose | Dependencies |
|---------|---------|--------------|
| **MetricsApp.Repository.InMemory** | In-memory data storage implementation | MetricsApp.Abstractions |
| **MetricsApp.Cache.InMemory** | In-memory caching using IMemoryCache | MetricsApp.Abstractions |
| **MetricsApp.Cache.Redis** | Distributed caching using Redis | MetricsApp.Abstractions, StackExchange.Redis |

### Messaging Layer
| Project | Purpose | Dependencies |
|---------|---------|--------------|
| **MetricsApp.Queue.InMemory** | In-memory message queue implementation | MetricsApp.Abstractions |

### Processing Layer
| Project | Purpose | Dependencies |
|---------|---------|--------------|
| **MetricsApp.Parser.WindowsPerfCounters** | Windows Performance Counter data parser | MetricsApp.Abstractions |
| **MetricsApp.Worker** | Background processing services | MetricsApp.Abstractions, Microsoft.Extensions.Hosting |

### Agent Layer
| Project | Purpose | Dependencies |
|---------|---------|--------------|
| **MetricsApp.Agent.Core** | Core agent framework and abstractions | MetricsApp.Core, Microsoft.Extensions.Hosting |
| **MetricsApp.Agent.Collectors.WindowsPerfCounters** | Windows metrics collector | MetricsApp.Agent.Core |
| **MetricsApp.Agent.Emitters.Http** | HTTP-based metric emission | MetricsApp.Agent.Core |
| **MetricsApp.Agent.Emitters.Queue** | Queue-based metric emission | MetricsApp.Agent.Core |

### Application Layer
| Project | Purpose | Dependencies |
|---------|---------|--------------|
| **MetricsApp.Api** | REST API for data ingestion and querying | MetricsApp.Abstractions, ASP.NET Core |
| **MetricsApp.Demo.SampleHostApp** | Demonstration application | All Agent components |

## Architecture Patterns

### Dependency Inversion
All components depend on abstractions rather than concrete implementations, enabling:
- Easy testing with mocks
- Swappable implementations
- Reduced coupling between components

### Plugin Architecture
The system supports pluggable components:
- **Collectors**: Different data sources (Windows Perf Counters, custom metrics)
- **Emitters**: Different destinations (HTTP, Queue, File)
- **Caches**: Different caching strategies (In-Memory, Redis)
- **Parsers**: Different data formats (Windows Perf Counters, JSON, Syslog)

### Event-Driven Processing
Data flows through the system via events:
1. Agents collect metrics and emit events
2. Events are queued for processing
3. Workers consume events and parse data
4. Parsed data is stored in repositories

## Deployment Scenarios

### 1. Single Instance (Development)
```
[Agent] → [API] → [Worker] → [Repository]
          ↓
       [Cache]
```
- All components in one process
- In-memory implementations
- Suitable for development and testing

### 2. Distributed (Production)
```
[Agent] → [API] → [Queue] → [Worker] → [Repository]
          ↓                    ↓
       [Redis Cache]      [Multiple Workers]
```
- Separate API and Worker services
- Redis for distributed caching
- Horizontal scaling of workers

### 3. Agent-Only (Edge)
```
[Agent] → [HTTP Emitter] → [Remote API]
       → [Queue Emitter] → [Local Queue]
```
- Lightweight agent deployment
- Forward metrics to central instance
- Local queuing for reliability

## Getting Started

### 1. Clone and Build
```bash
git clone <repository-url>
cd MetricsApp
dotnet build
```

### 2. Run the Demo
```bash
dotnet run --project MetricsApp.Demo.SampleHostApp
```

### 3. Start the API
```bash
dotnet run --project MetricsApp.Api
```

### 4. Start the Worker
```bash
dotnet run --project MetricsApp.Worker
```

## Configuration Management

### Hierarchical Configuration
Each component supports configuration through:
- `appsettings.json` files
- Environment variables
- Command line arguments
- Azure Key Vault (future)

### Environment-Specific Settings
- `appsettings.Development.json`
- `appsettings.Production.json`
- `appsettings.{Environment}.json`

## Development Guidelines

### Adding New Components

#### 1. Create New Collector
```csharp
public class MyCollector : IMetricCollector
{
    public string CollectorName => "MyCollector";
    
    public async Task<IEnumerable<EventDto>> CollectAsync(CancellationToken cancellationToken = default)
    {
        // Implementation
    }
}
```

#### 2. Create New Emitter
```csharp
public class MyEmitter : IMetricEmitter
{
    public string EmitterName => "MyEmitter";
    
    public async Task EmitAsync(IEnumerable<EventDto> events, CancellationToken cancellationToken = default)
    {
        // Implementation
    }
}
```

#### 3. Create New Parser
```csharp
public class MyParser : IDataParser
{
    public bool CanParse(string sourceType) => sourceType == "my-source";
    
    public IEnumerable<object> Parse(EventDto rawEvent)
    {
        // Implementation
    }
}
```

### Testing Strategy

#### Unit Tests
- Test individual components in isolation
- Use mocks for dependencies
- Focus on business logic

#### Integration Tests
- Test component interactions
- Use test containers for external dependencies
- Verify end-to-end scenarios

#### Performance Tests
- Load testing with realistic data volumes
- Memory usage monitoring
- Latency measurements

## Monitoring and Observability

### Built-in Metrics
- Collection success/failure rates
- Processing throughput
- Queue depths
- Cache hit rates
- Error rates

### Health Checks
- Component availability
- External dependency health
- Resource utilization

### Structured Logging
- Correlation IDs for request tracing
- Performance metrics
- Error details with context

## Security Considerations

### Authentication & Authorization
- API key authentication (current)
- JWT tokens (future)
- Role-based access control (future)

### Data Protection
- Encryption in transit (HTTPS)
- Encryption at rest (future)
- Sensitive data masking

### Network Security
- Firewall configuration
- VPN/private networks
- Certificate management

## Performance Optimization

### Caching Strategy
- Query result caching
- Metadata caching
- Connection pooling

### Batch Processing
- Event batching for efficiency
- Configurable batch sizes
- Parallel processing

### Resource Management
- Memory usage monitoring
- Connection pooling
- Garbage collection optimization

## Future Enhancements

### Additional Data Sources
- **Logs**: Syslog, Windows Event Log, Application logs
- **Traces**: OpenTelemetry traces, custom traces
- **Custom Metrics**: Business metrics, KPIs

### Storage Backends
- **Elasticsearch**: Full-text search capabilities
- **InfluxDB**: Time-series optimization
- **Azure Data Explorer**: Cloud-native analytics

### Advanced Features
- **Real-time Dashboards**: Live metric visualization
- **Alerting**: Threshold-based notifications
- **Machine Learning**: Anomaly detection
- **Data Retention**: Automated archival policies

## Troubleshooting

### Common Issues

#### High Memory Usage
- Check cache configurations
- Monitor queue depths
- Review batch sizes

#### Slow Performance
- Analyze query patterns
- Check cache hit rates
- Monitor database performance

#### Connection Errors
- Verify network connectivity
- Check firewall settings
- Review authentication configuration

### Debug Tools
- Structured logging with correlation IDs
- Health check endpoints
- Performance counters
- Memory profiling tools

## Contributing

### Code Standards
- Follow C# coding conventions
- Use async/await patterns
- Implement proper error handling
- Include comprehensive tests

### Documentation
- Update README files for changes
- Include code examples
- Document configuration options
- Provide troubleshooting guides

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Code review and approval

## Support and Resources

### Documentation
- Individual project README files
- Architecture documentation
- Configuration guides
- Troubleshooting guides

### Examples
- Demo application
- Configuration samples
- Custom component examples
- Deployment scripts

### Community
- GitHub Issues for bug reports
- Discussions for questions
- Wiki for additional documentation
- Contribution guidelines 