import { useState, useEffect } from 'react'
import { Download, RefreshCw, Database, LineChart, Table, AlertCircle, Info, ExternalLink, HelpCircle, Clock, Play, Plus, X, ChevronDown, Code, Settings } from 'lucide-react'
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

interface QueryTab {
  id: string
  name: string
  datasourceId: string
  query: string
  results: QueryResult | null
  isRunning: boolean
  queryMode: 'builder' | 'code'
  timeRange: {
    startTime: string
    endTime: string
    refreshInterval?: number
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
  const [datasources, setDatasources] = useState<DataSource[]>([])
  const [tabs, setTabs] = useState<QueryTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const [apiConnectionError, setApiConnectionError] = useState<string | null>(null)
  const [showDebuggingInfo, setShowDebuggingInfo] = useState(false)
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = useState(false)
  const [availableMetrics, setAvailableMetrics] = useState<AvailableMetric[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  // Load datasources on component mount
  useEffect(() => {
    loadDatasources()
  }, [])

  const loadDatasources = async () => {
    try {
      setApiConnectionError(null)
      const configuredDatasources = await DataSourceApi.getDataSources()
      
      // Add configured datasources
      const allDatasources: DataSource[] = configuredDatasources
        .filter(ds => ds.isEnabled)
        .map(ds => ({ ...ds, category: 'datasource' as const }))
      
      // Add virtual "Ingested Data" datasource
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
      
      // Create initial tab if datasources exist
      if (allDatasources.length > 0 && tabs.length === 0) {
        createNewTab(allDatasources[0].id)
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
        // For ingested data, fetch available metrics from the API
        const response = await fetch('/api/v1/metrics/available')
        if (response.ok) {
          const data = await response.json()
          setAvailableMetrics(data || [])
        } else {
          // Mock data for ingested metrics if API not available
          setAvailableMetrics([
            { name: 'cpu.usage', type: 'gauge', description: 'CPU usage percentage' },
            { name: 'memory.usage', type: 'gauge', description: 'Memory usage percentage' },
            { name: 'disk.free', type: 'gauge', description: 'Free disk space percentage' },
            { name: 'response.time', type: 'gauge', description: 'Response time in milliseconds' },
            { name: 'MSMQ', type: 'counter', description: 'MSMQ message count' }
          ])
        }
      } else if (datasource.dataSourceType === 'prometheus') {
        // For Prometheus, we could query the /api/v1/label/__name__/values endpoint
        // For now, provide common Prometheus metrics
        setAvailableMetrics([
          { name: 'up', type: 'gauge', description: 'Instance up status' },
          { name: 'http_requests_total', type: 'counter', description: 'Total HTTP requests' },
          { name: 'http_request_duration_seconds', type: 'histogram', description: 'HTTP request duration' },
          { name: 'process_cpu_seconds_total', type: 'counter', description: 'Process CPU time' },
          { name: 'process_resident_memory_bytes', type: 'gauge', description: 'Process memory usage' }
        ])
      } else if (datasource.dataSourceType === 'sqlserver') {
        // For SQL Server, we could query information_schema or provide common tables
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

  const getDefaultTimeRange = () => {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    return {
      startTime: oneHourAgo.toISOString(),
      endTime: now.toISOString()
    }
  }

  const createNewTab = (datasourceId?: string) => {
    const datasource = datasources.find(ds => ds.id === datasourceId) || datasources[0]
    if (!datasource) return

    const defaultTimeRange = getDefaultTimeRange()
    const newTab: QueryTab = {
      id: Date.now().toString(),
      name: `Query ${tabs.length + 1}`,
      datasourceId: datasource.id,
      query: getDefaultQuery(datasource.dataSourceType),
      results: null,
      isRunning: false,
      queryMode: 'code',
      timeRange: defaultTimeRange
    }

    setTabs([...tabs, newTab])
    setActiveTabId(newTab.id)
  }

  const getDefaultQuery = (datasourceType: string): string => {
    switch (datasourceType) {
      case 'prometheus':
        return 'up'
      case 'sqlserver':
        return 'SELECT TOP 100 * FROM Logs WHERE timestamp >= DATEADD(hour, -1, GETDATE())'
      case 'ingested':
        return '' // Will use time range and optional filters
      default:
        return ''
    }
  }

  const executeQuery = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return

    const datasource = datasources.find(ds => ds.id === tab.datasourceId)
    if (!datasource) return

    // Update tab to show running state
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, isRunning: true } : t
    ))

    try {
      const startTime = Date.now()
      let results: any[] = []
      let error: string | undefined

      try {
        if (datasource.category === 'ingested') {
          // Query ingested data via the metrics API
          const response = await fetch(`/api/v1/metrics/Query?startTime=${encodeURIComponent(tab.timeRange.startTime)}&endTime=${encodeURIComponent(tab.timeRange.endTime)}&limit=1000${tab.query ? '&query=' + encodeURIComponent(tab.query) : ''}`)
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          const data = await response.json()
          
          // Handle ingested data response format
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
        } else if (tab.query.toLowerCase().includes('select') || datasource.dataSourceType === 'sqlserver') {
          // Execute as log query for SQL-like queries
          const logResult = await DataSourceApi.queryLogs(tab.datasourceId, {
            query: tab.query,
            startTime: tab.timeRange.startTime,
            endTime: tab.timeRange.endTime,
            limit: 1000
          })
          results = logResult.logs || []
          if (logResult.errorMessage) {
            error = logResult.errorMessage
          }
        } else {
          // Execute as metric query for time-series data
          const metricResult = await DataSourceApi.queryMetrics(tab.datasourceId, {
            query: tab.query,
            startTime: tab.timeRange.startTime,
            endTime: tab.timeRange.endTime
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

      const executionTime = Date.now() - startTime

      const queryResult: QueryResult = {
        id: Date.now().toString(),
        datasourceId: tab.datasourceId,
        datasourceName: datasource.name,
        query: tab.query,
        timestamp: new Date(),
        results,
        error,
        metadata: {
          executionTime,
          recordCount: results.length
        },
        timeRange: tab.timeRange
      }

      // Update tab with results
      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, results: queryResult, isRunning: false } : t
      ))

    } catch (error) {
      console.error('Query execution failed:', error)
      const errorResult: QueryResult = {
        id: Date.now().toString(),
        datasourceId: tab.datasourceId,
        datasourceName: datasource.name,
        query: tab.query,
        timestamp: new Date(),
        results: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timeRange: tab.timeRange
      }

      setTabs(prev => prev.map(t => 
        t.id === tabId ? { ...t, results: errorResult, isRunning: false } : t
      ))
    }
  }

  const updateTabQuery = (tabId: string, query: string) => {
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, query } : t
    ))
  }

  const updateTabName = (tabId: string, name: string) => {
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, name } : t
    ))
  }

  const updateTabTimeRange = (tabId: string, timeRange: { startTime: string; endTime: string }) => {
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, timeRange: { ...t.timeRange, ...timeRange } } : t
    ))
  }

  const updateTabQueryMode = (tabId: string, queryMode: 'builder' | 'code') => {
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, queryMode } : t
    ))
  }

  const closeTab = (tabId: string) => {
    const updatedTabs = tabs.filter(t => t.id !== tabId)
    setTabs(updatedTabs)
    
    if (activeTabId === tabId) {
      setActiveTabId(updatedTabs.length > 0 ? updatedTabs[0].id : null)
    }
  }

  const changeTabDatasource = (tabId: string, datasourceId: string) => {
    const datasource = datasources.find(ds => ds.id === datasourceId)
    if (!datasource) return

    setTabs(prev => prev.map(t => 
      t.id === tabId ? { 
        ...t, 
        datasourceId, 
        query: getDefaultQuery(datasource.dataSourceType),
        results: null 
      } : t
    ))

    // Load available metrics for the new datasource
    loadAvailableMetrics(datasourceId)
  }

  const setQuickTimeRange = (tabId: string, hours: number) => {
    const now = new Date()
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000)
    
    updateTabTimeRange(tabId, {
      startTime: start.toISOString(),
      endTime: now.toISOString()
    })
    setShowTimeRangeDropdown(false)
  }

  const activeTab = tabs.find(t => t.id === activeTabId)

  // Load metrics when active tab's datasource changes
  useEffect(() => {
    if (activeTab && activeTab.datasourceId) {
      loadAvailableMetrics(activeTab.datasourceId)
    }
  }, [activeTab?.datasourceId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
        <span className="ml-4 text-slate-600 dark:text-slate-400">Loading explore interface...</span>
      </div>
    )
  }

  // Show API connection error with troubleshooting steps
  if (apiConnectionError) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 text-red-500 mt-1 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
                API Connection Error
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">
                {apiConnectionError}
              </p>
              
              <div className="bg-red-100 dark:bg-red-900/40 rounded-md p-4 mb-4">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Troubleshooting Steps:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                  <li>Ensure the MetricsApp backend server is running</li>
                  <li>Check if the API is accessible at <code className="bg-red-200 dark:bg-red-800 px-1 rounded">/api/v1</code></li>
                  <li>Verify your network connection</li>
                  <li>Check the browser console for more details</li>
                </ol>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={loadDatasources}
                  className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/40"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                </button>
                <button
                  onClick={() => setShowDebuggingInfo(!showDebuggingInfo)}
                  className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/40"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Debug Info
                </button>
              </div>

              {showDebuggingInfo && (
                <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/40 rounded-md">
                  <h5 className="font-medium text-red-800 dark:text-red-200 mb-2">Debug Information:</h5>
                  <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                    <div>API Base URL: <code>/api/v1</code></div>
                    <div>Current URL: <code>{window.location.origin}/api/v1</code></div>
                    <div>User Agent: <code>{navigator.userAgent}</code></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (datasources.length === 0) {
    return (
      <div className="text-center py-16">
        <Database className="h-16 w-16 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          No Data Sources Available
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">
          You need to configure data sources before you can explore data.
        </p>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 max-w-md mx-auto">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="mb-2">To get started with data exploration:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Configure at least one data source</li>
                <li>Test the connection to ensure it works</li>
                <li>Return here to explore your data</li>
              </ol>
            </div>
          </div>
        </div>
        
        <a
          href="/connections/datasources"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Database className="h-4 w-4 mr-2" />
          Configure Data Sources
          <ExternalLink className="h-4 w-4 ml-2" />
        </a>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
        <div className="flex flex-col space-y-4">
          {/* Top row: Title and description */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Explore</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Query and visualize data from your connected data sources and ingested metrics
              <span className="ml-2 text-sm text-emerald-600 dark:text-emerald-400">
                ({datasources.filter(ds => ds.category === 'datasource').length} configured + {datasources.filter(ds => ds.category === 'ingested').length} ingested)
              </span>
            </p>
          </div>
          
          {/* Bottom row: View mode and New Query buttons */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('chart')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'chart'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <LineChart className="h-4 w-4 mr-1" />
                Chart
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Table className="h-4 w-4 mr-1" />
                Table
              </button>
            </div>
            <button
              onClick={() => createNewTab()}
              className="inline-flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Query
            </button>
          </div>
        </div>
      </div>

      {/* Query Tabs */}
      {tabs.length > 0 && (
        <div className="mb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={`flex items-center px-4 py-2 rounded-t-md cursor-pointer whitespace-nowrap min-w-0 flex-shrink-0 ${
                  activeTabId === tab.id
                    ? 'bg-white dark:bg-slate-800 border-t border-l border-r border-slate-200 dark:border-slate-700'
                    : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <input
                  type="text"
                  value={tab.name}
                  onChange={(e) => updateTabName(tab.id, e.target.value)}
                  className="bg-transparent border-none outline-none text-sm font-medium text-slate-900 dark:text-white min-w-0 max-w-32"
                  onClick={(e) => e.stopPropagation()}
                />
                {tab.isRunning && (
                  <RefreshCw className="h-3 w-3 ml-2 animate-spin text-emerald-600 flex-shrink-0" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Interface */}
      {activeTab && (
        <div className="flex-1 flex flex-col min-h-0">
          <QueryBuilder
            datasources={datasources}
            selectedDatasourceId={activeTab.datasourceId}
            query={activeTab.query}
            queryMode={activeTab.queryMode}
            availableMetrics={availableMetrics}
            loadingMetrics={loadingMetrics}
            timeRange={activeTab.timeRange}
            onQueryChange={(query: string) => updateTabQuery(activeTab.id, query)}
            onQueryModeChange={(mode: 'builder' | 'code') => updateTabQueryMode(activeTab.id, mode)}
            onDatasourceChange={(datasourceId: string) => changeTabDatasource(activeTab.id, datasourceId)}
            onTimeRangeChange={(timeRange: { startTime: string; endTime: string }) => updateTabTimeRange(activeTab.id, timeRange)}
            onQuickTimeRange={(hours: number) => setQuickTimeRange(activeTab.id, hours)}
            onExecute={() => executeQuery(activeTab.id)}
            isRunning={activeTab.isRunning}
          />

          {/* Results */}
          {activeTab.results && (
            <div className="flex-1 mt-6 min-h-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">Results</h3>
                  {activeTab.results.metadata && (
                    <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                      <span>{activeTab.results.metadata.recordCount} records</span>
                      <span>{activeTab.results.metadata.executionTime}ms</span>
                      <span>{activeTab.results.timestamp.toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => executeQuery(activeTab.id)}
                    disabled={activeTab.isRunning}
                    className="inline-flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${activeTab.isRunning ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="inline-flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </button>
                </div>
              </div>

              {activeTab.results.error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Query Error
                      </h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                        <p>{activeTab.results.error}</p>
                      </div>
                      <div className="mt-3">
                        <button
                          onClick={() => setShowDebuggingInfo(!showDebuggingInfo)}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
                        >
                          {showDebuggingInfo ? 'Hide' : 'Show'} Debug Information
                        </button>
                        {showDebuggingInfo && (
                          <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded text-xs">
                            <div><strong>Query:</strong> {activeTab.query}</div>
                            <div><strong>Data Source:</strong> {activeTab.results.datasourceName}</div>
                            <div><strong>Timestamp:</strong> {activeTab.results.timestamp.toISOString()}</div>
                            <div><strong>Time Range:</strong> {activeTab.results.timeRange.startTime} to {activeTab.results.timeRange.endTime}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <DataVisualization
                  data={activeTab.results.results}
                  datasourceType={datasources.find(ds => ds.id === activeTab.datasourceId)?.dataSourceType || 'unknown'}
                  viewMode={viewMode}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && activeTab?.results && (
        <ExportModal
          data={activeTab.results.results}
          filename={`${activeTab.name}_${new Date().toISOString().split('T')[0]}`}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  )
}

export default Explore 