import { useState, useEffect } from 'react'
import { Download, RefreshCw, Database, LineChart, Table } from 'lucide-react'
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
}

interface QueryTab {
  id: string
  name: string
  datasourceId: string
  query: string
  results: QueryResult | null
  isRunning: boolean
}

const Explore = () => {
  const [datasources, setDatasources] = useState<DataSourceConfiguration[]>([])
  const [tabs, setTabs] = useState<QueryTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  // Load datasources on component mount
  useEffect(() => {
    loadDatasources()
  }, [])

  const loadDatasources = async () => {
    try {
      const data = await DataSourceApi.getDataSources()
      setDatasources(data.filter(ds => ds.isEnabled))
      
      // Create initial tab if datasources exist
      if (data.length > 0 && tabs.length === 0) {
        createNewTab(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load datasources:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewTab = (datasourceId?: string) => {
    const datasource = datasources.find(ds => ds.id === datasourceId) || datasources[0]
    if (!datasource) return

    const newTab: QueryTab = {
      id: Date.now().toString(),
      name: `Query ${tabs.length + 1}`,
      datasourceId: datasource.id,
      query: getDefaultQuery(datasource.dataSourceType),
      results: null,
      isRunning: false
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

      // Determine query type and execute appropriate query
      let results: any[] = []
      let error: string | undefined

      try {
        if (tab.query.toLowerCase().includes('select') || datasource.dataSourceType === 'sqlserver') {
          // Execute as log query for SQL-like queries
          const logResult = await DataSourceApi.queryLogs(tab.datasourceId, {
            query: tab.query,
            startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
            endTime: new Date().toISOString(),
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
            startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
            endTime: new Date().toISOString()
          })
          
          if (metricResult.resultType === 'error') {
            error = metricResult.errorMessage
            results = []
          } else {
            results = metricResult.result || []
          }
        }
      } catch (queryError) {
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
        }
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
        error: error instanceof Error ? error.message : 'Unknown error occurred'
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
  }

  const activeTab = tabs.find(t => t.id === activeTabId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
        <span className="ml-4 text-slate-600 dark:text-slate-400">Loading explore interface...</span>
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
        <a
          href="/connections/datasources"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
        >
          <Database className="h-4 w-4 mr-2" />
          Configure Data Sources
        </a>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Explore</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Query and visualize data from your connected data sources
            </p>
          </div>
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
              + New Query
            </button>
          </div>
        </div>
      </div>

      {/* Query Tabs */}
      {tabs.length > 0 && (
        <div className="flex space-x-1 mb-4 border-b border-slate-200 dark:border-slate-700">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center px-4 py-2 rounded-t-md cursor-pointer ${
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
                className="bg-transparent border-none outline-none text-sm font-medium text-slate-900 dark:text-white"
                onClick={(e) => e.stopPropagation()}
              />
              {tab.isRunning && (
                <RefreshCw className="h-3 w-3 ml-2 animate-spin text-emerald-600" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Query Interface */}
      {activeTab && (
        <div className="flex-1 flex flex-col min-h-0">
          <QueryBuilder
            datasources={datasources}
            selectedDatasourceId={activeTab.datasourceId}
            query={activeTab.query}
            onDatasourceChange={(datasourceId) => changeTabDatasource(activeTab.id, datasourceId)}
            onQueryChange={(query) => updateTabQuery(activeTab.id, query)}
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
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Query Error
                      </h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                        <p>{activeTab.results.error}</p>
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