import { useState, useEffect } from 'react'
import { Download, RefreshCw, Database, LineChart, Table, AlertCircle, Info, HelpCircle, Clock, Play, Plus, X, ChevronDown, Code, Settings, ChevronRight, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DataSourceApi, DataSourceConfiguration } from '../lib/datasource-api'
import QueryBuilder from '../components/QueryBuilder'
import DataVisualization from '../components/DataVisualization'
import ExportModal from '../components/ExportModal'
import PageHeader from '../components/PageHeader'

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
  isSearchable?: boolean
  isAggregatable?: boolean
}

interface AvailableField {
  name: string
  type: string
  description?: string
  isSearchable: boolean
  isAggregatable: boolean
}

interface AvailableTag {
  name: string
  values: string[]
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
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([])
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [loadingTags, setLoadingTags] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Load datasources on component mount
  useEffect(() => {
    loadDatasources()
  }, [])

  useEffect(() => {
    if (activeDatasourceId) {
      loadDataSourceMetadata(activeDatasourceId)
      const ds = datasources.find(ds => ds.id === activeDatasourceId)
      setQuery(getDefaultQuery(ds?.dataSourceType || ''))
    }
  }, [activeDatasourceId, datasources])

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
        url: '/api/v1/telemetry/metrics',
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

  const loadDataSourceMetadata = async (datasourceId: string) => {
    setLoadingMetrics(true)
    setLoadingFields(true)
    setLoadingTags(true)
    try {
      const metadata = await DataSourceApi.getDataSourceMetadata(datasourceId)
      setAvailableMetrics(metadata.availableMetrics.map(m => ({ name: m, type: 'unknown' }))) // Assuming type is unknown from simple string list
      setAvailableFields(metadata.availableFields || [])
      setAvailableTags(metadata.availableTags || [])
    } catch (error) {
      console.error('Failed to load data source metadata:', error)
      setAvailableMetrics([])
      setAvailableFields([])
      setAvailableTags([])
    } finally {
      setLoadingMetrics(false)
      setLoadingFields(false)
      setLoadingTags(false)
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
          const response = await fetch(`/api/v1/telemetry/metrics?startTime=${encodeURIComponent(timeRange.startTime)}&endTime=${encodeURIComponent(timeRange.endTime)}&limit=1000${query ? '&query=' + encodeURIComponent(query) : ''}`)
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
const timeRangeLabel = formatTimeRange(timeRange)
const activeDatasourceLabel = activeDatasource ? `${activeDatasource.name} (${activeDatasource.dataSourceType})` : 'Select a data source'
const queryModeLabel = queryMode === 'builder' ? 'Builder' : 'Code'
const viewModeLabel = viewMode === 'chart' ? 'Chart' : 'Table'

const renderMainContent = () => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[320px]">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-b-transparent border-themed-interactive-primary" />
          <span className="text-sm text-themed-text-secondary">Loading data sources...</span>
        </div>
      </div>
    )
  }

  if (apiConnectionError) {
    return (
      <div className="panel border-themed-alert-error">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-themed-status-error" />
            <h3 className="panel-title text-themed-status-error">Connection Error</h3>
          </div>
        </div>
        <p className="text-sm text-themed-text-secondary">{apiConnectionError}</p>
        <div className="page-actions mt-4">
          <button
            type="button"
            onClick={loadDatasources}
            className="btn-themed-secondary border-themed-alert-error text-themed-status-error"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (datasources.length === 0) {
    return (
      <div className="panel text-center space-y-4">
        <Database className="mx-auto h-12 w-12 text-themed-text-muted" />
        <h3 className="panel-title text-2xl">No Data Sources</h3>
        <p className="text-sm text-themed-text-secondary">
          No data sources are configured. Add a data source to start exploring your data.
        </p>
        <button
          type="button"
          onClick={() => navigate('/connections/add')}
          className="btn-themed-primary inline-flex items-center justify-center mx-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Data Source
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 flex-1 overflow-hidden">
      <aside
        className={`surface-muted flex flex-col h-full overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'w-20' : 'w-80'}`}
        style={{ padding: sidebarCollapsed ? 'var(--spacing-sm)' : 'var(--spacing-md)' }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-themed-border-primary">
          <span
            className={`text-xs font-semibold uppercase tracking-widest text-themed-text-secondary transition-opacity ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-80'}`}
          >
            Data Sources
          </span>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-themed-text-secondary hover:text-themed-text-primary transition-colors"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
        <div className="mt-3 flex-1 overflow-y-auto pr-1 space-y-3">
          {datasources.map(ds => (
            <div
              key={ds.id}
              className={`rounded-md border border-transparent transition-colors ${
                activeDatasourceId === ds.id ? 'border-themed-border-accent bg-themed-bg-elevated' : 'hover:bg-themed-interactive-secondary-hover/40'
              }`}
            >
              <button
                type="button"
                className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm text-themed-text-primary"
                onClick={() => setActiveDatasourceId(ds.id)}
              >
                <Database className="h-4 w-4 text-themed-text-secondary" />
                <span className={`${sidebarCollapsed ? 'hidden' : 'inline-flex flex-col'} whitespace-nowrap`}>
                  <span className="font-medium">{ds.name}</span>
                  <span className="text-xs text-themed-text-muted">{ds.dataSourceType}</span>
                </span>
              </button>
              {activeDatasourceId === ds.id && !sidebarCollapsed && (
                <div className="px-3 pb-3 space-y-4 text-xs text-themed-text-secondary">
                  <div>
                    <h4 className="font-semibold uppercase tracking-wide text-[0.65rem] text-themed-text-muted mb-2">Metrics</h4>
                    {loadingMetrics ? (
                      <div className="py-1">Loading metrics...</div>
                    ) : availableMetrics.length > 0 ? (
                      <ul className="space-y-1">
                        {availableMetrics.map(metric => (
                          <li key={metric.name}>
                            <button
                              type="button"
                              className="w-full text-left text-sm text-themed-text-primary hover:text-themed-interactive-primary transition-colors"
                              title={metric.description || metric.name}
                              onClick={() => setQuery(metric.name)}
                            >
                              {metric.name}
                              <span className="text-xs text-themed-text-muted ml-1">({metric.type})</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-1">No metrics available.</div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold uppercase tracking-wide text-[0.65rem] text-themed-text-muted mb-2">Fields</h4>
                    {loadingFields ? (
                      <div className="py-1">Loading fields...</div>
                    ) : availableFields.length > 0 ? (
                      <ul className="space-y-1">
                        {availableFields.map(field => (
                          <li key={field.name}>
                            <button
                              type="button"
                              className="w-full text-left text-sm text-themed-text-primary hover:text-themed-interactive-primary transition-colors"
                              title={field.description || field.name}
                              onClick={() => setQuery(prev => `${prev} ${field.name}`)}
                            >
                              {field.name}
                              <span className="text-xs text-themed-text-muted ml-1">({field.type})</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-1">No fields available.</div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold uppercase tracking-wide text-[0.65rem] text-themed-text-muted mb-2">Tags</h4>
                    {loadingTags ? (
                      <div className="py-1">Loading tags...</div>
                    ) : availableTags.length > 0 ? (
                      <ul className="space-y-1">
                        {availableTags.map(tag => (
                          <li key={tag.name}>
                            <button
                              type="button"
                              className="w-full text-left text-sm text-themed-text-primary hover:text-themed-interactive-primary transition-colors"
                              title={tag.description || tag.name}
                              onClick={() => setQuery(prev => `${prev} ${tag.name}`)}
                            >
                              {tag.name}
                              <span className="text-xs text-themed-text-muted ml-1">
                                ({tag.values.length} values)
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="py-1">No tags available.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="panel flex flex-col gap-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label htmlFor="datasource-select" className="block text-xs font-semibold uppercase tracking-wide text-themed-text-muted">
                Data Source
              </label>
              <select
                id="datasource-select"
                value={activeDatasourceId || ''}
                onChange={e => setActiveDatasourceId(e.target.value)}
                className="input-themed w-56"
              >
                {datasources.map(ds => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.dataSourceType})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative space-y-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-themed-text-muted">
                Time Range
              </label>
              <button
                type="button"
                onClick={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
                className="btn-themed-secondary"
              >
                <Clock className="h-4 w-4 mr-2" />
                {timeRangeLabel}
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
              {showTimeRangeDropdown && (
                <div className="surface-muted absolute z-20 mt-2 w-64 shadow-lg border border-themed-border-primary rounded-lg p-0 overflow-hidden">
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
                      type="button"
                      onClick={() => setQuickTimeRange(range.hours)}
                      className="block w-full text-left px-4 py-2 text-sm text-themed-text-primary hover:bg-themed-interactive-secondary-hover transition-colors"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="inline-flex items-center rounded-md border border-themed-border-primary overflow-hidden">
              <button
                type="button"
                onClick={() => setQueryMode('builder')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  queryMode === 'builder'
                    ? 'bg-themed-interactive-primary text-themed-text-inverse'
                    : 'bg-transparent text-themed-text-primary hover:bg-themed-interactive-secondary-hover'
                }`}
              >
                <Settings className="h-4 w-4 mr-1" />
                Builder
              </button>
              <button
                type="button"
                onClick={() => setQueryMode('code')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  queryMode === 'code'
                    ? 'bg-themed-interactive-primary text-themed-text-inverse'
                    : 'bg-transparent text-themed-text-primary hover:bg-themed-interactive-secondary-hover'
                }`}
              >
                <Code className="h-4 w-4 mr-1" />
                Code
              </button>
            </div>

            <button
              type="button"
              onClick={executeQuery}
              disabled={isRunning || !query.trim()}
              className="btn-themed-primary inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-themed-text-inverse border-r-transparent" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isRunning ? 'Running...' : 'Run Query'}
            </button>
          </div>

          {queryMode === 'builder' ? (
            <QueryBuilder
              datasources={datasources}
              selectedDatasourceId={activeDatasourceId || ''}
              query={query}
              queryMode={queryMode}
              availableMetrics={availableMetrics}
              loadingMetrics={loadingMetrics}
              availableFields={availableFields}
              loadingFields={loadingFields}
              availableTags={availableTags}
              loadingTags={loadingTags}
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
            <div className="space-y-3 w-full">
              <label htmlFor="query-editor" className="block text-sm font-medium text-themed-text-secondary">
                Query
              </label>
              <textarea
                id="query-editor"
                rows={8}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Enter your ${activeDatasource?.dataSourceType} query...`}
                className="input-themed font-mono text-sm w-full min-h-[200px]"
              />
            </div>
          )}
        </div>

        <div className="panel flex-1 flex flex-col overflow-hidden">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Query Results</h3>
              {queryResult?.metadata ? (
                <div className="panel-subtitle flex flex-wrap gap-4 text-xs">
                  <span>{queryResult.metadata.recordCount} records</span>
                  <span>Execution time: {queryResult.metadata.executionTime}ms</span>
                  <span>Last run: {new Date(queryResult.timestamp).toLocaleTimeString()}</span>
                </div>
              ) : (
                <p className="panel-subtitle">Run a query to see data visualizations and tables.</p>
              )}
            </div>
            <div className="page-actions">
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
                className="btn-themed-secondary"
              >
                {viewMode === 'chart' ? <Table className="h-4 w-4 mr-2" /> : <LineChart className="h-4 w-4 mr-2" />}
                {viewMode === 'chart' ? 'Table View' : 'Chart View'}
              </button>
              {queryResult && (
                <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  className="btn-themed-secondary"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {queryResult ? (
              queryResult.error ? (
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
              )
            ) : (
              <div className="surface-muted">
                <div className="flex">
                  <Info className="h-5 w-5 text-themed-status-info mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-themed-status-info">Query Tips</h3>
                    <div className="mt-2 text-sm text-themed-text-secondary space-y-2">
                      {activeDatasource?.dataSourceType === 'prometheus' && (
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Use metric names like <code className="bg-themed-bg-surface px-1 rounded">up</code> or <code className="bg-themed-bg-surface px-1 rounded">http_requests_total</code></li>
                          <li>Add filters with <code className="bg-themed-bg-surface px-1 rounded">&#123;label=&quot;value&quot;&#125;</code></li>
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
        </div>
      </div>
    </div>
  )
}

return (
  <div className="page-shell">
    <PageHeader
      title="Explore"
      description="Query, transform, and visualize telemetry across your connected data sources."
      meta={(
        <span className="badge-muted">
          <Database className="h-3 w-3" />
          {activeDatasourceLabel}
        </span>
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge-muted">
          <Settings className="h-3 w-3" />
          Mode: {queryModeLabel}
        </span>
        <span className="badge-muted">
          {viewMode === 'chart' ? <LineChart className="h-3 w-3" /> : <Table className="h-3 w-3" />}
          View: {viewModeLabel}
        </span>
        <span className="badge-muted">
          <Clock className="h-3 w-3" />
          Range: {timeRangeLabel}
        </span>
      </div>
    </PageHeader>

    <div className="page-toolbar">
      <div className="page-toolbar__group text-sm text-themed-text-secondary">
        <Database className="h-4 w-4 text-themed-text-muted" />
        <span>{activeDatasource ? activeDatasource.url : 'No endpoint configured'}</span>
      </div>
      <div className="page-toolbar__divider" />
      <div className="page-toolbar__group text-sm text-themed-text-secondary">
        <Code className="h-4 w-4 text-themed-text-muted" />
        <span>Editor: {queryModeLabel}</span>
      </div>
      <div className="page-toolbar__divider" />
      <div className="page-toolbar__group text-sm text-themed-text-secondary">
        <LineChart className="h-4 w-4 text-themed-text-muted" />
        <span>View: {viewModeLabel}</span>
      </div>
      <div className="page-toolbar__divider" />
      <div className="page-toolbar__group text-sm text-themed-text-secondary">
        <Clock className="h-4 w-4 text-themed-text-muted" />
        <span>Window: {timeRangeLabel}</span>
      </div>
    </div>

    {renderMainContent()}

    {showExportModal && queryResult && (
      <ExportModal
        data={queryResult.results}
        filename={`${activeDatasource?.name || 'export'}-${new Date().toISOString().split('T')[0]}`}
        onClose={() => setShowExportModal(false)}
      />
    )}

    <button
      type="button"
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
            type="button"
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
)
}

export default Explore


