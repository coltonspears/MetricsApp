import { useState, useEffect } from 'react'
import { Search, Filter, ArrowUpDown, Database, Plus, ExternalLink, ArrowLeft, AlertTriangle } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DataSourceTypeInfo, DataSourceApi, ApiError, DataSourceConfiguration } from '../lib/datasource-api'
import DataSourceForm from '../components/DataSourceForm'

// Mock categories for now - in a real implementation, this would come from the backend
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
  { value: 'category', label: 'Category' },
  { value: 'version', label: 'Version' }
]

export default function AddConnection() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [dataSourceTypes, setDataSourceTypes] = useState<DataSourceTypeInfo[]>([])
  const [filteredTypes, setFilteredTypes] = useState<DataSourceTypeInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usingMockData, setUsingMockData] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedType, setSelectedType] = useState<string | null>(null)

  useEffect(() => {
    loadDataSourceTypes()
  }, [])

  useEffect(() => {
    // Check if we have a type parameter from URL
    const typeParam = searchParams.get('type')
    if (typeParam) {
      setSelectedType(typeParam)
    }
  }, [searchParams])

  useEffect(() => {
    filterAndSortTypes()
  }, [dataSourceTypes, searchTerm, selectedCategory, sortBy, sortOrder])

  const loadDataSourceTypes = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const types = await DataSourceApi.getDataSourceTypes()
      setDataSourceTypes(types)
    } catch (error) {
      console.error('Failed to load datasource types:', error)
      const errorMessage = error instanceof ApiError ? error.message : 'Failed to load datasource types'
      setError(errorMessage)
      
      // Check if we're using mock data
      if (errorMessage.includes('mock data')) {
        setUsingMockData(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const filterAndSortTypes = () => {
    let filtered = dataSourceTypes.filter(type => {
      const matchesSearch = type.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           type.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           type.dataSourceType.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === 'All' || 
                             getDataSourceCategory(type.dataSourceType) === selectedCategory
      
      return matchesSearch && matchesCategory
    })

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: string
      let bValue: string

      switch (sortBy) {
        case 'category':
          aValue = getDataSourceCategory(a.dataSourceType)
          bValue = getDataSourceCategory(b.dataSourceType)
          break
        case 'version':
          aValue = a.version
          bValue = b.version
          break
        default: // name
          aValue = a.displayName
          bValue = b.displayName
          break
      }

      const comparison = aValue.localeCompare(bValue)
      return sortOrder === 'asc' ? comparison : -comparison
    })

    setFilteredTypes(filtered)
  }

  const handleSort = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('asc')
    }
  }

  const handleDataSourceClick = (dataSourceType: string) => {
    navigate(`/connections/datasources/${dataSourceType}`)
  }

  const handleSelectType = (dataSourceType: string) => {
    setSelectedType(dataSourceType)
    setError(null)
  }

  const handleCancel = () => {
    if (selectedType) {
      setSelectedType(null)
      setError(null)
      // Remove type parameter from URL
      navigate('/connections/add')
    } else {
      navigate('/connections/datasources')
    }
  }

  const handleSubmit = async (data: Omit<DataSourceConfiguration, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const newDataSource = await DataSourceApi.createDataSource(data)
      navigate('/connections/datasources', { 
        state: { 
          message: `Data source "${newDataSource.name}" created successfully!`,
          type: 'success'
        }
      })
    } catch (error) {
      console.error('Failed to create data source:', error)
      setError(error instanceof ApiError ? error.message : 'Failed to create data source')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedTypeInfo = selectedType ? dataSourceTypes.find(t => t.dataSourceType === selectedType) : null

  // Show mock data banner
  const MockDataBanner = () => (
    <div className="border-themed-alert-error bg-opacity-10 border border-themed-status-warning rounded-md p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-themed-status-warning" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-themed-text-primary">
            Using Mock Data
          </h3>
          <div className="mt-2 text-sm text-themed-text-secondary">
            <p>
              The backend API is not available. You can still test the interface with mock data, 
              but actual connections won't be persisted. To use real data sources, ensure the 
              MetricsApp.Api service is running.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // Show form if a type is selected
  if (selectedType && selectedTypeInfo) {
    return (
      <div className="space-y-6">
        {/* Mock Data Banner */}
        {usingMockData && <MockDataBanner />}

        {/* Header */}
        <button
            onClick={handleCancel}
            className="mr-4 inline-flex items-center text-sm text-themed-text-secondary hover:text-themed-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Add Connection
          </button>
        <div className="flex items-center">

          <div>
            <h1 className="text-2xl font-bold text-themed-text-primary">Add Connection</h1>
            <p className="mt-1 text-sm text-themed-text-secondary">
              Create a new {selectedTypeInfo.displayName} connection
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && !usingMockData && (
          <div className="bg-themed-alert-error bg-opacity-10 border border-themed-alert-error rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-themed-status-error" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-themed-status-error">Error</h3>
                <div className="mt-2 text-sm text-themed-status-error">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Source Form */}
        <div className="bg-themed-bg-tertiary shadow rounded-lg border border-themed-border-primary">
          <div className="px-6 py-6">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-themed-text-primary">
                  Configure {selectedTypeInfo.displayName} Connection
                </h2>
                <button
                  onClick={() => setSelectedType(null)}
                  className="text-sm text-themed-text-secondary hover:text-themed-text-primary transition-colors"
                >
                  Change Type
                </button>
              </div>
              <p className="text-sm text-themed-text-secondary mt-1">
                {selectedTypeInfo.description}
              </p>
            </div>
            
            <DataSourceForm
              dataSourceTypes={dataSourceTypes}
              preselectedType={selectedType}
              initialData={undefined}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isLoading={isSubmitting}
            />
          </div>
        </div>

        {/* Info Panel */}
        <div className="bg-themed-alert-info bg-opacity-10 border border-themed-alert-info rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-themed-status-info" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-themed-status-info">
                Connection Tips
              </h3>
              <div className="mt-2 text-sm text-themed-text-secondary">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Ensure the data source is accessible from this application</li>
                  <li>Use descriptive names to easily identify connections</li>
                  <li>Test the connection before saving to verify it works</li>
                  <li>Store sensitive credentials securely using environment variables when possible</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-themed-text-primary">Add New Connection</h1>
          <p className="mt-1 text-sm text-themed-text-secondary">
            Choose a data source type to connect to your external systems.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-themed-bg-tertiary rounded-lg border border-themed-border-primary p-6 animate-pulse">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-themed-bg-surface rounded-lg"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-themed-bg-surface rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-themed-bg-surface rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-themed-bg-surface rounded"></div>
                <div className="h-3 bg-themed-bg-surface rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mock Data Banner */}
      {usingMockData && <MockDataBanner />}

      {/* Header */}
      <div className="border-b border-themed-border-primary pb-4">
        <h1 className="text-3xl font-bold text-themed-text-primary">Add Data Source Connection</h1>
        <p className="mt-2 text-themed-text-secondary">
          Connect to external data sources to start collecting and analyzing metrics.
        </p>
      </div>

      {/* Connection Type Selection */}
      <div className="bg-themed-bg-tertiary shadow rounded-lg border border-themed-border-primary">
        <div className="px-6 py-4 border-b border-themed-border-primary">
          <h3 className="text-lg leading-6 font-medium text-themed-text-primary">Choose Connection Type</h3>
          <p className="mt-1 text-sm text-themed-text-secondary">
            Select the type of data source you want to connect to.
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dataSourceTypes.map((type) => (
              <button
                key={type.dataSourceType}
                onClick={() => setSelectedType(type.dataSourceType)}
                className={`relative border rounded-lg p-4 flex flex-col items-center space-y-2 transition-colors ${
                  selectedType === type.dataSourceType
                    ? 'border-themed-interactive-primary bg-themed-interactive-secondary'
                    : 'border-themed-border-primary bg-themed-bg-surface hover:bg-themed-bg-elevated'
                }`}
              >
                <Database className={`h-8 w-8 ${
                  selectedType === type.dataSourceType ? 'text-themed-interactive-primary' : 'text-themed-text-secondary'
                }`} />
                <div className="text-center">
                  <h4 className="text-sm font-medium text-themed-text-primary">
                    {type.displayName}
                  </h4>
                  <p className="text-xs text-themed-text-secondary mt-1">
                    {type.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message - only show if not using mock data */}
      {error && !usingMockData && (
        <div className="bg-themed-alert-error bg-opacity-10 border border-themed-alert-error rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-themed-status-error" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-themed-status-error">Error</h3>
              <div className="mt-2 text-sm text-themed-status-error">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Type Selection */}
      {!selectedType && (
        <>
          {/* Filters and Search */}
          <div className="bg-themed-bg-tertiary rounded-lg border border-themed-border-primary p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
                  <input
                    type="text"
                    placeholder="Search data sources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-themed-border-primary rounded-sm focus:ring-themed-interactive-primary focus:border-themed-interactive-primary bg-themed-bg-surface text-themed-text-primary"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="sm:w-48">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 border border-themed-border-primary rounded-sm focus:ring-themed-interactive-primary focus:border-themed-interactive-primary bg-themed-bg-surface text-themed-text-primary appearance-none"
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
                  <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
                  <select
                    value={sortBy}
                    onChange={(e) => handleSort(e.target.value)}
                    className="w-full pl-10 pr-8 py-2 border border-themed-border-primary rounded-sm focus:ring-themed-interactive-primary focus:border-themed-interactive-primary bg-themed-bg-surface text-themed-text-primary appearance-none"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-themed-text-secondary">
              Showing {filteredTypes.length} of {dataSourceTypes.length} data sources
              {selectedCategory !== 'All' && ` in ${selectedCategory}`}
            </div>
          </div>

          {/* Data Source Types Grid */}
          {filteredTypes.length === 0 ? (
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-themed-text-muted" />
              <h3 className="mt-2 text-sm font-medium text-themed-text-primary">
                {searchTerm || selectedCategory !== 'All' ? 'No matching data sources' : 'No data sources available'}
              </h3>
              <p className="mt-1 text-sm text-themed-text-secondary">
                {searchTerm || selectedCategory !== 'All' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No data source plugins are currently registered.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTypes.map(type => (
                <div
                  key={type.dataSourceType}
                  className="bg-themed-bg-tertiary rounded-lg border border-themed-border-primary hover:border-themed-interactive-primary transition-all duration-200 group hover:shadow-md"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-themed-interactive-secondary rounded-lg flex items-center justify-center">
                          <Database className="h-6 w-6 text-themed-interactive-primary" />
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="text-lg font-medium text-themed-text-primary group-hover:text-themed-interactive-primary transition-colors">
                            {type.displayName}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-themed-bg-surface text-themed-text-secondary">
                              {getDataSourceCategory(type.dataSourceType)}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-themed-interactive-secondary text-themed-interactive-primary">
                              v{type.version}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-themed-text-secondary line-clamp-3 mb-4">
                      {type.description}
                    </p>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSelectType(type.dataSourceType)}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-sm shadow-sm text-sm font-medium text-themed-text-inverse bg-themed-interactive-primary hover:bg-themed-interactive-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-themed-interactive-primary transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Connection
                      </button>
                      <button
                        onClick={() => handleDataSourceClick(type.dataSourceType)}
                        className="inline-flex items-center px-3 py-2 border border-themed-border-primary rounded-sm text-sm font-medium text-themed-text-primary bg-themed-bg-surface hover:bg-themed-bg-elevated transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Panel */}
          {filteredTypes.length > 0 && (
            <div className="bg-themed-alert-info bg-opacity-10 border border-themed-alert-info rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-themed-status-info" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-themed-status-info">
                    Getting Started
                  </h3>
                  <div className="mt-2 text-sm text-themed-text-secondary">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Click "Add Connection" to configure a new data source instance</li>
                      <li>Click the info icon to learn more about each data source type</li>
                      <li>Use the search and filters to find the right data source for your needs</li>
                      <li>Each data source provides different capabilities for logs, metrics, and traces</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
} 