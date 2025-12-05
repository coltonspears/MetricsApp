import { useState, useEffect } from 'react'
import {
  Database,
  Search,
  RefreshCw,
  Clock,
  BarChart3,
  Plus,
  X,
  Activity,
  AlertTriangle,
  Target,
  Sliders
} from 'lucide-react'
import { DataSourceApi, DataSourceConfiguration } from '../lib/datasource-api'
import TelemetryApi from '../lib/telemetry-api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import PageHeader from '../components/PageHeader'

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
  relative?: string
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

const TelemetryExplorer = () => {
  const [dataSources, setDataSources] = useState<DataSourceConfiguration[]>([])
  const [selectedDataSource, setSelectedDataSource] = useState<string>('')
  const [metricExplorer, setMetricExplorer] = useState<MetricExplorer>({
    selectedMetrics: [],
    availableMetrics: [],
    filters: [],
    groupBy: [],
    aggregation: 'avg'
  })

  const [panels, setPanels] = useState<VisualizationPanel[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>({
    start: new Date(Date.now() - 3600000),
    end: new Date(),
    relative: '1h'
  })

  const [queryBuilderOpen, setQueryBuilderOpen] = useState(true)
  const [metricBrowserOpen, setMetricBrowserOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otlpHealth, setOTLPHealth] = useState<boolean | null>(null)

  useEffect(() => {
    loadDataSources()
  }, [])

  useEffect(() => {
    if (selectedDataSource) {
      loadAvailableMetrics()
    }
  }, [selectedDataSource])

  useEffect(() => {
    checkOTLPHealth()
  }, [selectedDataSource])

  const loadDataSources = async () => {
    try {
      const sources = await DataSourceApi.getDataSources()
      setDataSources(sources)
      if (sources.length > 0 && !selectedDataSource) {
        setSelectedDataSource(sources[0].id)
      }
    } catch {
      setError('Failed to load data sources')
    }
  }

  const loadAvailableMetrics = async () => {
    if (!selectedDataSource) return
    try {
      setLoading(true)
      const metrics = await TelemetryApi.getMetricMetadata(selectedDataSource)
      setMetricExplorer(prev => ({ ...prev, availableMetrics: metrics }))
    } catch {
      setError('Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  const checkOTLPHealth = async () => {
    try {
      const health = await TelemetryApi.testOTLPHealth()
      setOTLPHealth(health)
    } catch {
      setOTLPHealth(false)
    }
  }

  const executeQuery = async (query: TelemetryQuery) => {
    try {
      setLoading(true)
      const metrics = await TelemetryApi.queryMetrics({
        startTime: query.timeRange.start,
        endTime: query.timeRange.end,
        metricNames: [query.query],
        limit: 1000
      })

      const chartData = metrics.flatMap(metric =>
        metric.samples.map(sample => ({
          timestamp: new Date(sample.timestamp * 1000),
          value: sample.value,
          metric: metric.name,
          labels: sample.labels
        }))
      )

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

  const addQuery = async () => {
    const newQuery: TelemetryQuery = {
      id: `query-${Date.now()}`,
      dataSource: selectedDataSource,
      query: metricExplorer.selectedMetrics[0] || '',
      timeRange,
      refreshInterval: 30000,
      enabled: true
    }
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
    setMetricExplorer(prev => ({ ...prev, filters: [...prev.filters, newFilter] }))
  }

  const removeFilter = (filterId: string) => {
    setMetricExplorer(prev => ({ ...prev, filters: prev.filters.filter(f => f.id !== filterId) }))
  }

  const updateFilter = (filterId: string, updates: Partial<MetricFilter>) => {
    setMetricExplorer(prev => ({
      ...prev,
      filters: prev.filters.map(f => f.id === filterId ? { ...f, ...updates } : f)
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

  const handleTimeRangeChange = (value: string) => {
    if (value !== 'custom') {
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
  }

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

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

    switch (panel.type) {
      case 'timeseries':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={panel.data}>
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
              <Line type="monotone" dataKey="value" stroke="var(--interactive-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'barchart':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={panel.data.slice(-20)}>
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
            </BarChart>
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
            <PieChart>
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
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
            </PieChart>
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
            <div className={`text-sm flex items-center ${change >= 0 ? 'text-themed-status-success' : 'text-themed-status-error'}`}>
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
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-themed-border-primary">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">Timestamp</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">Value</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">Metric</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">Labels</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-themed-border-primary">
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
                          <span key={key} className="badge-muted">{key}={String(value)}</span>
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
    <div className="page-shell">
      <PageHeader
        title="Telemetry Explorer"
        description="Query, visualize, and analyze metrics from your connected data sources"
        meta={
          <span className="badge-muted">
            <Target className="h-3 w-3" />
            {selectedDataSource ? dataSources.find(ds => ds.id === selectedDataSource)?.name : 'No source selected'}
          </span>
        }
        actions={
          <div className="page-actions">
            <a href="/telemetry/testing" className="btn-themed-secondary">
              <Activity className="h-4 w-4 mr-2" />
              API Testing
            </a>
            <button
              onClick={() => setQueryBuilderOpen(!queryBuilderOpen)}
              className={queryBuilderOpen ? 'btn-themed-primary' : 'btn-themed-secondary'}
            >
              <Sliders className="h-4 w-4 mr-2" />
              Query Builder
            </button>
            <button
              onClick={() => setMetricBrowserOpen(!metricBrowserOpen)}
              className={metricBrowserOpen ? 'btn-themed-primary' : 'btn-themed-secondary'}
            >
              <Database className="h-4 w-4 mr-2" />
              Metrics
            </button>
            <button
              onClick={loadAvailableMetrics}
              disabled={loading}
              className="btn-themed-secondary disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-muted">
            <Clock className="h-3 w-3" />
            Range: {timeRange.relative || 'Custom'}
          </span>
          <span className="badge-muted">
            {metricExplorer.availableMetrics.length} metrics
          </span>
          <span className={`badge-muted ${otlpHealth ? 'text-themed-status-success' : 'text-themed-status-error'}`}>
            <div className={`w-2 h-2 rounded-full mr-1 ${otlpHealth === null ? 'bg-gray-400' : otlpHealth ? 'bg-green-500' : 'bg-red-500'}`} />
            OTLP {otlpHealth === null ? 'Unknown' : otlpHealth ? 'Healthy' : 'Offline'}
          </span>
        </div>
      </PageHeader>

      <div className="page-toolbar">
        <div className="page-toolbar__group">
          <label className="text-xs font-semibold uppercase tracking-wide text-themed-text-muted">Data Source</label>
          <select
            value={selectedDataSource}
            onChange={(e) => setSelectedDataSource(e.target.value)}
            className="input-themed"
          >
            <option value="">Select Data Source</option>
            {dataSources.map(ds => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group">
          <label className="text-xs font-semibold uppercase tracking-wide text-themed-text-muted">Time Range</label>
          <select
            value={timeRange.relative || 'custom'}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="input-themed"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="panel border-themed-alert-error">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-themed-status-error flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="panel-title text-themed-status-error">Error</h3>
              <p className="text-sm text-themed-text-secondary mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6 flex-1 min-h-0">
        {metricBrowserOpen && (
          <aside className="w-80 flex-shrink-0">
            <div className="panel h-full overflow-hidden flex flex-col">
              <div className="panel-header">
                <h3 className="panel-title">Available Metrics</h3>
                <span className="badge-muted">{metricExplorer.availableMetrics.length}</span>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
                <input
                  type="text"
                  placeholder="Search metrics..."
                  className="input-themed w-full pl-10"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {metricExplorer.availableMetrics.map(metric => (
                  <div
                    key={metric.name}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      metricExplorer.selectedMetrics.includes(metric.name)
                        ? 'bg-themed-interactive-secondary border-themed-border-accent'
                        : 'border-themed-border-primary hover:bg-themed-interactive-secondary-hover'
                    }`}
                    onClick={() => selectMetric(metric.name)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-themed-text-primary text-sm">{metric.name}</span>
                      <span className={`badge-muted text-xs ${
                        metric.type === 'counter' ? 'text-blue-400' :
                        metric.type === 'gauge' ? 'text-green-400' :
                        metric.type === 'histogram' ? 'text-purple-400' : ''
                      }`}>
                        {metric.type}
                      </span>
                    </div>
                    {metric.description && (
                      <p className="text-xs text-themed-text-secondary mt-1 line-clamp-2">{metric.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-2 text-xs text-themed-text-muted">
                      <span>{metric.sampleCount} samples</span>
                      <span>{new Date(metric.lastSeen).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {queryBuilderOpen && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Query Builder</h3>
                <button
                  onClick={addQuery}
                  disabled={!selectedDataSource || metricExplorer.selectedMetrics.length === 0}
                  className="btn-themed-primary disabled:opacity-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Query
                </button>
              </div>

              {metricExplorer.selectedMetrics.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-themed-text-secondary">Selected Metrics</label>
                  <div className="flex flex-wrap gap-2">
                    {metricExplorer.selectedMetrics.map(metric => (
                      <span key={metric} className="badge-muted flex items-center">
                        {metric}
                        <button onClick={() => selectMetric(metric)} className="ml-2 hover:text-themed-status-error">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-themed-text-secondary">Filters</label>
                  <button onClick={addFilter} className="btn-themed-secondary text-xs py-1 px-2">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Filter
                  </button>
                </div>

                {metricExplorer.filters.map(filter => (
                  <div key={filter.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Label name"
                      value={filter.field}
                      onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                      className="input-themed flex-1"
                    />
                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                      className="input-themed w-20"
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
                      className="input-themed flex-1"
                    />
                    <button onClick={() => removeFilter(filter.id)} className="p-2 text-themed-status-error hover:bg-themed-alert-error hover:bg-opacity-10 rounded">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-themed-text-secondary">Aggregation</label>
                <select
                  value={metricExplorer.aggregation}
                  onChange={(e) => setMetricExplorer(prev => ({ ...prev, aggregation: e.target.value }))}
                  className="input-themed w-48"
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
          )}

          <div className="flex-1">
            {panels.length === 0 ? (
              <div className="panel h-full flex flex-col items-center justify-center text-themed-text-secondary">
                <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2">No Queries Yet</h3>
                <p className="text-center max-w-md">
                  Select metrics from the sidebar and build queries to start exploring your telemetry data.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {panels.map(panel => (
                  <div key={panel.id} className="panel">
                    <div className="panel-header">
                      <h4 className="panel-title">{panel.title}</h4>
                      <div className="flex items-center gap-2">
                        <select
                          value={panel.type}
                          onChange={(e) => setPanels(prev => prev.map(p =>
                            p.id === panel.id ? { ...p, type: e.target.value as any } : p
                          ))}
                          className="input-themed text-sm py-1"
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
