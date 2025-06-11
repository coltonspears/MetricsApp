# Collectors vs. Datasources: Architectural Comparison

## Overview

MetricsApp now has two complementary systems for handling data:
1. **Agent Collectors** - For active data collection
2. **Datasource Plugins** - For querying external data stores

## Key Differences

| Aspect | Agent Collectors | Datasource Plugins |
|--------|------------------|-------------------|
| **Purpose** | Collect new data | Query existing data |
| **Direction** | Push (into MetricsApp) | Pull (from external systems) |
| **Timing** | Real-time/scheduled collection | On-demand querying |
| **Location** | Deployed on source systems | Centralized in MetricsApp |
| **Data Flow** | Source → Collector → MetricsApp | User → MetricsApp → External System |
| **Use Case** | Monitoring local resources | Analyzing historical data |

## Agent Collectors (Existing)

### Architecture
```
[Windows Server] → [WindowsPerfCounters Collector] → [HTTP Emitter] → [MetricsApp API]
[Linux Server]   → [SystemMetrics Collector]      → [Queue Emitter] → [MetricsApp Queue]
[Application]    → [Custom Collector]             → [File Emitter]  → [MetricsApp File Import]
```

### Characteristics
- **Proactive**: Continuously collect metrics
- **Distributed**: Run on multiple systems
- **Real-time**: Immediate data ingestion
- **Local**: Access local system resources
- **Scheduled**: Run on timers/intervals

### Examples
```csharp
// Collect Windows Performance Counters
public class WindowsPerfCountersCollector : IMetricCollector
{
    public async Task<IEnumerable<EventDto>> CollectAsync()
    {
        var events = new List<EventDto>();
        
        // Read CPU usage from local system
        var cpuUsage = GetCpuUsage();
        events.Add(new EventDto 
        { 
            SourceType = "windows-perfcounters",
            Payload = new { metric = "cpu.usage", value = cpuUsage }
        });
        
        return events;
    }
}

// Collect custom application metrics
public class ApplicationMetricsCollector : IMetricCollector
{
    public async Task<IEnumerable<EventDto>> CollectAsync()
    {
        // Collect from local application
        var requestCount = GetRequestCount();
        var responseTime = GetAverageResponseTime();
        
        return new[]
        {
            new EventDto { /* request count data */ },
            new EventDto { /* response time data */ }
        };
    }
}
```

## Datasource Plugins (New)

### Architecture
```
[User Query] → [MetricsApp UI] → [DataSource Manager] → [Prometheus DataSource] → [Prometheus Server]
[Dashboard]  → [MetricsApp API] → [DataSource Manager] → [Elasticsearch DataSource] → [Elasticsearch Cluster]
[Report]     → [MetricsApp]     → [DataSource Manager] → [InfluxDB DataSource] → [InfluxDB Instance]
```

### Characteristics
- **Reactive**: Query data on-demand
- **Centralized**: Run within MetricsApp
- **Historical**: Access stored/historical data
- **Remote**: Connect to external systems
- **User-driven**: Triggered by user queries

### Examples
```csharp
// Query Prometheus for historical metrics
public class PrometheusDataSource : IDataSource
{
    public async Task<MetricQueryResult> QueryMetricsAsync(MetricQueryCriteria criteria)
    {
        // Query Prometheus for data between start/end times
        var prometheusQuery = BuildPrometheusQuery(criteria);
        var response = await _httpClient.GetAsync($"/api/v1/query_range?{prometheusQuery}");
        
        return ParsePrometheusResponse(response);
    }
}

// Query Elasticsearch for log data
public class ElasticsearchDataSource : IDataSource
{
    public async Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria)
    {
        // Search Elasticsearch indices for matching logs
        var searchQuery = BuildElasticsearchQuery(criteria);
        var response = await _elasticClient.SearchAsync(searchQuery);
        
        return ParseElasticsearchResponse(response);
    }
}
```

## Use Case Scenarios

### Scenario 1: Real-time Monitoring
**Use Collectors**: Deploy WindowsPerfCounters collector on production servers
```csharp
// Runs every 30 seconds on each server
var collector = new WindowsPerfCountersCollector();
var metrics = await collector.CollectAsync(); // CPU, Memory, Disk usage
// Automatically sent to MetricsApp for real-time dashboards
```

### Scenario 2: Historical Analysis
**Use Datasources**: Query Prometheus for last month's data
```csharp
// User requests historical analysis via UI
var criteria = new MetricQueryCriteria 
{
    Query = "cpu_usage",
    StartTime = DateTime.Now.AddDays(-30),
    EndTime = DateTime.Now
};
var results = await prometheusDataSource.QueryMetricsAsync(criteria);
// Display trends and patterns in UI
```

### Scenario 3: Multi-Source Correlation
**Use Both**: Combine real-time collection with historical querying
```csharp
// Collectors provide current data
var currentMetrics = await windowsCollector.CollectAsync();

// Datasources provide historical context
var historicalData = await prometheusDataSource.QueryMetricsAsync(criteria);

// Correlate current issues with historical patterns
```

## Data Flow Comparison

### Collector Data Flow
```
1. Timer triggers collection
2. Collector reads local metrics
3. Emitter sends to MetricsApp
4. Parser processes data
5. Repository stores data
6. Real-time dashboard updates
```

### Datasource Data Flow
```
1. User creates query in UI
2. Query sent to DataSource Manager
3. Manager routes to appropriate datasource
4. Datasource queries external system
5. Results returned to user
6. UI displays query results
```

## Configuration Differences

### Collector Configuration
```json
{
  "collectors": [
    {
      "type": "WindowsPerfCounters",
      "interval": "30s",
      "counters": ["\\Processor(_Total)\\% Processor Time"],
      "emitter": "http"
    }
  ]
}
```

### Datasource Configuration
```json
{
  "dataSources": [
    {
      "id": "prod-prometheus",
      "name": "Production Prometheus",
      "type": "prometheus",
      "url": "https://prometheus.company.com",
      "authentication": {
        "type": "Bearer",
        "token": "..."
      }
    }
  ]
}
```

## When to Use Which

### Use Collectors When:
- ✅ You need real-time monitoring
- ✅ Data source doesn't have an API
- ✅ You want to monitor local resources
- ✅ You need custom metric collection logic
- ✅ You want to aggregate data before sending

### Use Datasources When:
- ✅ You need to query historical data
- ✅ External system has a query API
- ✅ You want ad-hoc analysis
- ✅ You need to correlate data from multiple systems
- ✅ You want to leverage existing data stores

## Complementary Usage

The two systems work together:

1. **Collectors** gather real-time data and store it in MetricsApp
2. **Datasources** allow querying both:
   - MetricsApp's own data (via a MetricsApp datasource)
   - External systems (Prometheus, Elasticsearch, etc.)
3. **Users** can create dashboards combining both real-time and historical data

### Example: Comprehensive Monitoring Setup
```csharp
// 1. Deploy collectors for real-time data
builder.Services.AddCollector<WindowsPerfCountersCollector>();
builder.Services.AddCollector<ApplicationMetricsCollector>();

// 2. Configure datasources for historical analysis
builder.Services.AddDataSource<PrometheusDataSource>();
builder.Services.AddDataSource<ElasticsearchDataSource>();
builder.Services.AddDataSource<MetricsAppDataSource>(); // Query own data

// 3. Users can now:
// - View real-time dashboards (from collectors)
// - Perform historical analysis (from datasources)
// - Correlate data across multiple systems
```

## Migration Path

Your existing collectors continue to work unchanged:
- No breaking changes to existing collector interfaces
- Existing data collection continues as before
- New datasource capabilities are additive

You can gradually add datasource capabilities:
1. Start with Prometheus datasource for historical analysis
2. Add Elasticsearch datasource for log correlation
3. Create MetricsApp datasource to query your own collected data
4. Build unified dashboards combining all data sources 