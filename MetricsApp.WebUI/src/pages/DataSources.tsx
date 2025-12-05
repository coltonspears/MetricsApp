import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Filter, ArrowUpDown, Database, Plus, Settings, TestTube, BarChart3, Eye, AlertCircle, Loader2, CheckCircle, XCircle, Grid3X3, List, RefreshCw, Activity, Clock } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  DataSourceConfiguration, 
  DataSourceTestResult,
  DataSourceApi, 
  ApiError 
} from '../lib/datasource-api'
import DataSourceIcon from '../components/DataSourceIcon'
import PageHeader from '../components/PageHeader'

const getDataSourceCategory = (dataSourceType: string): string => {
  const categoryMap: Record<string, string> = {
    'prometheus': 'Monitoring',
    'elasticsearch': 'Database',
    'influxdb': 'Database',
    'mysql': 'Database',
    'postgresql': 'Database',
    'redis': 'Cache',
    'rabbitmq': 'Queue',
    'kafka': 'Queue'
  }
  return categoryMap[dataSourceType.toLowerCase()] || 'Other'
}

const categories = ['All', 'Monitoring', 'Database', 'Cache', 'Queue', 'Other']
const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
  { value: 'category', label: 'Category' },
  { value: 'status', label: 'Status' },
  { value: 'created', label: 'Created' }
]

type ViewMode = 'card' | 'row'

export default function DataSources() {
  const navigate = useNavigate()
  const location = useLocation()
  const [dataSources, setDataSources] = useState<DataSourceConfiguration[]>([])
  const [filteredDataSources, setFilteredDataSources] = useState<DataSourceConfiguration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [testingDataSources, setTestingDataSources] = useState<Set<string>>(new Set())
  const [testResults, setTestResults] = useState<Record<string, DataSourceTestResult>>({})
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('dataSourcesViewMode')
    return (saved as ViewMode) || 'card'
  })
  
  // Health monitoring state
  const [healthMonitoringEnabled, setHealthMonitoringEnabled] = useState(() => {
    const saved = localStorage.getItem('dataSourcesHealthMonitoring')
    return saved ? JSON.parse(saved) : true
  })
  const [healthRefreshInterval, setHealthRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('dataSourcesHealthInterval')
    return saved ? Number(saved) : 60000 // Default 60 seconds
  })
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null)
  const [healthCheckInProgress, setHealthCheckInProgress] = useState(false)
  const healthCheckTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadDataSources()
  }, [])

  useEffect(() => {
    if (location.state?.message && location.state?.type === 'success') {
      setSuccessMessage(location.state.message)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  useEffect(() => {
    filterAndSortDataSources()
  }, [dataSources, searchTerm, selectedCategory, sortBy, sortOrder])

  useEffect(() => {
    localStorage.setItem('dataSourcesViewMode', viewMode)
  }, [viewMode])

  const loadDataSources = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const dataSourcesData = await DataSourceApi.getDataSources()
      setDataSources(dataSourcesData)
    } catch (error) {
      console.error('Failed to load data sources:', error)
      setError(error instanceof ApiError ? error.message : 'Failed to load data sources')
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortDataSources = () => {
    let filtered = dataSources.filter(dataSource => {
      const matchesSearch = dataSource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           dataSource.dataSourceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           dataSource.url.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === 'All' || 
                             getDataSourceCategory(dataSource.dataSourceType) === selectedCategory
      
      return matchesSearch && matchesCategory
    })

    filtered.sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case 'type':
          aValue = a.dataSourceType
          bValue = b.dataSourceType
          break
        case 'category':
          aValue = getDataSourceCategory(a.dataSourceType)
          bValue = getDataSourceCategory(b.dataSourceType)
          break
        case 'status':
          aValue = a.isEnabled ? 'enabled' : 'disabled'
          bValue = b.isEnabled ? 'enabled' : 'disabled'
          break
        case 'created':
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
        default:
          aValue = a.name
          bValue = b.name
          break
      }

      let comparison: number
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredDataSources(filtered)
  }

  const handleSort = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
  }

  const handleEdit = (dataSource: DataSourceConfiguration) => {
    navigate(`/datasources/${dataSource.id}`)
  }

  const handleTest = async (dataSource: DataSourceConfiguration) => {
    setTestingDataSources(prev => new Set(prev).add(dataSource.id))
    
    try {
      const result = await DataSourceApi.testDataSource(dataSource)
      setTestResults(prev => ({ ...prev, [dataSource.id]: result }))
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [dataSource.id]: {
          isSuccess: false,
          responseTimeMs: 0,
          errorMessage: error instanceof Error ? error.message : 'Test failed',
          details: 'Unable to test connection'
        }
      }))
    } finally {
      setTestingDataSources(prev => {
        const newSet = new Set(prev)
        newSet.delete(dataSource.id)
        return newSet
      })
    }
  }

  // Health check all enabled data sources
  const runHealthCheck = useCallback(async () => {
    if (healthCheckInProgress) return
    
    setHealthCheckInProgress(true)
    const enabledSources = dataSources.filter(ds => ds.isEnabled)
    
    for (const ds of enabledSources) {
      try {
        const result = await DataSourceApi.testDataSource(ds)
        setTestResults(prev => ({ ...prev, [ds.id]: result }))
      } catch (error) {
        setTestResults(prev => ({ 
          ...prev, 
          [ds.id]: {
            isSuccess: false,
            responseTimeMs: 0,
            errorMessage: error instanceof Error ? error.message : 'Health check failed',
            details: 'Unable to verify connection'
          }
        }))
      }
    }
    
    setLastHealthCheck(new Date())
    setHealthCheckInProgress(false)
  }, [dataSources, healthCheckInProgress])

  // Setup auto health check timer
  useEffect(() => {
    if (healthMonitoringEnabled && dataSources.length > 0) {
      // Run initial health check
      runHealthCheck()
      
      // Setup interval
      healthCheckTimerRef.current = setInterval(() => {
        runHealthCheck()
      }, healthRefreshInterval)
    }
    
    return () => {
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current)
      }
    }
  }, [healthMonitoringEnabled, healthRefreshInterval, dataSources.length])

  // Persist health monitoring settings
  useEffect(() => {
    localStorage.setItem('dataSourcesHealthMonitoring', JSON.stringify(healthMonitoringEnabled))
  }, [healthMonitoringEnabled])

  useEffect(() => {
    localStorage.setItem('dataSourcesHealthInterval', String(healthRefreshInterval))
  }, [healthRefreshInterval])

  const getHealthStatus = (dataSourceId: string): 'healthy' | 'unhealthy' | 'unknown' | 'checking' => {
    if (testingDataSources.has(dataSourceId)) return 'checking'
    const result = testResults[dataSourceId]
    if (!result) return 'unknown'
    return result.isSuccess ? 'healthy' : 'unhealthy'
  }

  const getHealthColor = (status: 'healthy' | 'unhealthy' | 'unknown' | 'checking'): string => {
    switch (status) {
      case 'healthy': return 'var(--status-success)'
      case 'unhealthy': return 'var(--status-error)'
      case 'checking': return 'var(--status-warning)'
      default: return 'var(--text-muted)'
    }
  }

  const healthyCount = dataSources.filter(ds => testResults[ds.id]?.isSuccess).length
  const unhealthyCount = dataSources.filter(ds => testResults[ds.id] && !testResults[ds.id].isSuccess).length

  const handleBuildDashboard = (dataSource: DataSourceConfiguration) => {
    navigate(`/dashboards/new?datasource=${dataSource.id}`)
  }

  const handleExplore = (dataSource: DataSourceConfiguration) => {
    navigate(`/explore?datasource=${dataSource.id}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const enabledCount = dataSources.filter(d => d.isEnabled).length

  if (isLoading) {
    return (
      <div className="page-shell">
        <div className="flex-1 flex items-center justify-center min-h-[320px]">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-b-transparent border-themed-interactive-primary" />
            <span className="text-themed-text-secondary text-sm">Loading data sources...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Data Sources"
        description="Manage your data connections and integrations"
        meta={
          <span className="badge-muted">
            <Database className="h-3 w-3" />
            {dataSources.length} connections
          </span>
        }
        actions={
          <div className="page-actions">
            <div className="flex items-center rounded-md border border-themed-border-primary overflow-hidden">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 transition-colors ${
                  viewMode === 'card'
                    ? 'bg-themed-interactive-primary text-themed-text-inverse'
                    : 'text-themed-text-secondary hover:text-themed-text-primary'
                }`}
                style={viewMode === 'card' ? { backgroundColor: 'var(--interactive-primary)', color: 'var(--text-inverse)' } : {}}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('row')}
                className={`p-2 transition-colors ${
                  viewMode === 'row'
                    ? 'bg-themed-interactive-primary text-themed-text-inverse'
                    : 'text-themed-text-secondary hover:text-themed-text-primary'
                }`}
                style={viewMode === 'row' ? { backgroundColor: 'var(--interactive-primary)', color: 'var(--text-inverse)' } : {}}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            <button onClick={loadDataSources} disabled={isLoading} className="btn-themed-secondary disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/connections/add')}
              className="btn-themed-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Data Source
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-muted">
            <CheckCircle className="h-3 w-3" />
            {enabledCount} enabled
          </span>
          <span className="badge-muted">
            <XCircle className="h-3 w-3" />
            {dataSources.length - enabledCount} disabled
          </span>
          {healthyCount > 0 && (
            <span className="badge-muted" style={{ color: 'var(--status-success)' }}>
              <Activity className="h-3 w-3" />
              {healthyCount} healthy
            </span>
          )}
          {unhealthyCount > 0 && (
            <span className="badge-muted" style={{ color: 'var(--status-error)' }}>
              <AlertCircle className="h-3 w-3" />
              {unhealthyCount} unhealthy
            </span>
          )}
        </div>
      </PageHeader>

      {/* Success Message */}
      {successMessage && (
        <div className="panel border-themed-status-success bg-green-500/5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-themed-status-success" />
            <span className="font-medium text-themed-status-success">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="panel border-themed-status-error bg-red-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-themed-status-error flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-themed-status-error">Error</h3>
              <p className="text-sm text-themed-text-secondary mt-1">{error}</p>
              <button onClick={loadDataSources} className="btn-themed-secondary mt-3">
                <Loader2 className="h-4 w-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar__group flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
            <input
              type="text"
              placeholder="Search data sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-themed w-full pl-10"
            />
          </div>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group">
          <Filter className="h-4 w-4 text-themed-text-muted" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-themed"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group">
          <ArrowUpDown className="h-4 w-4 text-themed-text-muted" />
          <select
            value={sortBy}
            onChange={(e) => handleSort(e.target.value)}
            className="input-themed"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group text-sm text-themed-text-secondary">
          {filteredDataSources.length} of {dataSources.length} data sources
        </div>
      </div>

      {/* Health Monitoring Controls */}
      <div className="panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" style={{ color: healthMonitoringEnabled ? 'var(--status-success)' : 'var(--text-muted)' }} />
              <span className="text-sm font-medium text-themed-text-primary">Health Monitoring</span>
            </div>
            <button
              onClick={() => setHealthMonitoringEnabled(!healthMonitoringEnabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200`}
              style={{ 
                backgroundColor: healthMonitoringEnabled ? 'var(--interactive-primary)' : 'var(--bg-elevated)'
              }}
            >
              <span
                className="pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200"
                style={{ 
                  backgroundColor: 'var(--bg-surface)',
                  transform: healthMonitoringEnabled ? 'translateX(20px)' : 'translateX(0)'
                }}
              />
            </button>
          </div>
          
          {healthMonitoringEnabled && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-themed-text-muted" />
                <span className="text-sm text-themed-text-secondary">Interval:</span>
                <select
                  value={healthRefreshInterval}
                  onChange={(e) => setHealthRefreshInterval(Number(e.target.value))}
                  className="input-themed text-sm py-1"
                >
                  <option value={30000}>30s</option>
                  <option value={60000}>1m</option>
                  <option value={300000}>5m</option>
                  <option value={600000}>10m</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-themed-text-muted">
                {lastHealthCheck && (
                  <span>
                    Last check: {lastHealthCheck.toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <button
                onClick={runHealthCheck}
                disabled={healthCheckInProgress}
                className="btn-themed-secondary text-sm py-1 disabled:opacity-50"
              >
                {healthCheckInProgress ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Activity className="h-3 w-3 mr-1" />
                    Check Now
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Data Sources Grid/List */}
      {filteredDataSources.length === 0 ? (
        <div className="panel flex flex-col items-center justify-center py-16">
          <Database className="h-16 w-16 text-themed-text-muted mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-themed-text-primary mb-2">No data sources found</h3>
          <p className="text-themed-text-secondary mb-6">
            {searchTerm || selectedCategory !== 'All' 
              ? 'Try adjusting your search or filters.' 
              : 'Get started by adding your first data source.'}
          </p>
          {(!searchTerm && selectedCategory === 'All') && (
            <button onClick={() => navigate('/connections/add')} className="btn-themed-primary">
              <Plus className="h-4 w-4 mr-2" />
              Add Data Source
            </button>
          )}
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDataSources.map((dataSource) => (
            <div key={dataSource.id} className="panel transition-colors hover:border-themed-border-accent">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DataSourceIcon dataSourceType={dataSource.dataSourceType} className="h-8 w-8" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-themed-text-primary">
                    {dataSource.name}
                  </h3>
                  <p className="text-sm text-themed-text-secondary">
                    {dataSource.dataSourceType} • {getDataSourceCategory(dataSource.dataSourceType)}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  {/* Health indicator */}
                  {healthMonitoringEnabled && (
                    <div 
                      className="relative"
                      title={`Health: ${getHealthStatus(dataSource.id)}`}
                    >
                      <div 
                        className={`w-2.5 h-2.5 rounded-full ${
                          getHealthStatus(dataSource.id) === 'checking' ? 'animate-pulse' : ''
                        }`}
                        style={{ backgroundColor: getHealthColor(getHealthStatus(dataSource.id)) }}
                      />
                      {getHealthStatus(dataSource.id) === 'healthy' && testResults[dataSource.id] && (
                        <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {testResults[dataSource.id].responseTimeMs}ms
                        </span>
                      )}
                    </div>
                  )}
                  <span className={`badge-muted ${
                    dataSource.isEnabled 
                      ? 'text-themed-status-success'
                      : 'text-themed-text-muted'
                  }`}>
                    {dataSource.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="mt-4 text-sm text-themed-text-muted font-mono truncate">
                {dataSource.url}
              </div>

              <div className="mt-2 text-xs text-themed-text-muted">
                Created: {formatDate(dataSource.createdAt)}
              </div>

              {/* Test Result */}
              {testResults[dataSource.id] && (
                <div className="mt-4">
                  {testResults[dataSource.id].isSuccess ? (
                    <div className="flex items-center gap-2 text-sm text-themed-status-success bg-green-500/5 p-2 rounded-md">
                      <CheckCircle className="h-4 w-4" />
                      <span>Connection successful ({testResults[dataSource.id].responseTimeMs}ms)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-themed-status-error bg-red-500/5 p-2 rounded-md">
                      <XCircle className="h-4 w-4" />
                      <span>{testResults[dataSource.id].errorMessage}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <div className="flex space-x-2">
                  <button onClick={() => handleEdit(dataSource)} className="btn-themed-secondary">
                    <Settings className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleTest(dataSource)}
                    disabled={testingDataSources.has(dataSource.id)}
                    className="btn-themed-secondary disabled:opacity-50"
                  >
                    {testingDataSources.has(dataSource.id) ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-1" />
                    )}
                    Test
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  <button onClick={() => handleExplore(dataSource)} className="btn-themed-secondary">
                    <Eye className="h-4 w-4 mr-1" />
                    Explore
                  </button>
                  <button onClick={() => handleBuildDashboard(dataSource)} className="btn-themed-primary">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel overflow-hidden p-0">
          <table className="min-w-full divide-y divide-themed-border-primary">
            <thead style={{ backgroundColor: 'var(--bg-surface)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">
                  Status
                </th>
                {healthMonitoringEnabled && (
                  <th className="px-6 py-3 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">
                    Health
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-themed-border-primary">
              {filteredDataSources.map((dataSource) => (
                <tr key={dataSource.id} className="hover:bg-themed-bg-elevated transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DataSourceIcon dataSourceType={dataSource.dataSourceType} className="h-6 w-6 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-themed-text-primary">
                          {dataSource.name}
                        </div>
                        <div className="text-sm text-themed-text-secondary font-mono truncate max-w-xs">
                          {dataSource.url}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-themed-text-primary">{dataSource.dataSourceType}</div>
                    <div className="text-sm text-themed-text-secondary">{getDataSourceCategory(dataSource.dataSourceType)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge-muted ${
                      dataSource.isEnabled 
                        ? 'text-themed-status-success'
                        : 'text-themed-text-muted'
                    }`}>
                      {dataSource.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  {healthMonitoringEnabled && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-2.5 h-2.5 rounded-full ${
                            getHealthStatus(dataSource.id) === 'checking' ? 'animate-pulse' : ''
                          }`}
                          style={{ backgroundColor: getHealthColor(getHealthStatus(dataSource.id)) }}
                        />
                        <span className="text-sm capitalize" style={{ color: getHealthColor(getHealthStatus(dataSource.id)) }}>
                          {getHealthStatus(dataSource.id)}
                        </span>
                        {getHealthStatus(dataSource.id) === 'healthy' && testResults[dataSource.id] && (
                          <span className="text-xs text-themed-text-muted">
                            ({testResults[dataSource.id].responseTimeMs}ms)
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-themed-text-secondary">
                    {formatDate(dataSource.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleTest(dataSource)}
                        disabled={testingDataSources.has(dataSource.id)}
                        className="p-2 text-themed-text-secondary hover:text-themed-text-primary disabled:opacity-50 transition-colors"
                        title="Test connection"
                      >
                        {testingDataSources.has(dataSource.id) ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(dataSource)}
                        className="p-2 text-themed-text-secondary hover:text-themed-text-primary transition-colors"
                        title="Edit data source"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleExplore(dataSource)}
                        className="p-2 text-themed-interactive-primary hover:opacity-80 transition-opacity"
                        title="Explore data"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleBuildDashboard(dataSource)}
                        className="p-2 text-themed-interactive-primary hover:opacity-80 transition-opacity"
                        title="Build dashboard"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
