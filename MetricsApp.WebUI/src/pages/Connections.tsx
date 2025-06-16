import { useState, useEffect } from 'react'
import { Plus, Database, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DataSourceTypeInfo, DataSourceApi, ApiError } from '../lib/datasource-api'

export default function Connections() {
  const navigate = useNavigate()
  const [dataSourceTypes, setDataSourceTypes] = useState<DataSourceTypeInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDataSourceTypes()
  }, [])

  const loadDataSourceTypes = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const types = await DataSourceApi.getDataSourceTypes()
      setDataSourceTypes(types)
    } catch (error) {
      console.error('Failed to load datasource types:', error)
      setError(error instanceof ApiError ? error.message : 'Failed to load datasource types')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddConnection = (dataSourceType: string) => {
    navigate(`/connections/add?type=${dataSourceType}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Connections</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Connect to external data sources to query logs and metrics.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                <div className="ml-4 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Connections</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Connect to external data sources to query logs and metrics.
          </p>
        </div>
        <button
          onClick={() => navigate('/datasources')}
          className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <Database className="h-4 w-4 mr-2" />
          View Data Sources
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 bg-themed-alert-info border  border-themed-alert-info rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-sm font-medium text-blue-800 dark:text-blue-200 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Data Source Types */}
      <div>
        <h2 className="text-lg font-medium text-slate-900 dark:text-white mb-4">
          Available Data Source Types ({dataSourceTypes.length})
        </h2>
        
        {dataSourceTypes.length === 0 ? (
          <div className="text-center py-12">
            <Database className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No data source types available</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              No data source plugins are currently registered.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dataSourceTypes.map(type => (
              <div
                key={type.dataSourceType}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors duration-200 group"
              >
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                      <Database className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                        {type.displayName}
                      </h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                        v{type.version}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {type.description}
                  </p>
                  
                  <button
                    onClick={() => handleAddConnection(type.dataSourceType)}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Connection
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Panel */}
      {dataSourceTypes.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Getting Started
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Choose a data source type that matches your external system</li>
                  <li>Configure connection details like URL and authentication</li>
                  <li>Test the connection to ensure it's working properly</li>
                  <li>Start querying logs and metrics from your connected data sources</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 