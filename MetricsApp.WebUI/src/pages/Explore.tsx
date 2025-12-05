import { useState, useEffect } from 'react'
import { Download, RefreshCw, Database, LineChart, Table, AlertCircle, Clock, Play, ChevronDown, ChevronRight, ChevronLeft, Search, Layers, Bookmark, BookmarkCheck, Star, Trash2, Edit2, X } from 'lucide-react'
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

interface SavedQuery {
  id: string
  name: string
  query: string
  datasourceId: string
  datasourceName: string
  timeRangeLabel: string
  createdAt: string
  isFavorite: boolean
}

const TIME_RANGES = [
  { label: 'Last 5m', hours: 5 / 60 },
  { label: 'Last 15m', hours: 0.25 },
  { label: 'Last 30m', hours: 0.5 },
  { label: 'Last 1h', hours: 1 },
  { label: 'Last 3h', hours: 3 },
  { label: 'Last 6h', hours: 6 },
  { label: 'Last 12h', hours: 12 },
  { label: 'Last 24h', hours: 24 },
  { label: 'Last 7d', hours: 168 },
]

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
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = useState(false)
  const [availableMetrics, setAvailableMetrics] = useState<AvailableMetric[]>([])
  const [availableFields, setAvailableFields] = useState<AvailableField[]>([])
  const [availableTags, setAvailableTags] = useState<AvailableTag[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [loadingTags, setLoadingTags] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [metricSearch, setMetricSearch] = useState('')
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>(() => {
    try {
      const saved = localStorage.getItem('metricsapp_saved_queries')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [showSavedQueries, setShowSavedQueries] = useState(false)
  const [saveQueryName, setSaveQueryName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [editingQueryId, setEditingQueryId] = useState<string | null>(null)

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
      setAvailableMetrics(metadata.availableMetrics.map(m => ({ name: m, type: 'unknown' })))
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

  // Persist saved queries to localStorage
  useEffect(() => {
    localStorage.setItem('metricsapp_saved_queries', JSON.stringify(savedQueries))
  }, [savedQueries])

  const handleSaveQuery = () => {
    if (!saveQueryName.trim() || !query.trim() || !activeDatasource) return
    
    const newQuery: SavedQuery = {
      id: editingQueryId || crypto.randomUUID(),
      name: saveQueryName.trim(),
      query: query,
      datasourceId: activeDatasource.id,
      datasourceName: activeDatasource.name,
      timeRangeLabel: timeRangeLabel,
      createdAt: new Date().toISOString(),
      isFavorite: false
    }

    if (editingQueryId) {
      setSavedQueries(savedQueries.map(q => q.id === editingQueryId ? { ...newQuery, isFavorite: q.isFavorite } : q))
      setEditingQueryId(null)
    } else {
      setSavedQueries([newQuery, ...savedQueries])
    }
    
    setShowSaveDialog(false)
    setSaveQueryName('')
  }

  const handleLoadQuery = (savedQuery: SavedQuery) => {
    setQuery(savedQuery.query)
    if (savedQuery.datasourceId !== activeDatasourceId) {
      const ds = datasources.find(d => d.id === savedQuery.datasourceId)
      if (ds) {
        setActiveDatasourceId(savedQuery.datasourceId)
      }
    }
    setShowSavedQueries(false)
  }

  const handleDeleteQuery = (queryId: string) => {
    setSavedQueries(savedQueries.filter(q => q.id !== queryId))
  }

  const handleToggleFavorite = (queryId: string) => {
    setSavedQueries(savedQueries.map(q => 
      q.id === queryId ? { ...q, isFavorite: !q.isFavorite } : q
    ))
  }

  const handleEditQuery = (savedQuery: SavedQuery) => {
    setEditingQueryId(savedQuery.id)
    setSaveQueryName(savedQuery.name)
    setShowSaveDialog(true)
  }

  const sortedSavedQueries = [...savedQueries].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const filteredMetrics = availableMetrics.filter(m => 
    m.name.toLowerCase().includes(metricSearch.toLowerCase())
  )

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3">
            <div 
              className="animate-spin rounded-full h-8 w-8 border-2 border-b-transparent"
              style={{ borderColor: 'var(--interactive-primary)', borderBottomColor: 'transparent' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading data sources...</span>
          </div>
        </div>
      </div>
    )
  }

  if (apiConnectionError) {
    return (
      <div className="page-shell">
        <PageHeader title="Explore" description="Query and visualize your data" />
        <div 
          className="panel p-6"
          style={{ borderLeft: '3px solid var(--status-error)' }}
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--status-error)' }} />
            <div className="flex-1">
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Connection Error</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{apiConnectionError}</p>
              <button onClick={loadDatasources} className="btn-themed-secondary mt-3">
                <RefreshCw className="h-4 w-4" />
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
      <div className="page-shell">
        <PageHeader title="Explore" description="Query and visualize your data" />
        <div className="panel flex flex-col items-center justify-center py-12">
          <Database className="h-12 w-12 mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            No Data Sources
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Add a data source to start exploring your data.
          </p>
          <button onClick={() => navigate('/connections/add')} className="btn-themed-primary">
            Add Data Source
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell" style={{ gap: 0, padding: 0 }}>
      {/* Top toolbar */}
      <div 
        className="flex items-center gap-2 px-4 py-2 border-b"
        style={{ 
          backgroundColor: 'var(--bg-secondary)', 
          borderColor: 'var(--border-primary)' 
        }}
      >
        {/* Data source selector */}
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <select
            value={activeDatasourceId || ''}
            onChange={e => setActiveDatasourceId(e.target.value)}
            className="input-themed"
            style={{ minWidth: '180px' }}
          >
            {datasources.map(ds => (
              <option key={ds.id} value={ds.id}>
                {ds.name}
              </option>
            ))}
          </select>
        </div>

        <div className="page-toolbar__divider" />

        {/* Time range */}
        <div className="relative">
          <button
            onClick={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
            className="btn-themed-secondary"
          >
            <Clock className="h-4 w-4" />
            <span>{timeRangeLabel}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {showTimeRangeDropdown && (
            <div 
              className="absolute top-full left-0 mt-1 z-50 min-w-[160px]"
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              {TIME_RANGES.map(range => (
                <button
                  key={range.label}
                  onClick={() => setQuickTimeRange(range.hours)}
                  className="block w-full text-left px-3 py-2 text-sm transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {range.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="page-toolbar__divider" />

        {/* Query mode toggle */}
        <div 
          className="flex"
          style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: 'var(--radius-sm)',
            padding: '2px'
          }}
        >
          <button
            onClick={() => setQueryMode('builder')}
            className="px-3 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: queryMode === 'builder' ? 'var(--interactive-primary)' : 'transparent',
              color: queryMode === 'builder' ? 'var(--text-inverse)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            Builder
          </button>
          <button
            onClick={() => setQueryMode('code')}
            className="px-3 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: queryMode === 'code' ? 'var(--interactive-primary)' : 'transparent',
              color: queryMode === 'code' ? 'var(--text-inverse)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            Code
          </button>
        </div>

        {/* View mode toggle */}
        <div 
          className="flex"
          style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: 'var(--radius-sm)',
            padding: '2px'
          }}
        >
          <button
            onClick={() => setViewMode('chart')}
            className="px-2 py-1 transition-colors"
            style={{
              backgroundColor: viewMode === 'chart' ? 'var(--interactive-primary)' : 'transparent',
              color: viewMode === 'chart' ? 'var(--text-inverse)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <LineChart className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className="px-2 py-1 transition-colors"
            style={{
              backgroundColor: viewMode === 'table' ? 'var(--interactive-primary)' : 'transparent',
              color: viewMode === 'table' ? 'var(--text-inverse)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <Table className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Run button */}
        <button
          onClick={executeQuery}
          disabled={isRunning || !query.trim()}
          className="btn-themed-primary"
        >
          {isRunning ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span>{isRunning ? 'Running...' : 'Run'}</span>
        </button>

        {/* Save query button */}
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={!query.trim()}
          className="btn-themed-secondary disabled:opacity-50"
          title="Save query"
        >
          <Bookmark className="h-4 w-4" />
        </button>

        {/* Saved queries dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSavedQueries(!showSavedQueries)}
            className={`btn-themed-secondary ${savedQueries.length > 0 ? '' : 'opacity-50'}`}
          >
            <BookmarkCheck className="h-4 w-4" />
            <span>{savedQueries.length}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          {showSavedQueries && savedQueries.length > 0 && (
            <div 
              className="absolute top-full right-0 mt-1 z-50 min-w-[320px] max-h-[400px] overflow-y-auto"
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div 
                className="px-3 py-2 border-b text-xs font-medium uppercase tracking-wider"
                style={{ borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}
              >
                Saved Queries
              </div>
              {sortedSavedQueries.map(sq => (
                <div
                  key={sq.id}
                  className="px-3 py-2 border-b transition-colors cursor-pointer group"
                  style={{ borderColor: 'var(--border-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0" onClick={() => handleLoadQuery(sq)}>
                      <div className="flex items-center gap-2">
                        {sq.isFavorite && <Star className="h-3 w-3 fill-current" style={{ color: 'var(--status-warning)' }} />}
                        <span className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {sq.name}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5 truncate font-mono" style={{ color: 'var(--text-muted)' }}>
                        {sq.query.length > 50 ? sq.query.slice(0, 50) + '...' : sq.query}
                      </div>
                      <div className="flex items-center gap-2 text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                        <span>{sq.datasourceName}</span>
                        <span>•</span>
                        <span>{sq.timeRangeLabel}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(sq.id) }}
                        className="p-1 rounded hover:bg-black/10"
                        title={sq.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star 
                          className={`h-3 w-3 ${sq.isFavorite ? 'fill-current' : ''}`} 
                          style={{ color: sq.isFavorite ? 'var(--status-warning)' : 'var(--text-muted)' }} 
                        />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditQuery(sq) }}
                        className="p-1 rounded hover:bg-black/10"
                        title="Edit name"
                      >
                        <Edit2 className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteQuery(sq.id) }}
                        className="p-1 rounded hover:bg-black/10"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" style={{ color: 'var(--status-error)' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="page-toolbar__divider" />

        {queryResult && (
          <button onClick={() => setShowExportModal(true)} className="btn-themed-secondary">
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="flex flex-col border-r overflow-hidden transition-all"
          style={{ 
            width: sidebarCollapsed ? '48px' : '240px',
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-primary)'
          }}
        >
          <div 
            className="flex items-center justify-between px-3 py-2 border-b"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            {!sidebarCollapsed && (
              <span 
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Metrics
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {!sidebarCollapsed && (
            <>
              <div className="p-2">
                <div className="relative">
                  <Search 
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3" 
                    style={{ color: 'var(--text-muted)' }} 
                  />
                  <input
                    type="text"
                    placeholder="Filter metrics..."
                    value={metricSearch}
                    onChange={e => setMetricSearch(e.target.value)}
                    className="input-themed w-full text-xs pl-7"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {loadingMetrics ? (
                  <div className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    Loading metrics...
                  </div>
                ) : filteredMetrics.length > 0 ? (
                  <div className="space-y-0.5">
                    {filteredMetrics.map(metric => (
                      <button
                        key={metric.name}
                        onClick={() => setQuery(metric.name)}
                        className="w-full text-left px-2 py-1.5 text-xs rounded transition-colors truncate"
                        style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        title={metric.name}
                      >
                        {metric.name}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No metrics found
                  </div>
                )}
              </div>
            </>
          )}
        </aside>

        {/* Query and results area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Query editor */}
          <div 
            className="border-b"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            {queryMode === 'builder' ? (
              <div className="p-4">
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
              </div>
            ) : (
              <div className="p-2">
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      executeQuery()
                    }
                  }}
                  placeholder={`Enter your ${activeDatasource?.dataSourceType || ''} query... (Ctrl+Enter to run)`}
                  className="input-themed w-full font-mono text-sm"
                  style={{ 
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto p-4">
            {queryResult ? (
              queryResult.error ? (
                <div 
                  className="p-4"
                  style={{ 
                    backgroundColor: 'var(--alert-error-bg)',
                    borderLeft: '3px solid var(--status-error)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--status-error)' }} />
                    <div>
                      <h3 className="text-sm font-medium" style={{ color: 'var(--status-error)' }}>Query Error</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{queryResult.error}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  {queryResult.metadata && (
                    <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>{queryResult.metadata.recordCount} records</span>
                      <span>•</span>
                      <span>{queryResult.metadata.executionTime}ms</span>
                      <span>•</span>
                      <span>{new Date(queryResult.timestamp).toLocaleTimeString()}</span>
                    </div>
                  )}
                  <DataVisualization
                    data={queryResult.results}
                    datasourceType={activeDatasource?.dataSourceType || 'unknown'}
                    viewMode={viewMode}
                  />
                </div>
              )
            ) : (
              <div 
                className="h-full flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
              >
                <div className="text-center max-w-md">
                  <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Write a query and click Run to see results
                  </p>
                  {activeDatasource?.dataSourceType === 'prometheus' && (
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                      Try: <code className="font-mono px-1 py-0.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>up</code> or <code className="font-mono px-1 py-0.5" style={{ backgroundColor: 'var(--bg-tertiary)' }}>rate(http_requests_total[5m])</code>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showExportModal && queryResult && (
        <ExportModal
          data={queryResult.results}
          filename={`${activeDatasource?.name || 'export'}-${new Date().toISOString().split('T')[0]}`}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Save Query Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => {
              setShowSaveDialog(false)
              setEditingQueryId(null)
              setSaveQueryName('')
            }}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="relative w-full max-w-md rounded-lg shadow-xl overflow-hidden"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              <div 
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-center gap-2">
                  <Bookmark className="h-5 w-5" style={{ color: 'var(--interactive-primary)' }} />
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {editingQueryId ? 'Edit Saved Query' : 'Save Query'}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setShowSaveDialog(false)
                    setEditingQueryId(null)
                    setSaveQueryName('')
                  }}
                  className="p-1 rounded-md hover:bg-black/10 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Query Name
                  </label>
                  <input
                    type="text"
                    value={saveQueryName}
                    onChange={(e) => setSaveQueryName(e.target.value)}
                    placeholder="e.g., CPU Usage Last Hour"
                    className="input-themed w-full"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveQuery()
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Query Preview
                  </label>
                  <div 
                    className="p-3 rounded-md font-mono text-sm"
                    style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}
                  >
                    {query.length > 100 ? query.slice(0, 100) + '...' : query}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <span>Data Source: <strong style={{ color: 'var(--text-secondary)' }}>{activeDatasource?.name}</strong></span>
                  <span>•</span>
                  <span>Time Range: <strong style={{ color: 'var(--text-secondary)' }}>{timeRangeLabel}</strong></span>
                </div>
              </div>

              <div 
                className="flex items-center justify-end gap-2 px-6 py-4 border-t"
                style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
              >
                <button 
                  onClick={() => {
                    setShowSaveDialog(false)
                    setEditingQueryId(null)
                    setSaveQueryName('')
                  }} 
                  className="btn-themed-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveQuery}
                  disabled={!saveQueryName.trim()}
                  className="btn-themed-primary disabled:opacity-50"
                >
                  {editingQueryId ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside handler for dropdowns */}
      {(showSavedQueries || showTimeRangeDropdown) && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowSavedQueries(false)
            setShowTimeRangeDropdown(false)
          }}
        />
      )}
    </div>
  )
}

export default Explore
