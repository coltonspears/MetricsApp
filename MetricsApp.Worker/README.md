# MetricsApp.Worker

## Overview

The Worker project provides background processing services for the MetricsApp project. It consumes events from message queues, processes them through appropriate parsers, and stores the results in data repositories.

## Features

- **Queue Processing**: Consumes events from message queues
- **Data Parsing**: Transforms raw events into structured data
- **Batch Processing**: Processes multiple events efficiently
- **Error Handling**: Robust error handling with retry logic
- **Monitoring**: Built-in metrics and health checks

## Components

### IngestionWorker

The main background service that processes incoming events.

**Key Responsibilities:**
- Consume events from the message queue
- Route events to appropriate parsers
- Store parsed data in repositories
- Handle processing errors gracefully

**Processing Flow:**
1. Dequeue events from the message queue
2. Determine the appropriate parser based on `sourceType`
3. Parse raw event data into `LogRecord` or `Metric` objects
4. Store parsed data in the data repository
5. Handle any errors and continue processing

### Configuration

```json
{
  "Worker": {
    "BatchSize": 100,
    "ProcessingInterval": "00:00:05",
    "MaxRetries": 3,
    "RetryDelay": "00:00:30"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "MetricsApp.Worker": "Debug"
    }
  }
}
```

**Configuration Options:**
- `BatchSize`: Number of events to process in each batch
- `ProcessingInterval`: How often to check for new events
- `MaxRetries`: Maximum retry attempts for failed events
- `RetryDelay`: Delay between retry attempts

## Dependencies

```xml
<PackageReference Include="Microsoft.Extensions.Hosting" Version="9.0.5" />
<PackageReference Include="MetricsApp.Core" />
<PackageReference Include="MetricsApp.Abstractions" />
```

## Error Handling

### Retry Logic
- Failed events are retried up to `MaxRetries` times
- Exponential backoff between retries
- Permanently failed events are logged and discarded

### Dead Letter Queue
- Events that fail all retry attempts
- Stored for manual investigation
- Configurable retention period

### Monitoring
- Processing metrics (events/second, errors, queue depth)
- Health checks for dependencies
- Structured logging for troubleshooting

## Deployment

### Standalone Service
```bash
dotnet run --project MetricsApp.Worker
```

### Docker
```dockerfile
FROM mcr.microsoft.com/dotnet/runtime:9.0
COPY . /app
WORKDIR /app
ENTRYPOINT ["dotnet", "MetricsApp.Worker.dll"]
```

### Windows Service
```bash
sc create MetricsAppWorker binPath="C:\path\to\MetricsApp.Worker.exe"
sc start MetricsAppWorker
```

### Linux Systemd
```ini
[Unit]
Description=MetricsApp Worker Service
After=network.target

[Service]
Type=notify
ExecStart=/usr/bin/dotnet /opt/metricsapp/MetricsApp.Worker.dll
Restart=always
RestartSec=10
User=metricsapp

[Install]
WantedBy=multi-user.target
```

## Scaling

### Horizontal Scaling
- Multiple worker instances can process the same queue
- Each instance processes different messages
- Automatic load balancing through queue mechanics

### Vertical Scaling
- Increase `BatchSize` for higher throughput
- Adjust `ProcessingInterval` for lower latency
- Monitor memory usage with larger batches

## Performance Considerations

### Throughput Optimization
- Batch processing reduces overhead
- Async operations prevent blocking
- Connection pooling for data repositories

### Memory Management
- Bounded queues prevent memory exhaustion
- Dispose of resources properly
- Monitor garbage collection

### Monitoring Metrics
- Events processed per second
- Average processing time per event
- Queue depth and lag
- Error rates and types

## Troubleshooting

### Common Issues

**High Memory Usage**
- Reduce batch size
- Check for memory leaks in parsers
- Monitor queue depth

**Slow Processing**
- Increase worker instances
- Optimize parser implementations
- Check repository performance

**Parse Errors**
- Validate event format
- Check parser compatibility
- Review error logs

### Logging

The worker provides structured logging for:
- Event processing statistics
- Parser selection and execution
- Repository operations
- Error details and stack traces

### Health Checks

Built-in health checks monitor:
- Message queue connectivity
- Data repository availability
- Parser factory status
- Overall worker health 