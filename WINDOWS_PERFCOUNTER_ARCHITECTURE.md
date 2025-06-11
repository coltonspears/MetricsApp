# Windows Performance Counter Architecture

## Overview

Your Windows Performance Counter implementation should use a **hybrid approach** that combines both collectors and data sources to achieve your goals of configurable counter collection, flexible frequency, and various graph types.

## Architecture Components

### 1. Enhanced Collector (Real-time Collection)
**Purpose**: Continuously collect performance counter data and store in MetricsApp

**Benefits**:
- ✅ Real-time monitoring and alerting
- ✅ Configurable counter selection  
- ✅ Adjustable collection frequency
- ✅ Predefined counter sets for easy setup
- ✅ Tagging and metadata support

**Configuration Example**:
```json
{
  "MetricsAgent": {
    "Collectors": {
      "WindowsPerfCounters": {
        "DefaultFrequencySeconds": 30,
        "MaxInstances": 100,
        "CounterSets": ["system-basic", "network"],
        "Counters": [
          {
            "CounterSet": "Processor",
            "CounterName": "% Processor Time",
            "InstanceName": "*",
            "DisplayName": "CPU Usage Per Core",
            "Unit": "percent",
            "FrequencySeconds": 15,
            "Tags": {"category": "cpu"}
          }
        ]
      }
    }
  }
}
```

### 2. MetricsApp Data Source (Historical Querying)
**Purpose**: Query collected performance counter data for analysis and visualization

**Benefits**:
- ✅ Historical data analysis
- ✅ Custom time ranges
- ✅ Flexible querying
- ✅ Multiple visualization types
- ✅ Data correlation

## Recommended Implementation Flow

### Phase 1: Enhanced Collector (Completed ✅)
Your existing WindowsPerfCounterCollector has been enhanced with:

1. **Configurable Counter Selection**
   - Individual counter configuration
   - Predefined counter sets (system-basic, system-detailed, network, iis)
   - Enable/disable individual counters
   - Instance filtering (specific, all, or none)

2. **Flexible Frequency Control**
   - Global default frequency
   - Per-counter frequency override
   - Maximum instance limits

3. **Rich Metadata Support**
   - Display names for friendly labeling
   - Units of measurement
   - Scaling factors
   - Custom tags
   - Global tags

### Phase 2: Data Source for Historical Analysis
Create a "MetricsApp" data source that queries your own collected data:

```csharp
// Query CPU usage over last 24 hours
var criteria = new MetricQueryCriteria 
{
    Query = "cpu_usage{instance=\"_Total\"}",
    StartTime = DateTime.Now.AddDays(-1).ToString("O"),
    EndTime = DateTime.Now.ToString("O"),
    Step = "5m"
};

var results = await metricsAppDataSource.QueryMetricsAsync(criteria);
```

### Phase 3: Visualization Dashboards
Create dashboards that combine both real-time and historical data:

1. **Real-time Dashboard**
   - Live CPU, Memory, Disk usage
   - Current network throughput
   - Active alerts

2. **Historical Analysis Dashboard**
   - Performance trends over time
   - Capacity planning charts
   - Correlation analysis

3. **Custom Graph Types**
   - Line charts for trends
   - Area charts for stacked metrics
   - Heatmaps for multi-instance data
   - Bar charts for comparisons

## Configuration Examples

### Basic System Monitoring
```json
{
  "CounterSets": ["system-basic"],
  "DefaultFrequencySeconds": 30
}
```
Collects: CPU Usage, Available Memory, Memory Usage

### Detailed Performance Monitoring
```json
{
  "CounterSets": ["system-detailed", "network"],
  "DefaultFrequencySeconds": 15,
  "Counters": [
    {
      "CounterSet": "PhysicalDisk",
      "CounterName": "% Disk Time",
      "InstanceName": "*",
      "DisplayName": "Disk Usage by Drive",
      "Tags": {"type": "storage"}
    }
  ]
}
```

### Application-Specific Monitoring
```json
{
  "CounterSets": ["iis"],
  "Counters": [
    {
      "CounterSet": "Process",
      "CounterName": "% Processor Time",
      "InstanceName": "myapp",
      "DisplayName": "MyApp CPU Usage",
      "FrequencySeconds": 10,
      "Tags": {"application": "myapp"}
    }
  ]
}
```

## Usage Patterns

### 1. Real-time Monitoring
```csharp
// Collectors automatically send data every 30 seconds
// Real-time dashboards update automatically
// Alerts trigger on threshold breaches
```

### 2. Historical Analysis
```typescript
// Query last week's CPU trends
const cpuData = await DataSourceApi.queryMetrics('metricsapp-datasource', {
  query: 'cpu_usage{host="server01"}',
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-08T00:00:00Z',
  step: '1h'
})

// Generate line chart showing CPU usage over time
createLineChart(cpuData)
```

### 3. Multi-Instance Analysis
```typescript
// Query all CPU cores
const allCores = await DataSourceApi.queryMetrics('metricsapp-datasource', {
  query: 'cpu_usage{counter_name="% Processor Time"}',
  startTime: startTime,
  endTime: endTime
})

// Generate heatmap showing per-core usage
createHeatMap(allCores)
```

## Graph Types and Use Cases

### 1. Line Charts
- **Use Case**: Trends over time
- **Examples**: CPU usage, memory usage, disk I/O
- **Best For**: Single metrics, comparisons

### 2. Area Charts
- **Use Case**: Stacked metrics showing composition
- **Examples**: Memory breakdown (used, cached, free)
- **Best For**: Part-to-whole relationships

### 3. Heatmaps
- **Use Case**: Multi-dimensional data
- **Examples**: CPU usage across multiple cores/servers
- **Best For**: Identifying patterns and hotspots

### 4. Bar Charts
- **Use Case**: Discrete comparisons
- **Examples**: Top processes by CPU usage
- **Best For**: Rankings and comparisons

### 5. Gauge Charts
- **Use Case**: Current values with thresholds
- **Examples**: Current CPU usage with warning levels
- **Best For**: Real-time status indicators

## Frontend Integration

### Dashboard Component Structure
```typescript
// PerfCounterDashboard.tsx
const PerfCounterDashboard = () => {
  // Real-time data from WebSocket/SignalR
  const realTimeData = useRealTimeMetrics(['cpu_usage', 'memory_usage'])
  
  // Historical data from API
  const historicalData = useHistoricalMetrics({
    metrics: ['cpu_usage'],
    timeRange: '24h'
  })
  
  return (
    <div className="dashboard">
      <RealTimeGauges data={realTimeData} />
      <HistoricalCharts data={historicalData} />
      <CustomQueryBuilder onQuery={handleCustomQuery} />
    </div>
  )
}
```

## Benefits of This Approach

### ✅ Flexibility
- Pick and choose counters
- Adjust frequencies per counter
- Custom tags and metadata

### ✅ Performance  
- Efficient collection with limits
- Scalable storage
- Fast querying

### ✅ Visualization Options
- Real-time dashboards
- Historical analysis
- Custom graph types
- Multiple time ranges

### ✅ Easy Configuration
- Predefined counter sets
- JSON configuration
- Hot-reloading support

## Next Steps

1. ✅ **Enhanced Collector** - Already implemented
2. 🔲 **MetricsApp Data Source** - Create data source for historical queries
3. 🔲 **Frontend Dashboards** - Build visualization components
4. 🔲 **Query Builder UI** - Allow users to create custom queries
5. 🔲 **Alert Configuration** - Set up threshold-based alerts

This hybrid approach gives you the best of both worlds: real-time collection for monitoring and alerting, plus historical querying for analysis and custom visualizations. 