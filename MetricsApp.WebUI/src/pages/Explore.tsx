import { useState, useEffect } from 'react'
import { Download, RefreshCw, Database, LineChart, Table, AlertCircle, Info, ExternalLink, HelpCircle, Clock, Play, Plus, X, ChevronDown, Code, Settings, ChevronRight, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DataSourceApi, DataSourceConfiguration } from '../lib/datasource-api'
import QueryBuilder from '../components/QueryBuilder'
import DataVisualization from '../components/DataVisualization'
import ExportModal from '../components/ExportModal'

interface QueryResult {
  id: string
  datasourceId: string
  datasourceName: string
  query: string
  timestamp: Date
  results: any[]
  error?: string
  metadata?: {
    executionTime: number
    recordCount: number
  }
  timeRange: {
    startTime: string
    endTime: string
  }
}

interface DataSource extends DataSourceConfiguration {
  category: 'datasource' | 'ingested'
}

interface AvailableMetric {
  name: string
  type: string
  description?: string
}

const Explore = () => {
  const navigate = useNavigate()
  const [datasources, setDatasources] = useState<DataSource[]>([])
  const [activeDatasourceId, setActiveDatasourceId] = useState<string | null>(null)
  const [query, setQuery] = useState<string>('')
  const [queryMode, setQueryMode] = useState<'builder' | 'code'>('code')
  const [timeRange, setTimeRange] = useState<{ startTime: string; endTime: string }>(() => getDefaultTimeRange())
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const [apiConnectionError, setApiConnectionError] = useState<string | null>(null)
  const [showDebuggingInfo, setShowDebuggingInfo] = useState(false)
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = useState(false)
  const [availableMetrics, setAvailableMetrics] = useState<AvailableMetric[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load datasources on component mount
  useEffect(() => {
    loadDatasources()
  }, [])

  useEffect(() => {
    if (activeDatasourceId) {
      loadAvailableMetrics(activeDatasourceId)
      const ds = datasources.find(ds => ds.id === activeDatasourceId)
      setQuery(getDefaultQuery(ds?.dataSourceType || ''))
    }
  }, [activeDatasourceId])

  function getDefaultTimeRange() {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    return {
      startTime: oneHourAgo.toISOString(),
      endTime: now.toISOString()
    }
  }

  const loadDatasources = async () => {
    try {
      setApiConnectionError(null)
      const configuredDatasources = await DataSourceApi.getDataSources()
      const allDatasources: DataSource[] = configuredDatasources
        .filter(ds => ds.isEnabled)
        .map(ds => ({ ...ds, category: 'datasource' as const }))
      allDatasources.push({
        id: 'ingested-data',
        name: 'Ingested Data',
        dataSourceType: 'ingested',
        url: '/api/v1/metrics',
        properties: {},
        isEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: 'ingested'
      })
      setDatasources(allDatasources)
      if (allDatasources.length > 0 && !activeDatasourceId) {
        setActiveDatasourceId(allDatasources[0].id)
      }
    } catch (error) {
      console.error('Failed to load datasources:', error)
      if (error instanceof Error && error.message.includes('Network error')) {
        setApiConnectionError('Cannot connect to the MetricsApp API. Please ensure the backend server is running.')
      } else {
        setApiConnectionError(error instanceof Error ? error.message : 'Failed to load data sources')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableMetrics = async (datasourceId: string) => {
    setLoadingMetrics(true)
    try {
      const datasource = datasources.find(ds => ds.id === datasourceId)
      if (!datasource) return
      if (datasource.category === 'ingested') {
        const response = await fetch('/api/v1/metrics/available')
        if (response.ok) {
          const data = await response.json()
          setAvailableMetrics(data || [])
        } else {
          setAvailableMetrics([
            { name: 'cpu.usage', type: 'gauge', description: 'CPU usage percentage' },
            { name: 'memory.usage', type: 'gauge', description: 'Memory usage percentage' },
            { name: 'disk.free', type: 'gauge', description: 'Free disk space percentage' },
            { name: 'response.time', type: 'gauge', description: 'Response time in milliseconds' },
            { name: 'MSMQ', type: 'counter', description: 'MSMQ message count' }
          ])
        }
      } else if (datasource.dataSourceType === 'prometheus') {
        setAvailableMetrics([
          { name: 'up', type: 'gauge', description: 'Instance up status' },
          { name: 'http_requests_total', type: 'counter', description: 'Total HTTP requests' },
          { name: 'http_request_duration_seconds', type: 'histogram', description: 'HTTP request duration' },
          { name: 'process_cpu_seconds_total', type: 'counter', description: 'Process CPU time' },
          { name: 'process_resident_memory_bytes', type: 'gauge', description: 'Process memory usage' }
        ])
      } else if (datasource.dataSourceType === 'sqlserver') {
        setAvailableMetrics([
          { name: 'Logs', type: 'table', description: 'Application logs table' },
          { name: 'Metrics', type: 'table', description: 'Metrics data table' },
          { name: 'Events', type: 'table', description: 'Event tracking table' }
        ])
      }
    } catch (error) {
      console.error('Failed to load available metrics:', error)
      setAvailableMetrics([])
    } finally {
      setLoadingMetrics(false)
    }
  }

  const getDefaultQuery = (datasourceType: string): string => {
    switch (datasourceType) {
      case 'prometheus':
        return 'up'
      case 'sqlserver':
        return 'SELECT TOP 100 * FROM Logs WHERE timestamp >= DATEADD(hour, -1, GETDATE())'
      case 'ingested':
        return ''
      default:
        return ''
    }
  }

  const executeQuery = async () => {
    if (!activeDatasourceId) return
    const datasource = datasources.find(ds => ds.id === activeDatasourceId)
    if (!datasource) return
    setIsRunning(true)
    try {
      const startTimeMs = Date.now()
      let results: any[] = []
      let error: string | undefined
      try {
        if (datasource.category === 'ingested') {
          const response = await fetch(`/api/v1/metrics/Query?startTime=${encodeURIComponent(timeRange.startTime)}&endTime=${encodeURIComponent(timeRange.endTime)}&limit=1000${query ? '&query=' + encodeURIComponent(query) : ''}`)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          const data = await response.json()
          if (data && data.status === 'success' && data.data && Array.isArray(data.data.result)) {
            const apiResults = data.data.result
            results = []
            apiResults.forEach((metric: any, metricIndex: number) => {
              const metricInfo = metric.metricInfo || {}
              const metricName = metricInfo.name || 'unknown'
              const hostName = metricInfo.resource?.['host.name'] || 'unknown'
              const values = metric.values || []
              values.forEach((valuePoint: any, valueIndex: number) => {
                const timestamp = valuePoint.item1 ? new Date(valuePoint.item1 * 1000).toISOString() : new Date().toISOString()
                const value = valuePoint.item2 || '0'
                results.push({
                  id: `${metricIndex}-${valueIndex}`,
                  timestamp: timestamp,
                  metricName: metricName,
                  value: value,
                  source: hostName,
                  environment: 'Production'
                })
              })
            })
          }
        } else if (query.toLowerCase().includes('select') || datasource.dataSourceType === 'sqlserver') {
          const logResult = await DataSourceApi.queryLogs(datasource.id, {
            query: query,
            startTime: timeRange.startTime,
            endTime: timeRange.endTime,
            limit: 1000
          })
          results = logResult.logs || []
          if (logResult.errorMessage) {
            error = logResult.errorMessage
          }
        } else {
          const metricResult = await DataSourceApi.queryMetrics(datasource.id, {
            query: query,
            startTime: timeRange.startTime,
            endTime: timeRange.endTime
          })
          if (metricResult.resultType === 'error') {
            error = metricResult.errorMessage
            results = []
          } else {
            results = metricResult.result || []
          }
        }
      } catch (queryError) {
        console.error('Query execution error:', queryError)
        error = queryError instanceof Error ? queryError.message : 'Query execution failed'
        results = []
      }
      const executionTime = Date.now() - startTimeMs
      const result: QueryResult = {
        id: Date.now().toString(),
        datasourceId: datasource.id,
        datasourceName: datasource.name,
        query: query,
        timestamp: new Date(),
        results,
        error,
        metadata: {
          executionTime,
          recordCount: results.length
        },
        timeRange: timeRange
      }
      setQueryResult(result)
    } catch (error) {
      console.error('Query execution failed:', error)
      setQueryResult({
        id: Date.now().toString(),
        datasourceId: activeDatasourceId!,
        datasourceName: datasources.find(ds => ds.id === activeDatasourceId)?.name || '',
        query: query,
        timestamp: new Date(),
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timeRange: timeRange
      })
    } finally {
      setIsRunning(false)
    }
  }

  const setQuickTimeRange = (hours: number) => {
    const now = new Date()
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000)
    setTimeRange({
      startTime: start.toISOString(),
      endTime: now.toISOString()
    })
    setShowTimeRangeDropdown(false)
  }

  const formatTimeRange = (timeRange: { startTime: string; endTime: string }) => {
    const start = new Date(timeRange.startTime)
    const end = new Date(timeRange.endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    if (diffHours < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60))
      return `${diffMinutes}m`
    } else if (diffHours < 24) {
      return `${Math.round(diffHours)}h`
    } else {
      const diffDays = Math.round(diffHours / 24)
      return `${diffDays}d`
    }
  }

  const activeDatasource = activeDatasourceId ? datasources.find(ds => ds.id === activeDatasourceId) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-themed-interactive-primary"></div>
        <span className="ml-4 text-themed-text-secondary">Loading data sources...</span>
      </div>
    )
  }

  if (apiConnectionError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-themed-text-primary">Data Exploration</h1>
          <p className="mt-2 text-themed-text-secondary">Query and visualize your data sources</p>
        </div>
        <div className="bg-themed-alert-error bg-opacity-10 border border-themed-alert-error rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-themed-status-error mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-themed-status-error">Connection Error</h3>
              <p className="mt-1 text-sm text-themed-text-secondary">{apiConnectionError}</p>
              <button
                onClick={loadDatasources}
                className="mt-3 inline-flex items-center px-3 py-2 border border-themed-alert-error text-sm font-medium rounded-sm text-themed-status-error bg-themed-bg-surface hover:bg-themed-alert-error hover:text-themed-text-inverse transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (datasources.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-themed-text-primary">Data Exploration</h1>
          <p className="mt-2 text-themed-text-secondary">Query and visualize your data sources</p>
        </div>
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-themed-text-muted" />
          <h3 className="mt-2 text-sm font-medium text-themed-text-primary">No Data Sources</h3>
          <p className="mt-1 text-sm text-themed-text-secondary">
            No data sources are configured. Add a data source to start exploring your data.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/connections/add')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-sm shadow-sm text-themed-text-inverse bg-themed-interactive-primary hover:bg-themed-interactive-primary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Data Source
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className={`transition-all duration-200 bg-themed-bg-tertiary border-r border-themed-border-primary ${sidebarCollapsed ? 'w-12' : 'w-64'} flex flex-col`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-themed-border-primary">
          <span className={`font-bold text-lg text-themed-text-primary transition-opacity ${sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>Data Sources</span>
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-themed-text-secondary hover:text-themed-text-primary">
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {datasources.map(ds => (
            <div key={ds.id} className={`border-b border-themed-border-primary ${activeDatasourceId === ds.id ? 'bg-themed-bg-elevated' : ''}`}>
              <button
                className={`w-full text-left px-4 py-3 flex items-center space-x-2 hover:bg-themed-interactive-secondary-hover transition-colors ${activeDatasourceId === ds.id ? 'font-bold text-themed-interactive-primary' : 'text-themed-text-primary'}`}
                onClick={() => setActiveDatasourceId(ds.id)}
              >
                <Database className="h-4 w-4" />
                <span className={`${sidebarCollapsed ? 'hidden' : ''}`}>{ds.name} <span className="text-xs text-themed-text-secondary ml-1">({ds.dataSourceType})</span></span>
              </button>
              {/* Metrics list */}
              {activeDatasourceId === ds.id && !sidebarCollapsed && (
                <div className="pl-8 pb-2">
                  {loadingMetrics ? (
                    <div className="text-xs text-themed-text-secondary py-2">Loading metrics...</div>
                  ) : (
                    <ul className="space-y-1">
                      {availableMetrics.map(metric => (
                        <li key={metric.name}>
                          <button
                            className="text-left text-sm text-themed-text-primary hover:text-themed-interactive-primary"
                            title={metric.description || metric.name}
                            onClick={() => setQuery(metric.name)}
                          >
                            {metric.name} <span className="text-xs text-themed-text-secondary ml-1">({metric.type})</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Main Area */}
      <div className="flex-1 flex flex-col space-y-0">
        {/* Header */}
        <div className="border-b border-themed-border-primary px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-themed-text-primary">Data Exploration</h1>
            <p className="mt-2 text-themed-text-secondary">Query and visualize data from your connected sources</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
              className="inline-flex items-center px-3 py-2 border border-themed-border-primary text-sm font-medium rounded-sm text-themed-text-primary bg-themed-bg-surface hover:bg-themed-interactive-secondary-hover transition-colors"
            >
              {viewMode === 'chart' ? <Table className="h-4 w-4 mr-2" /> : <LineChart className="h-4 w-4 mr-2" />}
              {viewMode === 'chart' ? 'Table View' : 'Chart View'}
            </button>
            {queryResult && (
              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center px-3 py-2 border border-themed-border-primary text-sm font-medium rounded-sm text-themed-text-primary bg-themed-bg-surface hover:bg-themed-interactive-secondary-hover transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            )}
          </div>
        </div>
        {/* Query Area */}
        <div className="px-8 py-6 flex flex-col space-y-6">
          <div className="flex items-center space-x-6">
            <div>
              <label htmlFor="datasource-select" className="block text-sm font-medium text-themed-text-secondary">
                Data Source
              </label>
              <select
                id="datasource-select"
                value={activeDatasourceId || ''}
                onChange={e => setActiveDatasourceId(e.target.value)}
                className="mt-1 block w-48 px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary bg-themed-bg-surface text-themed-text-primary sm:text-sm"
              >
                {datasources.map(ds => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.dataSourceType})
                  </option>
                ))}
              </select>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-themed-text-secondary">
                Time Range
              </label>
              <button
                onClick={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
                className="mt-1 inline-flex items-center px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm bg-themed-bg-surface text-themed-text-primary hover:bg-themed-interactive-secondary-hover focus:outline-none focus:ring-themed-interactive-primary text-sm"
              >
                <Clock className="h-4 w-4 mr-2" />
                {formatTimeRange(timeRange)}
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
              {showTimeRangeDropdown && (
                <div className="absolute z-10 mt-1 w-64 bg-themed-bg-elevated shadow-lg border border-themed-border-primary rounded-sm py-1">
                  <div className="px-4 py-2 text-sm font-medium text-themed-text-secondary border-b border-themed-border-primary">
                    Quick Time Ranges
                  </div>
                  {[
                    { label: 'Last 15 minutes', hours: 0.25 },
                    { label: 'Last hour', hours: 1 },
                    { label: 'Last 4 hours', hours: 4 },
                    { label: 'Last 24 hours', hours: 24 },
                    { label: 'Last 7 days', hours: 168 }
                  ].map(range => (
                    <button
                      key={range.label}
                      onClick={() => setQuickTimeRange(range.hours)}
                      className="block w-full text-left px-4 py-2 text-sm text-themed-text-primary hover:bg-themed-interactive-secondary-hover transition-colors"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex rounded-sm border border-themed-border-primary">
              <button
                onClick={() => setQueryMode('builder')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  queryMode === 'builder'
                    ? 'bg-themed-interactive-primary text-themed-text-inverse'
                    : 'bg-themed-bg-surface text-themed-text-primary hover:bg-themed-interactive-secondary-hover'
                }`}
              >
                <Settings className="h-4 w-4 mr-1" />
                Builder
              </button>
              <button
                onClick={() => setQueryMode('code')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  queryMode === 'code'
                    ? 'bg-themed-interactive-primary text-themed-text-inverse'
                    : 'bg-themed-bg-surface text-themed-text-primary hover:bg-themed-interactive-secondary-hover'
                }`}
              >
                <Code className="h-4 w-4 mr-1" />
                Code
              </button>
            </div>
            <button
              onClick={executeQuery}
              disabled={isRunning || !query.trim()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-sm shadow-sm text-themed-text-inverse bg-themed-interactive-primary hover:bg-themed-interactive-primary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunning ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-themed-text-inverse border-r-transparent"></div>
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isRunning ? 'Running...' : 'Run Query'}
            </button>
          </div>
          {/* Query Builder/Editor */}
          {queryMode === 'builder' ? (
            <QueryBuilder
              datasources={datasources}
              selectedDatasourceId={activeDatasourceId || ''}
              query={query}
              queryMode={queryMode}
              availableMetrics={availableMetrics}
              loadingMetrics={loadingMetrics}
              timeRange={timeRange}
              onQueryChange={setQuery}
              onQueryModeChange={setQueryMode}
              onDatasourceChange={setActiveDatasourceId}
              onTimeRangeChange={setTimeRange}
              onQuickTimeRange={setQuickTimeRange}
              onExecute={executeQuery}
              isRunning={isRunning}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="query-editor" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Query
                </label>
                <textarea
                  id="query-editor"
                  rows={8}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={`Enter your ${activeDatasource?.dataSourceType} query...`}
                  className="block w-full px-3 py-2 border border-themed-border-primary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary bg-themed-bg-surface text-themed-text-primary font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>
        {/* Query Results */}
        <div className="px-8 pb-8 flex-1 flex flex-col">
          {queryResult ? (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-themed-text-primary">Query Results</h3>
                <div className="flex items-center space-x-4 text-sm text-themed-text-secondary">
                  {queryResult.metadata && (
                    <>
                      <span>
                        {queryResult.metadata.recordCount} records
                      </span>
                      <span>
                        Execution time: {queryResult.metadata.executionTime}ms
                      </span>
                    </>
                  )}
                  <span>
                    Last run: {new Date(queryResult.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              {queryResult.error ? (
                <div className="bg-themed-alert-error bg-opacity-10 border border-themed-alert-error rounded-lg p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-themed-status-error mr-2 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-themed-status-error">Query Error</h3>
                      <p className="mt-1 text-sm text-themed-text-secondary">{queryResult.error}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <DataVisualization
                  data={queryResult.results}
                  datasourceType={activeDatasource?.dataSourceType || 'unknown'}
                  viewMode={viewMode}
                />
              )}
            </div>
          ) : (
            <div className="mt-8 bg-themed-alert-info bg-opacity-10 border border-themed-alert-info rounded-lg p-4">
              <div className="flex">
                <Info className="h-5 w-5 text-themed-status-info mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-themed-status-info">Query Tips</h3>
                  <div className="mt-2 text-sm text-themed-text-secondary">
                    {activeDatasource?.dataSourceType === 'prometheus' && (
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Use metric names like <code className="bg-themed-bg-surface px-1 rounded">up</code> or <code className="bg-themed-bg-surface px-1 rounded">http_requests_total</code></li>
                        <li>Add filters with <code className="bg-themed-bg-surface px-1 rounded">&#123;label="value"&#125;</code></li>
                        <li>Use functions like <code className="bg-themed-bg-surface px-1 rounded">rate()</code>, <code className="bg-themed-bg-surface px-1 rounded">sum()</code>, <code className="bg-themed-bg-surface px-1 rounded">avg()</code></li>
                      </ul>
                    )}
                    {activeDatasource?.dataSourceType === 'sqlserver' && (
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Use standard SQL syntax: <code className="bg-themed-bg-surface px-1 rounded">SELECT * FROM table</code></li>
                        <li>Filter by time: <code className="bg-themed-bg-surface px-1 rounded">WHERE timestamp &gt;= DATEADD(hour, -1, GETDATE())</code></li>
                        <li>Limit results: <code className="bg-themed-bg-surface px-1 rounded">SELECT TOP 100 *</code></li>
                      </ul>
                    )}
                    {activeDatasource?.dataSourceType === 'ingested' && (
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Leave query empty to fetch all metrics in the time range</li>
                        <li>Use the Query Builder for guided metric selection</li>
                        <li>Adjust the time range to control the data scope</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Export Modal */}
        {showExportModal && queryResult && (
          <ExportModal
            data={queryResult.results}
            filename={`${activeDatasource?.name || 'export'}-${new Date().toISOString().split('T')[0]}`}
            onClose={() => setShowExportModal(false)}
          />
        )}
        {/* Debug Toggle */}
        <button
          onClick={() => setShowDebuggingInfo(!showDebuggingInfo)}
          className="fixed bottom-4 right-4 p-2 bg-themed-bg-tertiary border border-themed-border-primary rounded-full shadow-lg text-themed-text-secondary hover:text-themed-text-primary transition-colors"
          title="Toggle debugging information"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
        {showDebuggingInfo && (
          <div className="bg-themed-bg-tertiary rounded-lg border border-themed-border-primary p-6 fixed bottom-20 right-4 w-[32rem] max-h-[60vh] overflow-y-auto z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-themed-text-primary">Debugging Information</h3>
              <button
                onClick={() => setShowDebuggingInfo(false)}
                className="text-themed-text-muted hover:text-themed-text-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-themed-text-secondary">Available Data Sources</h4>
                <pre className="mt-2 text-xs bg-themed-bg-surface p-3 rounded border overflow-x-auto text-themed-text-primary">
                  {JSON.stringify(datasources, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium text-themed-text-secondary">Current Query State</h4>
                <pre className="mt-2 text-xs bg-themed-bg-surface p-3 rounded border overflow-x-auto text-themed-text-primary">
                  {JSON.stringify({ activeDatasourceId, query, queryMode, timeRange, queryResult }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Explore 