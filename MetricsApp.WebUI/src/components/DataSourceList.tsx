import { useState } from 'react'
import { Edit, Trash2, TestTube, CheckCircle, XCircle, Loader2, Database } from 'lucide-react'
import { DataSourceConfiguration, DataSourceTestResult, DataSourceApi } from '../lib/datasource-api'

interface DataSourceListProps {
  dataSources: DataSourceConfiguration[]
  onEdit: (dataSource: DataSourceConfiguration) => void
  onDelete: (id: string) => void
  onView: (dataSource: DataSourceConfiguration) => void
  onRefresh: () => void
  isLoading?: boolean
}

export default function DataSourceList({ 
  dataSources, 
  onEdit, 
  onDelete, 
  onView, 
  onRefresh, 
  isLoading = false 
}: DataSourceListProps) {
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set())
  const [testResults, setTestResults] = useState<Record<string, DataSourceTestResult>>({})

  const handleTest = async (dataSource: DataSourceConfiguration) => {
    setTestingIds(prev => new Set(prev).add(dataSource.id))
    
    try {
      const result = await DataSourceApi.testDataSource({
        name: dataSource.name,
        dataSourceType: dataSource.dataSourceType,
        url: dataSource.url,
        properties: dataSource.properties,
        authentication: dataSource.authentication,
        isEnabled: dataSource.isEnabled
      })
      
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
      setTestingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(dataSource.id)
        return newSet
      })
    }
  }

  // const handleDelete = async (id: string) => {
  //   if (!confirm('Are you sure you want to delete this data source? This action cannot be undone.')) {
  //     return
  //   }

  //   setDeletingIds(prev => new Set(prev).add(id))
    
  //   try {
  //     await onDelete(id)
  //   } finally {
  //     setDeletingIds(prev => {
  //       const newSet = new Set(prev)
  //       newSet.delete(id)
  //       return newSet
  //     })
  //   }
  // }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  const getTestResultIcon = (result: DataSourceTestResult) => {
    if (result.isSuccess) {
      return <CheckCircle className="h-4 w-4 text-green-500" />
    } else {
      return <XCircle className="h-4 w-4 text-red-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">Loading data sources...</span>
      </div>
    )
  }

  if (dataSources.length === 0) {
    return (
      <div className="text-center py-12">
        <Database className="mx-auto h-12 w-12 text-slate-400" />
        <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No data sources</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Get started by creating your first data source.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">
          Data Sources ({dataSources.length})
        </h2>
        <button
          onClick={onRefresh}
          className="inline-flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Refresh
        </button>
      </div>

      {/* Data Sources Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dataSources.map((dataSource) => {
          const isTesting = testingIds.has(dataSource.id)
          const testResult = testResults[dataSource.id]

          return (
            <div
              key={dataSource.id}
              className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onView(dataSource)}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Database className="h-6 w-6 text-emerald-600" />
                    <h3 className="ml-2 text-lg font-medium text-slate-900 dark:text-white truncate">
                      {dataSource.name}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dataSource.isEnabled)}`}>
                    {dataSource.isEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Type:</span>
                    <span className="ml-2 text-sm text-slate-900 dark:text-white">{dataSource.dataSourceType}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">URL:</span>
                    <span className="ml-2 text-sm text-slate-900 dark:text-white truncate block">{dataSource.url}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Created:</span>
                    <span className="ml-2 text-sm text-slate-900 dark:text-white">{formatDate(dataSource.createdAt)}</span>
                  </div>
                  {dataSource.updatedAt !== dataSource.createdAt && (
                    <div>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Updated:</span>
                      <span className="ml-2 text-sm text-slate-900 dark:text-white">{formatDate(dataSource.updatedAt)}</span>
                    </div>
                  )}
                </div>

                {/* Test Result */}
                {testResult && (
                  <div className={`mb-4 p-3 rounded-md border ${
                    testResult.isSuccess 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center">
                      {getTestResultIcon(testResult)}
                      <span className={`ml-2 text-sm font-medium ${
                        testResult.isSuccess 
                          ? 'text-green-800 dark:text-green-200' 
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {testResult.isSuccess ? 'Connection OK' : 'Connection Failed'}
                      </span>
                      {testResult.responseTimeMs > 0 && (
                        <span className={`ml-2 text-xs ${
                          testResult.isSuccess 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-red-600 dark:text-red-400'
                        }`}>
                          ({testResult.responseTimeMs}ms)
                        </span>
                      )}
                    </div>
                    {!testResult.isSuccess && testResult.errorMessage && (
                      <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                        {testResult.errorMessage}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTest(dataSource)
                    }}
                    disabled={isTesting}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-emerald-700 bg-emerald-100 hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                  >
                    {isTesting ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <TestTube className="h-3 w-3 mr-1" />
                    )}
                    {isTesting ? 'Testing...' : 'Test'}
                  </button>

                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(dataSource)
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm('Are you sure you want to delete this data source?')) {
                          onDelete(dataSource.id)
                        }
                      }}
                      className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 