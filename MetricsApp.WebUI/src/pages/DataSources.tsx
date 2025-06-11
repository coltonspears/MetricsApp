import { useState, useEffect } from 'react'
import { Search, Filter, ArrowUpDown, Database, Plus, Settings, TestTube, BarChart3, Eye, AlertCircle, Loader2, CheckCircle, XCircle, Grid3X3, List } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  DataSourceConfiguration, 
  DataSourceTestResult,
  DataSourceApi, 
  ApiError 
} from '../lib/datasource-api'
import DataSourceIcon from '../components/DataSourceIcon'

// TODO: Update this to use the actual categories from the backend
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

// Add view type after the sortOptions
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
    // Persist view mode - default to card view
    const saved = localStorage.getItem('dataSourcesViewMode')
    return (saved as ViewMode) || 'card'
  })

  useEffect(() => {
    loadDataSources()
  }, [])

  useEffect(() => {
    // Handle success message from navigation state
    if (location.state?.message && location.state?.type === 'success') {
      setSuccessMessage(location.state.message)
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  useEffect(() => {
    filterAndSortDataSources()
  }, [dataSources, searchTerm, selectedCategory, sortBy, sortOrder])

  // Persist view mode
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

    // Sort the filtered results
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
        default: // name
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

  const handleBuildDashboard = (dataSource: DataSourceConfiguration) => {
    // TODO: Navigate to dashboard builder with this data source
    console.log('Build dashboard for:', dataSource.name)
    navigate(`/dashboards/new?datasource=${dataSource.id}`)
  }

  const handleExplore = (dataSource: DataSourceConfiguration) => {
    // TODO: Navigate to data exploration page
    console.log('Explore data source:', dataSource.name)
    navigate(`/explore?datasource=${dataSource.id}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-themed-interactive-primary"></div>
        <span className="ml-4 text-themed-text-secondary">Loading data sources...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-themed-border-primary pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-themed-text-primary">Data Sources</h1>
            <p className="mt-2 text-themed-text-secondary">
              Manage your data connections and integrations
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-themed-bg-surface rounded-sm border border-themed-border-primary">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 ${
                  viewMode === 'card'
                    ? 'bg-themed-interactive-primary text-themed-text-inverse'
                    : 'text-themed-text-secondary hover:text-themed-text-primary'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('row')}
                className={`p-2 ${
                  viewMode === 'row'
                    ? 'bg-themed-interactive-primary text-themed-text-inverse'
                    : 'text-themed-text-secondary hover:text-themed-text-primary'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
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

      {/* Success Message */}
      {successMessage && (
        <div className="bg-themed-status-success bg-opacity-10 border border-themed-status-success rounded-lg p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-themed-status-success mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-themed-status-success">Success</h3>
              <p className="mt-1 text-sm text-themed-text-secondary">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-themed-status-error bg-opacity-10 border border-themed-status-error rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-themed-status-error mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-themed-status-error">Error</h3>
              <p className="mt-1 text-sm text-themed-text-secondary">{error}</p>
              <button
                onClick={loadDataSources}
                className="mt-3 inline-flex items-center px-3 py-2 border border-themed-status-error text-sm font-medium rounded-sm text-themed-status-error bg-themed-bg-surface hover:bg-themed-status-error hover:text-themed-text-inverse transition-colors"
              >
                <Loader2 className="h-4 w-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-themed-bg-tertiary rounded-lg border border-themed-border-primary p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
            <input
              type="text"
              placeholder="Search data sources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-themed-border-primary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted sm:text-sm"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full pl-10 pr-8 py-2 border border-themed-border-primary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary bg-themed-bg-surface text-themed-text-primary sm:text-sm"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
            <select
              value={sortBy}
              onChange={(e) => handleSort(e.target.value)}
              className="block w-full pl-10 pr-8 py-2 border border-themed-border-primary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary bg-themed-bg-surface text-themed-text-primary sm:text-sm"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-end">
            <span className="text-sm text-themed-text-secondary">
              {filteredDataSources.length} of {dataSources.length} data sources
            </span>
          </div>
        </div>
      </div>

      {/* Data Sources Grid/List */}
      {filteredDataSources.length === 0 ? (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-themed-text-muted" />
          <h3 className="mt-2 text-sm font-medium text-themed-text-primary">No data sources found</h3>
          <p className="mt-1 text-sm text-themed-text-secondary">
            {searchTerm || selectedCategory !== 'All' 
              ? 'Try adjusting your search or filters.' 
              : 'Get started by adding your first data source.'}
          </p>
          {(!searchTerm && selectedCategory === 'All') && (
            <div className="mt-6">
              <button
                onClick={() => navigate('/connections/add')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-sm shadow-sm text-themed-text-inverse bg-themed-interactive-primary hover:bg-themed-interactive-primary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Data Source
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'card' ? (
        renderCardView()
      ) : (
        renderRowView()
      )}
    </div>
  )

  function renderCardView() {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDataSources.map((dataSource) => (
          <div
            key={dataSource.id}
            className="bg-themed-bg-tertiary overflow-hidden shadow-lg rounded-lg border border-themed-border-primary hover:shadow-xl transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DataSourceIcon dataSourceType={dataSource.dataSourceType} className="h-8 w-8" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-medium text-themed-text-primary">
                    {dataSource.name}
                  </h3>
                  <p className="text-sm text-themed-text-secondary">
                    {dataSource.dataSourceType} • {getDataSourceCategory(dataSource.dataSourceType)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    dataSource.isEnabled 
                      ? 'bg-themed-status-success bg-opacity-20 text-themed-status-success'
                      : 'bg-themed-text-muted bg-opacity-20 text-themed-text-muted'
                  }`}>
                    {dataSource.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-sm text-themed-text-secondary line-clamp-2">
                  {dataSource.url}
                </p>
              </div>

              <div className="mt-4 text-xs text-themed-text-muted">
                <p>URL: <span className="font-mono">{dataSource.url}</span></p>
                <p>Created: {formatDate(dataSource.createdAt)}</p>
              </div>

              {/* Test Result */}
              {testResults[dataSource.id] && (
                <div className="mt-4">
                  {testResults[dataSource.id].isSuccess ? (
                    <div className="bg-themed-status-success bg-opacity-10 border border-themed-status-success rounded-sm p-2">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-themed-status-success mr-2" />
                        <span className="text-xs text-themed-status-success">
                          Connection successful ({testResults[dataSource.id].responseTimeMs}ms)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-themed-status-error bg-opacity-10 border border-themed-status-error rounded-sm p-2">
                      <div className="flex items-center">
                        <XCircle className="h-4 w-4 text-themed-status-error mr-2" />
                        <span className="text-xs text-themed-status-error">
                          {testResults[dataSource.id].errorMessage}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(dataSource)}
                    className="inline-flex items-center px-3 py-2 border border-themed-border-primary text-sm font-medium rounded-sm text-themed-text-primary bg-themed-bg-surface hover:bg-themed-interactive-secondary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary transition-colors"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleTest(dataSource)}
                    disabled={testingDataSources.has(dataSource.id)}
                    className="inline-flex items-center px-3 py-2 border border-themed-border-primary text-sm font-medium rounded-sm text-themed-text-primary bg-themed-bg-surface hover:bg-themed-interactive-secondary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary disabled:opacity-50 transition-colors"
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
                  <button
                    onClick={() => handleExplore(dataSource)}
                    className="inline-flex items-center px-3 py-2 border border-themed-interactive-primary text-sm font-medium rounded-sm text-themed-interactive-primary bg-themed-bg-surface hover:bg-themed-interactive-primary hover:text-themed-text-inverse focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary transition-colors"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Explore
                  </button>
                  <button
                    onClick={() => handleBuildDashboard(dataSource)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-sm shadow-sm text-themed-text-inverse bg-themed-interactive-primary hover:bg-themed-interactive-primary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary transition-colors"
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  function renderRowView() {
    return (
      <div className="bg-themed-bg-tertiary shadow-lg rounded-lg border border-themed-border-primary overflow-hidden">
        <table className="min-w-full divide-y divide-themed-border-primary">
          <thead className="bg-themed-bg-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-themed-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-themed-bg-tertiary divide-y divide-themed-border-primary">
            {filteredDataSources.map((dataSource) => (
              <tr key={dataSource.id} className="hover:bg-themed-bg-elevated transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <DataSourceIcon dataSourceType={dataSource.dataSourceType} className="h-6 w-6 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-themed-text-primary">
                        {dataSource.name}
                      </div>
                      <div className="text-sm text-themed-text-secondary">
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    dataSource.isEnabled 
                      ? 'bg-themed-status-success bg-opacity-20 text-themed-status-success'
                      : 'bg-themed-text-muted bg-opacity-20 text-themed-text-muted'
                  }`}>
                    {dataSource.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-themed-text-secondary">
                  {formatDate(dataSource.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handleTest(dataSource)}
                      disabled={testingDataSources.has(dataSource.id)}
                      className="text-themed-text-secondary hover:text-themed-text-primary disabled:opacity-50"
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
                      className="text-themed-text-secondary hover:text-themed-text-primary"
                      title="Edit data source"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleExplore(dataSource)}
                      className="text-themed-interactive-primary hover:text-themed-interactive-primary-hover"
                      title="Explore data"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleBuildDashboard(dataSource)}
                      className="text-themed-interactive-primary hover:text-themed-interactive-primary-hover"
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
    )
  }
} 