import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Database, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Clock,
  Settings,
  Activity,
  BarChart3,
  Tag
} from 'lucide-react'
import { 
  DataSourceConfiguration, 
  DataSourceTestResult,
  DataSourceApi, 
  ApiError 
} from '../lib/datasource-api'
import type { DataSourceMetadata } from '../lib/datasource-api'

export default function DataSourceMetadata() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [dataSource, setDataSource] = useState<DataSourceConfiguration | null>(null)
  const [metadata, setMetadata] = useState<DataSourceMetadata | null>(null)
  const [testResult, setTestResult] = useState<DataSourceTestResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTesting, setIsTesting] = useState(false)
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadDataSource()
    }
  }, [id])

  const loadDataSource = async () => {
    if (!id) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const dataSourceData = await DataSourceApi.getDataSource(id)
      setDataSource(dataSourceData)
      
      // Auto-load metadata if datasource is enabled
      if (dataSourceData.isEnabled) {
        loadMetadata()
      }
    } catch (error) {
      console.error('Failed to load data source:', error)
      setError(error instanceof ApiError ? error.message : 'Failed to load data source')
    } finally {
      setIsLoading(false)
    }
  }

  const loadMetadata = async () => {
    if (!id) return
    
    setIsLoadingMetadata(true)
    
    try {
      const metadataData = await DataSourceApi.getDataSourceMetadata(id)
      setMetadata(metadataData)
    } catch (error) {
      console.error('Failed to load metadata:', error)
      // Don't set error state for metadata failures, just log them
    } finally {
      setIsLoadingMetadata(false)
    }
  }

  const handleTestConnection = async () => {
    if (!dataSource) return
    
    setIsTesting(true)
    setTestResult(null)
    
    try {
      const result = await DataSourceApi.testDataSource(dataSource)
      setTestResult(result)
    } catch (error) {
      setTestResult({
        isSuccess: false,
        responseTimeMs: 0,
        errorMessage: error instanceof Error ? error.message : 'Test failed',
        details: 'Unable to test connection'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleEdit = () => {
    navigate(`/datasources?edit=${id}`)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (isEnabled: boolean) => {
    return isEnabled 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">Loading data source...</span>
      </div>
    )
  }

  if (error || !dataSource) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/datasources')}
            className="mr-4 inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Data Sources
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Source Not Found</h1>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error || 'Data source not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/datasources')}
            className="mr-4 inline-flex items-center text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Data Sources
          </button>
          <div className="flex items-center">
            <Database className="h-8 w-8 text-emerald-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{dataSource.name}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">{dataSource.dataSourceType}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(dataSource.isEnabled)}`}>
            {dataSource.isEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTesting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
          <button
            onClick={handleEdit}
            className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            <Settings className="h-4 w-4 mr-2" />
            Edit
          </button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`border rounded-md p-4 ${
          testResult.isSuccess 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex">
            {testResult.isSuccess ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-400" />
            )}
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                testResult.isSuccess 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {testResult.isSuccess ? 'Connection Successful' : 'Connection Failed'}
              </h3>
              <div className={`mt-2 text-sm ${
                testResult.isSuccess 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-red-700 dark:text-red-300'
              }`}>
                <p>{testResult.errorMessage}</p>
                {testResult.responseTimeMs > 0 && (
                  <p>Response time: {testResult.responseTimeMs}ms</p>
                )}
                {testResult.details && (
                  <p className="mt-1 text-xs">{testResult.details}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Configuration
            </h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">URL</label>
              <p className="mt-1 text-sm text-slate-900 dark:text-white break-all">{dataSource.url}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Authentication</label>
              <p className="mt-1 text-sm text-slate-900 dark:text-white">
                {!dataSource.authentication || (dataSource.authentication.type as any) === 0 || dataSource.authentication.type === 'None' ? 'None' :
                 (dataSource.authentication.type as any) === 1 || dataSource.authentication.type === 'Basic' ? 'Basic Authentication' :
                 (dataSource.authentication.type as any) === 2 || dataSource.authentication.type === 'Bearer' ? 'Bearer Token' :
                 (dataSource.authentication.type as any) === 3 || dataSource.authentication.type === 'ApiKey' ? 'API Key' :
                 (dataSource.authentication.type as any) === 4 || dataSource.authentication.type === 'OAuth2' ? 'OAuth2' : 'None'}
              </p>
            </div>

            {dataSource.properties && Object.keys(dataSource.properties).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Properties</label>
                <div className="mt-1 space-y-2">
                  {Object.entries(dataSource.properties).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{key}:</span>
                      <span className="text-sm text-slate-900 dark:text-white">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Created</label>
              <p className="mt-1 text-sm text-slate-900 dark:text-white flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {formatDate(dataSource.createdAt)}
              </p>
            </div>

            {dataSource.updatedAt !== dataSource.createdAt && (
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Last Updated</label>
                <p className="mt-1 text-sm text-slate-900 dark:text-white flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {formatDate(dataSource.updatedAt)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-900 dark:text-white flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Metadata
              </h3>
              {dataSource.isEnabled && (
                <button
                  onClick={loadMetadata}
                  disabled={isLoadingMetadata}
                  className="inline-flex items-center px-3 py-1 border border-slate-300 dark:border-slate-600 rounded text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  {isLoadingMetadata ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    'Refresh'
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="px-6 py-4">
            {!dataSource.isEnabled ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">Data Source Disabled</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Enable the data source to view metadata
                </p>
              </div>
            ) : isLoadingMetadata ? (
              <div className="text-center py-8">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Loading metadata...</p>
              </div>
            ) : metadata ? (
              <div className="space-y-6">
                {/* Available Metrics */}
                {metadata.availableMetrics && metadata.availableMetrics.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center mb-3">
                      <BarChart3 className="h-4 w-4 mr-1" />
                      Available Metrics ({metadata.availableMetrics.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {metadata.availableMetrics.map((metric, index) => (
                        <div key={index} className="px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded text-sm text-slate-900 dark:text-white">
                          {metric}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Fields */}
                {metadata.availableFields && metadata.availableFields.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center mb-3">
                      <Tag className="h-4 w-4 mr-1" />
                      Available Fields ({metadata.availableFields.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {metadata.availableFields.map((field, index) => (
                        <div key={index} className="px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {field.name}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded">
                              {field.type}
                            </span>
                          </div>
                          {field.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {field.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-3 mt-1">
                            {field.isSearchable && (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                Searchable
                              </span>
                            )}
                            {field.isAggregatable && (
                              <span className="text-xs text-blue-600 dark:text-blue-400">
                                Aggregatable
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Tags */}
                {metadata.availableTags && metadata.availableTags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center mb-3">
                      <Tag className="h-4 w-4 mr-1" />
                      Available Tags ({metadata.availableTags.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {metadata.availableTags.map((tag, index) => (
                        <div key={index} className="px-3 py-2 bg-slate-50 dark:bg-slate-700 rounded">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {tag.name}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {tag.values.length} values
                            </span>
                          </div>
                          {tag.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {tag.description}
                            </p>
                          )}
                          {tag.values.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {tag.values.slice(0, 5).map((value, valueIndex) => (
                                <span key={valueIndex} className="text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
                                  {value}
                                </span>
                              ))}
                              {tag.values.length > 5 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  +{tag.values.length - 5} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Range */}
                {metadata.timeRange && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-900 dark:text-white flex items-center mb-3">
                      <Clock className="h-4 w-4 mr-1" />
                      Data Time Range
                    </h4>
                    <div className="space-y-2">
                      {metadata.timeRange.earliestTime && (
                        <div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">Earliest:</span>
                          <span className="ml-2 text-sm text-slate-900 dark:text-white">
                            {formatDate(metadata.timeRange.earliestTime)}
                          </span>
                        </div>
                      )}
                      {metadata.timeRange.latestTime && (
                        <div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">Latest:</span>
                          <span className="ml-2 text-sm text-slate-900 dark:text-white">
                            {formatDate(metadata.timeRange.latestTime)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-8 w-8 text-slate-400" />
                <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No Metadata Available</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Unable to retrieve metadata from this data source
                </p>
                <button
                  onClick={loadMetadata}
                  className="mt-3 inline-flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 