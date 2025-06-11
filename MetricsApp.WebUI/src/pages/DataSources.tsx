import { useState, useEffect } from 'react'
import { Search, Filter, ArrowUpDown, Database, Plus, Settings, TestTube, BarChart3, Eye, AlertCircle, Loader2, CheckCircle, XCircle } from 'lucide-react'
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

  const getStatusColor = (isEnabled: boolean) => {
    return isEnabled 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Sources</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your configured data source connections.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                  <div className="ml-3">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-2"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                  </div>
                </div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded flex-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Sources</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your configured data source connections.
          </p>
        </div>
        <button
          onClick={() => navigate('/connections/add')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-sm shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Data Source
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-sm p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {successMessage}
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="inline-flex text-green-400 hover:text-green-600 focus:outline-none"
              >
                <span className="sr-only">Dismiss</span>
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sm p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-600 dark:hover:text-red-400"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search data sources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="sm:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-8 py-2 border border-slate-300 dark:border-slate-600 rounded-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white appearance-none"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort */}
          <div className="sm:w-48">
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
                className="w-full pl-10 pr-8 py-2 border border-slate-300 dark:border-slate-600 rounded-sm focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white appearance-none"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          Showing {filteredDataSources.length} of {dataSources.length} data sources
          {selectedCategory !== 'All' && ` in ${selectedCategory}`}
        </div>
      </div>

      {/* Data Sources Grid */}
      {filteredDataSources.length === 0 ? (
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
            {searchTerm || selectedCategory !== 'All' ? 'No matching data sources' : 'No data sources configured'}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {searchTerm || selectedCategory !== 'All' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first data source connection.'
            }
          </p>
          {!searchTerm && selectedCategory === 'All' && (
            <div className="mt-6">
              <button
                onClick={() => navigate('/connections/add')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Data Source
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDataSources.map(dataSource => {
            const testResult = testResults[dataSource.id]
            const isTesting = testingDataSources.has(dataSource.id)
            
            return (
              <div
                key={dataSource.id}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 hover:shadow-md"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                        <DataSourceIcon dataSourceType={dataSource.dataSourceType} />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                          {dataSource.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {dataSource.dataSourceType}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dataSource.isEnabled)}`}>
                      {dataSource.isEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Category:</span>
                      <span className="text-slate-900 dark:text-white">{getDataSourceCategory(dataSource.dataSourceType)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Created:</span>
                      <span className="text-slate-900 dark:text-white">{formatDate(dataSource.createdAt)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-500 dark:text-slate-400">URL:</span>
                      <p className="text-slate-900 dark:text-white break-all mt-1">{dataSource.url}</p>
                    </div>
                  </div>

                  {/* Test Result */}
                  {testResult && (
                    <div className={`mb-4 p-3 rounded-sm text-sm ${
                      testResult.isSuccess 
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                    }`}>
                      <div className="flex items-center">
                        {testResult.isSuccess ? (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        <span className="font-medium">
                          {testResult.isSuccess ? 'Connection successful' : 'Connection failed'}
                        </span>
                        {testResult.responseTimeMs > 0 && (
                          <span className="ml-auto">{testResult.responseTimeMs}ms</span>
                        )}
                      </div>
                      {testResult.errorMessage && !testResult.isSuccess && (
                        <p className="mt-1 text-xs">{testResult.errorMessage}</p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleBuildDashboard(dataSource)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                      >
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => handleExplore(dataSource)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Explore
                      </button>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleTest(dataSource)}
                        disabled={isTesting}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4 mr-1" />
                        )}
                        {isTesting ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleEdit(dataSource)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Panel */}
      {filteredDataSources.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-sm p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Data Source Management
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Test connections regularly to ensure data sources are accessible</li>
                  <li>Use "Build Dashboard" to create visualizations from your data</li>
                  <li>Use "Explore" to query and analyze your data interactively</li>
                  <li>Disable unused data sources to improve performance</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 