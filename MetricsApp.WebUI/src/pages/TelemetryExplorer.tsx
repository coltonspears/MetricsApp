import { useState, useEffect, useCallback } from 'react'
import { 
  Database, 
  Search, 
  Filter, 
  Play, 
  RefreshCw, 
  Settings, 
  Calendar,
  Clock,
  BarChart3,
  LineChart,
  PieChart,
  Table,
  Download,
  Share,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Sliders,
  Target,
  Zap,
  Activity,
  AlertTriangle,
  Info
} from 'lucide-react'
import { MetricsApi } from '../lib/api'
import { DataSourceApi, DataSourceConfiguration } from '../lib/datasource-api'
import TelemetryApi from '../lib/telemetry-api'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'

interface TelemetryQuery {
  id: string
  dataSource: string
  query: string
  timeRange: TimeRange
  refreshInterval: number
  enabled: boolean
}

interface TimeRange {
  start: Date
  end: Date
  relative?: string // '1h', '24h', '7d', etc.
}

interface MetricExplorer {
  selectedMetrics: string[]
  availableMetrics: AvailableMetric[]
  filters: MetricFilter[]
  groupBy: string[]
  aggregation: string
}

interface MetricFilter {
  id: string
  field: string
  operator: string
  value: string
  enabled: boolean
}

interface AvailableMetric {
  name: string
  type: string
  description?: string
  unit?: string
  labels: string[]
  lastSeen: Date
  sampleCount: number
}

interface VisualizationPanel {
  id: string
  title: string
  type: 'timeseries' | 'stat' | 'table' | 'piechart' | 'barchart'
  query: TelemetryQuery
  data: any[]
  loading: boolean
  error?: string
}

const TelemetryExplorer = () => {
  // Core state
  const [dataSources, setDataSources] = useState<DataSourceConfiguration[]>([])
  const [selectedDataSource, setSelectedDataSource] = useState<string>('')
  const [metricExplorer, setMetricExplorer] = useState<MetricExplorer>({
    selectedMetrics: [],
    availableMetrics: [],
    filters: [],
    groupBy: [],
    aggregation: 'avg'
  })
  
  // Query and visualization state
  const [queries, setQueries] = useState<TelemetryQuery[]>([])
  const [panels, setPanels] = useState<VisualizationPanel[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: new Date(Date.now() - 3600000), // 1 hour ago
    end: new Date(),
    relative: '1h'
  })
  
  // UI state
  const [queryBuilderOpen, setQueryBuilderOpen] = useState(true)
  const [metricBrowserOpen, setMetricBrowserOpen] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load data sources on mount
  useEffect(() => {
    loadDataSources()
  }, [])

  // Load metrics when data source changes
  useEffect(() => {
    if (selectedDataSource) {
      loadAvailableMetrics()
    }
  }, [selectedDataSource])

  const loadDataSources = async () => {
    try {
      const sources = await DataSourceApi.getDataSources()
      setDataSources(sources)
      if (sources.length > 0 && !selectedDataSource) {
        setSelectedDataSource(sources[0].id)
      }
    } catch (err) {
      setError('Failed to load data sources')
    }
  }

  const loadAvailableMetrics = async () => {
    if (!selectedDataSource) return
    
    try {
      setLoading(true)
      // Use the TelemetryApi to get real metrics metadata
      const metrics = await TelemetryApi.getMetricMetadata(selectedDataSource)
      
      setMetricExplorer(prev => ({
        ...prev,
        availableMetrics: metrics
      }))
    } catch (err) {
      setError('Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  const executeQuery = async (query: TelemetryQuery) => {
    try {
      setLoading(true)
      
      // Use TelemetryApi to execute the query
      const metrics = await TelemetryApi.queryMetrics({
        startTime: query.timeRange.start,
        endTime: query.timeRange.end,
        metricNames: [query.query],
        limit: 1000
      })
      
      // Convert OTLP metrics to chart data format
      const chartData = metrics.flatMap(metric => 
        metric.samples.map(sample => ({
          timestamp: new Date(sample.timestamp * 1000),
          value: sample.value,
          metric: metric.name,
          labels: sample.labels
        }))
      )
      
      // Update or create panel
      const existingPanel = panels.find(p => p.query.id === query.id)
      if (existingPanel) {
        setPanels(prev => prev.map(p => 
          p.query.id === query.id 
            ? { ...p, data: chartData, loading: false, error: undefined }
            : p
        ))
      } else {
        const newPanel: VisualizationPanel = {
          id: `panel-${Date.now()}`,
          title: `Query: ${query.query}`,
          type: 'timeseries',
          query,
          data: chartData,
          loading: false
        }
        setPanels(prev => [...prev, newPanel])
      }
    } catch (err) {
      setPanels(prev => prev.map(p => 
        p.query.id === query.id 
          ? { ...p, loading: false, error: err instanceof Error ? err.message : 'Query failed' }
          : p
      ))
    } finally {
      setLoading(false)
    }
  }

  // OTLP Health Status
  const [otlpHealth, setOTLPHealth] = useState<boolean | null>(null)
  const [otlpStats, setOTLPStats] = useState<any>(null)

  const checkOTLPHealth = async () => {
    try {
      const health = await TelemetryApi.testOTLPHealth()
      setOTLPHealth(health)
      
      // Get telemetry stats
      const response = await fetch('/api/v1/telemetry/stats')
      if (response.ok) {
        const stats = await response.json()
        setOTLPStats(stats)
      }
    } catch (err) {
      setOTLPHealth(false)
      setOTLPStats(null)
    }
  }

  // Check OTLP health on mount and when data source changes
  useEffect(() => {
    checkOTLPHealth()
  }, [selectedDataSource])

  const addQuery = async () => {
    const newQuery: TelemetryQuery = {
      id: `query-${Date.now()}`,
      dataSource: selectedDataSource,
      query: metricExplorer.selectedMetrics[0] || '',
      timeRange,
      refreshInterval: 30000,
      enabled: true
    }
    setQueries(prev => [...prev, newQuery])
    
    // Auto-execute the query
    await executeQuery(newQuery)
  }

  const addFilter = () => {
    const newFilter: MetricFilter = {
      id: `filter-${Date.now()}`,
      field: '',
      operator: '=',
      value: '',
      enabled: true
    }
    setMetricExplorer(prev => ({
      ...prev,
      filters: [...prev.filters, newFilter]
    }))
  }

  const removeFilter = (filterId: string) => {
    setMetricExplorer(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.id !== filterId)
    }))
  }

  const updateFilter = (filterId: string, updates: Partial<MetricFilter>) => {
    setMetricExplorer(prev => ({
      ...prev,
      filters: prev.filters.map(f => 
        f.id === filterId ? { ...f, ...updates } : f
      )
    }))
  }

  const selectMetric = (metricName: string) => {
    setMetricExplorer(prev => ({
      ...prev,
      selectedMetrics: prev.selectedMetrics.includes(metricName)
        ? prev.selectedMetrics.filter(m => m !== metricName)
        : [...prev.selectedMetrics, metricName]
    }))
  }

  const timeRangeOptions = [
    { label: 'Last 5 minutes', value: '5m' },
    { label: 'Last 15 minutes', value: '15m' },
    { label: 'Last 30 minutes', value: '30m' },
    { label: 'Last 1 hour', value: '1h' },
    { label: 'Last 3 hours', value: '3h' },
    { label: 'Last 6 hours', value: '6h' },
    { label: 'Last 12 hours', value: '12h' },
    { label: 'Last 24 hours', value: '24h' },
    { label: 'Last 7 days', value: '7d' },
    { label: 'Last 30 days', value: '30d' }
  ]

  const renderVisualizationPanel = (panel: VisualizationPanel) => {
    if (panel.loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-themed-interactive-primary" />
          <span className="ml-2 text-themed-text-secondary">Loading...</span>
        </div>
      )
    }

    if (panel.error) {
      return (
        <div className="flex items-center justify-center h-64 text-themed-status-error">
          <AlertTriangle className="h-8 w-8 mr-2" />
          <span>{panel.error}</span>
        </div>
      )
    }

    switch (panel.type) {
      case 'timeseries':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={panel.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="var(--text-secondary)"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-elevated)', 
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
                labelFormatter={(value) => new Date(value).toLocaleString()}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="var(--interactive-primary)" 
                strokeWidth={2}
                dot={false}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        )

      case 'barchart':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={panel.data.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis 
                dataKey="timestamp" 
                stroke="var(--text-secondary)"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis stroke="var(--text-secondary)" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-elevated)', 
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }}
                labelFormatter={(value) => new Date(value).toLocaleString()}
              />
              <Bar dataKey="value" fill="var(--interactive-primary)" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        )

      case 'piechart':
        const aggregatedData = panel.data.reduce((acc: any, item: any) => {
          const key = item.labels?.service || item.metric || 'unknown'
          acc[key] = (acc[key] || 0) + item.value
          return acc
        }, {})
        
        const pieData = Object.entries(aggregatedData).map(([name, value]) => ({ name, value }))
        
        return (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="var(--interactive-primary)"
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-elevated)', 
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)'
                }} 
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        )

      case 'stat':
        const latestValue = panel.data[panel.data.length - 1]?.value || 0
        const previousValue = panel.data[panel.data.length - 2]?.value || 0
        const change = latestValue - previousValue
        const changePercent = previousValue !== 0 ? (change / previousValue) * 100 : 0
        
        return (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="text-4xl font-bold text-themed-text-primary mb-2">
              {latestValue.toFixed(2)}
            </div>
            <div className={`text-sm flex items-center ${
              change >= 0 ? 'text-themed-status-success' : 'text-themed-status-error'
            }`}>
              <span className="mr-1">
                {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(1)}%)
              </span>
              {change >= 0 ? '↗' : '↘'}
            </div>
            <div className="text-xs text-themed-text-secondary mt-2">
              Last updated: {new Date(panel.data[panel.data.length - 1]?.timestamp).toLocaleString()}
            </div>
          </div>
        )

      case 'table':
        return (
          <div className="overflow-auto max-h-64">
            <table className="min-w-full divide-y divide-themed-border-primary">
              <thead className="bg-themed-bg-secondary">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                    Metric
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                    Labels
                  </th>
                </tr>
              </thead>
              <tbody className="bg-themed-bg-primary divide-y divide-themed-border-primary">
                {panel.data.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-themed-text-primary">
                      {new Date(row.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-themed-text-primary">
                      {row.value.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-themed-text-secondary">
                      {row.metric}
                    </td>
                    <td className="px-4 py-2 text-sm text-themed-text-secondary">
                      <div className="flex flex-wrap gap-1">
                        {row.labels && Object.entries(row.labels).map(([key, value]) => (
                          <span key={key} className="px-2 py-1 text-xs bg-themed-bg-tertiary rounded">
                            {key}={String(value)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      default:
        return <div className="text-themed-text-secondary">Visualization type not implemented</div>
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-themed-border-primary bg-themed-bg-primary p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Target className="h-6 w-6 text-themed-interactive-primary mr-2" />
              <h1 className="text-2xl font-bold text-themed-text-primary">Telemetry Explorer</h1>
            </div>
            
            {/* Data Source Selector */}
            <select
              value={selectedDataSource}
              onChange={(e) => setSelectedDataSource(e.target.value)}
              className="px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary"
            >
              <option value="">Select Data Source</option>
              {dataSources.map(ds => (
                <option key={ds.id} value={ds.id}>{ds.name}</option>
              ))}
            </select>

            {/* Time Range Selector */}
            <select
              value={timeRange.relative || 'custom'}
              onChange={(e) => {
                if (e.target.value !== 'custom') {
                  const value = e.target.value
                  const ms = value === '5m' ? 300000 :
                           value === '15m' ? 900000 :
                           value === '30m' ? 1800000 :
                           value === '1h' ? 3600000 :
                           value === '3h' ? 10800000 :
                           value === '6h' ? 21600000 :
                           value === '12h' ? 43200000 :
                           value === '24h' ? 86400000 :
                           value === '7d' ? 604800000 :
                           value === '30d' ? 2592000000 : 3600000
                  
                  setTimeRange({
                    start: new Date(Date.now() - ms),
                    end: new Date(),
                    relative: value
                  })
                }
              }}
              className="px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary"
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href="/telemetry/testing"
              className="px-3 py-2 text-sm font-medium rounded-lg bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary hover:bg-themed-interactive-secondary-hover transition-colors"
            >
              <Activity className="h-4 w-4 mr-1 inline" />
              API Testing
            </a>
            
            <button
              onClick={() => setQueryBuilderOpen(!queryBuilderOpen)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                queryBuilderOpen 
                  ? 'bg-themed-interactive-primary text-themed-text-inverse' 
                  : 'bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary hover:bg-themed-interactive-secondary-hover'
              }`}
            >
              <Sliders className="h-4 w-4 mr-1 inline" />
              Query Builder
            </button>
            
            <button
              onClick={() => setMetricBrowserOpen(!metricBrowserOpen)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                metricBrowserOpen 
                  ? 'bg-themed-interactive-primary text-themed-text-inverse' 
                  : 'bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary hover:bg-themed-interactive-secondary-hover'
              }`}
            >
              <Database className="h-4 w-4 mr-1 inline" />
              Metrics
            </button>

            <button
              onClick={loadAvailableMetrics}
              disabled={loading}
              className="px-3 py-2 text-sm font-medium rounded-lg bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary hover:bg-themed-interactive-secondary-hover transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-1 inline ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* OTLP Health Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                otlpHealth === null ? 'bg-gray-400' :
                otlpHealth ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <span className="text-xs text-themed-text-secondary">
                OTLP {otlpHealth === null ? 'Unknown' : otlpHealth ? 'Healthy' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Sidebar - Metric Browser */}
        {metricBrowserOpen && (
          <div className="w-80 border-r border-themed-border-primary bg-themed-bg-secondary p-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-themed-text-primary">Available Metrics</h3>
                <span className="text-sm text-themed-text-secondary">
                  {metricExplorer.availableMetrics.length} metrics
                </span>
              </div>

              {/* Metric Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-themed-text-secondary" />
                <input
                  type="text"
                  placeholder="Search metrics..."
                  className="w-full pl-10 pr-4 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary"
                />
              </div>

              {/* Metric List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {metricExplorer.availableMetrics.map(metric => (
                  <div
                    key={metric.name}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      metricExplorer.selectedMetrics.includes(metric.name)
                        ? 'bg-themed-interactive-secondary border-themed-interactive-primary'
                        : 'bg-themed-bg-surface border-themed-border-primary hover:bg-themed-interactive-secondary-hover'
                    }`}
                    onClick={() => selectMetric(metric.name)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-themed-text-primary">{metric.name}</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        metric.type === 'counter' ? 'bg-blue-100 text-blue-800' :
                        metric.type === 'gauge' ? 'bg-green-100 text-green-800' :
                        metric.type === 'histogram' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {metric.type}
                      </span>
                    </div>
                    {metric.description && (
                      <p className="text-sm text-themed-text-secondary mt-1">{metric.description}</p>
                    )}
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center space-x-2 text-xs text-themed-text-secondary">
                        {metric.unit && (
                          <span className="px-2 py-1 bg-themed-bg-tertiary rounded">
                            {metric.unit}
                          </span>
                        )}
                        <span>{metric.sampleCount} samples</span>
                      </div>
                      <span className="text-xs text-themed-text-secondary">
                        {new Date(metric.lastSeen).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {metric.labels.map(label => (
                        <span key={label} className="px-2 py-1 text-xs bg-themed-bg-tertiary text-themed-text-secondary rounded">
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Query Builder */}
          {queryBuilderOpen && (
            <div className="border-b border-themed-border-primary bg-themed-bg-secondary p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-themed-text-primary">Query Builder</h3>
                  <button
                    onClick={addQuery}
                    disabled={!selectedDataSource || metricExplorer.selectedMetrics.length === 0}
                    className="px-3 py-2 text-sm font-medium rounded-lg bg-themed-interactive-primary text-themed-text-inverse hover:bg-themed-interactive-primary-hover transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4 mr-1 inline" />
                    Add Query
                  </button>
                </div>

                {/* Selected Metrics */}
                {metricExplorer.selectedMetrics.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-themed-text-primary mb-2">
                      Selected Metrics
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {metricExplorer.selectedMetrics.map(metric => (
                        <span
                          key={metric}
                          className="px-3 py-1 bg-themed-interactive-secondary text-themed-text-primary rounded-full text-sm flex items-center"
                        >
                          {metric}
                          <button
                            onClick={() => selectMetric(metric)}
                            className="ml-2 text-themed-text-secondary hover:text-themed-status-error"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Filters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-themed-text-primary">
                      Filters
                    </label>
                    <button
                      onClick={addFilter}
                      className="px-2 py-1 text-xs font-medium rounded bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary hover:bg-themed-interactive-secondary-hover transition-colors"
                    >
                      <Plus className="h-3 w-3 mr-1 inline" />
                      Add Filter
                    </button>
                  </div>
                  
                  {metricExplorer.filters.map(filter => (
                    <div key={filter.id} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        placeholder="Label name"
                        value={filter.field}
                        onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                        className="flex-1 px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary"
                      />
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                        className="px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary"
                      >
                        <option value="=">=</option>
                        <option value="!=">!=</option>
                        <option value="=~">=~</option>
                        <option value="!~">!~</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Value"
                        value={filter.value}
                        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                        className="flex-1 px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary"
                      />
                      <button
                        onClick={() => removeFilter(filter.id)}
                        className="p-2 text-themed-status-error hover:bg-themed-alert-error hover:bg-opacity-10 rounded-lg transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Aggregation */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-themed-text-primary mb-2">
                      Aggregation
                    </label>
                    <select
                      value={metricExplorer.aggregation}
                      onChange={(e) => setMetricExplorer(prev => ({ ...prev, aggregation: e.target.value }))}
                      className="w-full px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary"
                    >
                      <option value="avg">Average</option>
                      <option value="sum">Sum</option>
                      <option value="min">Minimum</option>
                      <option value="max">Maximum</option>
                      <option value="count">Count</option>
                      <option value="rate">Rate</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visualization Panels */}
          <div className="flex-1 p-4 overflow-y-auto">
            {panels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-themed-text-secondary">
                <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2">No Queries Yet</h3>
                <p className="text-center max-w-md">
                  Select metrics from the sidebar and build queries to start exploring your telemetry data.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {panels.map(panel => (
                  <div key={panel.id} className="bg-themed-bg-surface border border-themed-border-primary rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-themed-text-primary">{panel.title}</h4>
                      <div className="flex items-center space-x-2">
                        <select
                          value={panel.type}
                          onChange={(e) => setPanels(prev => prev.map(p => 
                            p.id === panel.id 
                              ? { ...p, type: e.target.value as any }
                              : p
                          ))}
                          className="px-2 py-1 text-sm border border-themed-border-primary rounded bg-themed-bg-surface text-themed-text-primary"
                        >
                          <option value="timeseries">Time Series</option>
                          <option value="stat">Stat</option>
                          <option value="table">Table</option>
                          <option value="barchart">Bar Chart</option>
                          <option value="piechart">Pie Chart</option>
                        </select>
                        <button
                          onClick={() => executeQuery(panel.query)}
                          className="p-1 text-themed-interactive-primary hover:bg-themed-interactive-secondary-hover rounded"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setPanels(prev => prev.filter(p => p.id !== panel.id))}
                          className="p-1 text-themed-status-error hover:bg-themed-alert-error hover:bg-opacity-10 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {renderVisualizationPanel(panel)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TelemetryExplorer 