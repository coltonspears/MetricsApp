# Explore Page Updates - Grafana-like Interface

## Overview

The Explore page has been significantly updated to provide a more Grafana-like experience with better support for viewing metrics data, time series data, and ingested data from various sources. The updates unify the behavior between configured data sources (like Prometheus and SQL Server) and push-based ingested data.

## Key Features Added

### 1. **Unified Data Source Selection**
- **Configured Data Sources**: Traditional data sources like Prometheus and SQL Server
- **Ingested Data**: Virtual data source for metrics pushed via the API
- Grouped selection with clear categorization
- Support for both pull-based (Prometheus, SQL Server) and push-based (ingested) data

### 2. **Enhanced Time Range Controls**
- **Manual Time Selection**: Start and end datetime-local inputs
- **Quick Time Ranges**: Buttons for 1h, 4h, 24h, 7d
- **Per-Tab Time Ranges**: Each query tab maintains its own time range
- **Automatic Time Range Application**: Time ranges are applied to all query types

### 3. **Improved Query Interface**
- **Context-Aware Query Builder**: Adapts to selected data source type
- **Query Examples**: Different examples for each data source type
- **Ingested Data Filtering**: Support for filtering by metricName, source, environment
- **Enhanced Help Text**: Better guidance for each data source type

### 4. **Advanced Visualization**
- **Multi-Series Support**: Display multiple metrics on the same chart
- **Automatic Chart Type Detection**: Line charts for time series, bar charts for aggregated data
- **Color-Coded Series**: Each metric gets a unique color
- **Legend Display**: Shows series names and colors
- **Enhanced Tooltips**: Better formatted tooltips with time labels

### 5. **Better Tab Management**
- **Multiple Query Tabs**: Support for multiple concurrent queries
- **Tab State Persistence**: Each tab maintains query, data source, and time range
- **Visual Indicators**: Running state indicators and close buttons
- **Editable Tab Names**: Click to edit tab names

## Technical Implementation

### Data Source Architecture

```typescript
interface DataSource extends DataSourceConfiguration {
  category: 'datasource' | 'ingested'
}
```

- Extended the data source interface to include a category
- Added virtual "Ingested Data" data source for API-based metrics
- Unified querying interface across all data source types

### Query Execution Flow

1. **Data Source Detection**: Determines query type based on data source category
2. **Time Range Application**: Applies tab-specific time ranges to all queries
3. **Query Routing**: 
   - Ingested data → Direct API call to `/api/v1/metrics/Query`
   - SQL-like queries → `DataSourceApi.queryLogs()`
   - Metric queries → `DataSourceApi.queryMetrics()`

### Visualization Enhancements

- **Multi-Series Line Charts**: For time-series data with multiple metrics
- **Automatic Data Transformation**: Converts API responses to chart-friendly format
- **Color Management**: Consistent color assignment across series
- **Performance Optimization**: Limits data points and provides pagination

## Data Source Support

### 1. **Prometheus**
- **Query Type**: PromQL
- **Visualization**: Time-series line charts
- **Examples**: `up`, `rate(http_requests_total[5m])`, etc.
- **Features**: Native Prometheus query support

### 2. **SQL Server**
- **Query Type**: SQL queries
- **Visualization**: Line charts for metrics, bar charts for logs
- **Examples**: Log queries with time filtering
- **Features**: Table and metric querying

### 3. **Ingested Data**
- **Query Type**: Filter expressions
- **Visualization**: Multi-series line charts
- **Examples**: `metricName=cpu.usage`, `environment=Production`
- **Features**: 
  - Time range filtering (controlled by UI)
  - Multiple filter criteria support
  - Automatic grouping by metric name
  - Real-time data exploration

## User Experience Improvements

### Grafana-like Features
- **Split Panel Layout**: Time controls separate from query interface
- **Persistent Query Tabs**: Multiple concurrent explorations
- **Quick Time Range Selection**: Common time ranges as buttons
- **Auto-Refresh Capability**: Ready for future implementation
- **Export Functionality**: CSV export of results
- **Error Handling**: Better error display with debugging information

### Navigation & Usability
- **Categorized Data Sources**: Clear separation of configured vs ingested
- **Context-Sensitive Help**: Different help text per data source type
- **Keyboard Shortcuts**: Ctrl+Enter to execute queries
- **Visual State Indicators**: Loading states, error states, success states

## API Integration

### Ingested Data Querying
```typescript
const response = await fetch(`/api/v1/metrics/Query?startTime=${startTime}&endTime=${endTime}&limit=1000${query ? '&query=' + query : ''}`)
```

### Response Processing
- Handles the MetricsApp-specific API format
- Transforms time-series data for visualization
- Supports multiple metrics in a single response
- Flattens complex nested structures

## Configuration Examples

### Quick Time Range Usage
```typescript
const setQuickTimeRange = (tabId: string, hours: number) => {
  const now = new Date()
  const start = new Date(now.getTime() - hours * 60 * 60 * 1000)
  updateTabTimeRange(tabId, {
    startTime: start.toISOString(),
    endTime: now.toISOString()
  })
}
```

### Ingested Data Query Examples
- `metricName=cpu.usage` - Filter by specific metric
- `environment=Production` - Filter by environment
- `source=PROD-WEB-01 OR source=PROD-DB-01` - Multiple sources
- Empty query - Returns all metrics in time range

## Benefits

1. **Unified Experience**: Same interface for all data types
2. **Improved Performance**: Better data handling and visualization
3. **Enhanced Usability**: Grafana-like interface patterns
4. **Flexible Querying**: Support for various query types and filters
5. **Real-time Exploration**: Fast iteration on data exploration
6. **Scalable Architecture**: Easy to add new data source types

## Future Enhancements

- Auto-refresh intervals
- Query history and bookmarks
- Advanced filtering UI
- Dashboard creation from explore queries
- Query sharing and collaboration features
- Performance metrics and query optimization

This update transforms the Explore page into a powerful, Grafana-like data exploration tool that provides seamless access to both configured data sources and ingested metrics data. 