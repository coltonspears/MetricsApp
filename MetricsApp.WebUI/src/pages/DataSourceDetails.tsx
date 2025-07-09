import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Database, 
  Plus, 
  ExternalLink, 
  Book, 
  FileText, 
  Github,
  Shield,
  Clock,
  Tag,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { DataSourceTypeInfo, DataSourceExtendedInfo, DataSourceApi, ApiError } from '../lib/datasource-api'

const tabs = [
  { id: 'overview', name: 'Overview', icon: FileText },
  { id: 'screenshots', name: 'Screenshots', icon: ExternalLink, hidden: true },
  { id: 'changelog', name: 'Changelog', icon: Clock, hidden: true },
]

export default function DataSourceDetails() {
  const { dataSourceType } = useParams<{ dataSourceType: string }>()
  const navigate = useNavigate()
  const [dataSourceInfo, setDataSourceInfo] = useState<DataSourceTypeInfo | null>(null)
  const [extendedInfo, setExtendedInfo] = useState<DataSourceExtendedInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (dataSourceType) {
      loadDataSourceInfo()
    }
  }, [dataSourceType])

  const loadDataSourceInfo = async () => {
    if (!dataSourceType) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const [info, extended] = await Promise.all([
        DataSourceApi.getDataSourceType(dataSourceType),
        DataSourceApi.getDataSourceExtendedInfo(dataSourceType)
      ])
      
      setDataSourceInfo(info)
      setExtendedInfo(extended)
    } catch (error) {
      console.error('Failed to load data source info:', error)
      setError(error instanceof ApiError ? error.message : 'Failed to load data source information')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddConnection = () => {
    navigate(`/connections/add?type=${dataSourceType}`)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-themed-interactive-primary" />
        <span className="ml-2 text-themed-text-secondary">Loading data source information...</span>
      </div>
    )
  }

  if (error || !dataSourceInfo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/connections/add')}
            className="mr-4 inline-flex items-center text-sm text-themed-text-secondary hover:text-themed-text-primary">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Add Connection
          </button>
          <h1 className="text-2xl font-bold text-themed-text-primary">Data Source Not Found</h1>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 border-themed-alert-info rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error || 'Data source type not found'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const visibleTabs = tabs.filter(tab => 
    !tab.hidden || 
    (tab.id === 'screenshots' && (extendedInfo?.screenshots?.length ?? 0) > 0) || 
    (tab.id === 'changelog' && (extendedInfo?.changelog?.length ?? 0) > 0)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <button
            onClick={() => navigate('/connections/add')}
            className="mr-4 inline-flex items-center text-sm text-themed-text-secondary hover:text-themed-text-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Add Connection
          </button>
      <div className="flex items-center justify-between">
        
        <div className="flex items-center">
          
          <div className="flex items-center">
            <div className="w-16 h-16 bg-themed-bg-surface rounded-lg flex items-center justify-center mr-4">
              <Database className="h-8 w-8 text-themed-interactive-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-themed-text-primary">{dataSourceInfo.displayName}</h1>
              <p className="text-md text-themed-text-secondary mt-1">{dataSourceInfo.description}</p>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleAddConnection}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-s shadow-sm text-sm font-medium text-themed-text-inverse bg-themed-interactive-primary hover:bg-themed-interactive-primary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary transition-colors">
          <Plus className="h-5 w-5 mr-2" />
          Add New Connection
        </button>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-themed-bg-surface text-themed-text-primary">
          <Tag className="h-4 w-4 mr-1" />
          {extendedInfo?.category}
        </span>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-themed-bg-surface text-themed-text-primary">
          v{dataSourceInfo.version}
        </span>
        {extendedInfo?.license && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-themed-bg-surface text-themed-text-primary">
            <Shield className="h-4 w-4 mr-1" />
            {extendedInfo.license}
          </span>
        )}
      </div>

      {/* Quick Links */}
      {(extendedInfo?.repository || extendedInfo?.documentation) && (
        <div className="flex flex-wrap gap-3">
          {extendedInfo.repository && (
            <a
              href={extendedInfo.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-themed-border-primary rounded-s text-sm font-medium text-themed-text-primary bg-themed-bg-surface hover:bg-themed-bg-elevated transition-colors"
            >
              <Github className="h-4 w-4 mr-2" />
              Repository
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          )}
          {extendedInfo.documentation && (
            <a
              href={extendedInfo.documentation}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-themed-border-primary rounded-md text-sm font-medium text-themed-text-primary bg-themed-bg-surface hover:bg-themed-bg-elevated transition-colors"
            >
              <Book className="h-4 w-4 mr-2" />
              Documentation
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-themed-border-primary">
        <nav className="-mb-px flex space-x-8">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-themed-interactive-primary text-themed-interactive-primary'
                    : 'border-transparent text-themed-text-secondary hover:text-themed-text-primary hover:border-themed-border-primary'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-themed-bg-tertiary shadow rounded-lg border border-themed-border-primary">
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            {/* Configuration Schema */}
            <div>
              <h3 className="text-lg font-medium text-themed-text-primary mb-4">Configuration Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dataSourceInfo.configurationSchema.fields.map((field, index) => (
                  <div key={index} className="border border-themed-border-secondary rounded-lg p-4 bg-themed-bg-surface">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-themed-text-primary">{field.label}</h4>
                      <div className="flex items-center space-x-2">
                        {/*<span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded">
                          {field.type}
                        </span>*/}
                        {field.required && (
                          <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-1 rounded">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                    {field.description && (
                      <p className="text-sm text-themed-text-secondary mb-2">{field.description}</p>
                    )}
                    {field.placeholder && (
                      <p className="text-xs text-themed-text-secondary">
                        Example: {field.placeholder}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Capabilities */}
            {extendedInfo?.capabilities && extendedInfo.capabilities.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-themed-text-primary mb-4">Capabilities</h3>
                <div className="flex flex-wrap gap-2">
                  {extendedInfo.capabilities.map((capability: string, index: number) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-themed-bg-surface text-themed-text-primary">
                      {capability}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {extendedInfo?.tags && extendedInfo.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-themed-text-primary mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {extendedInfo.tags.map((tag: string, index: number) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-themed-bg-surface text-themed-text-primary">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-themed-text-primary mb-4">Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-themed-text-secondary">Version</dt>
                    <dd className="text-sm text-themed-text-primary">{dataSourceInfo.version}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-themed-text-secondary">Category</dt>
                    <dd className="text-sm text-themed-text-primary">{extendedInfo?.category}</dd>
                  </div>
                  {extendedInfo?.maintainer && (
                    <div>
                      <dt className="text-sm font-medium text-themed-text-secondary">Maintainer</dt>
                      <dd className="text-sm text-themed-text-primary">{extendedInfo.maintainer}</dd>
                    </div>
                  )}
                  {extendedInfo?.license && (
                    <div>
                      <dt className="text-sm font-medium text-themed-text-secondary">License</dt>
                      <dd className="text-sm text-themed-text-primary">{extendedInfo.license}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium text-themed-text-primary mb-4">Getting Started</h3>
                <div className="space-y-3">
                  <div className="bg-themed-alert-info border border-themed-alert-info rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-themed-status-info" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                      <h4 className="text-sm font-medium text-themed-text-primary">Quick Setup</h4>
                        <div className="mt-2 text-sm text-themed-text-secondary">
                          <ol className="list-decimal pl-5 space-y-1">
                            <li>Click "Add New Connection" to start configuration</li>
                            <li>Fill in the required connection details</li>
                            <li>Test the connection to verify it works</li>
                            <li>Save and start querying your data</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'screenshots' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-themed-text-primary mb-4">Screenshots</h3>
            <p className="text-themed-text-secondary">Screenshots will be displayed here when available.</p>
          </div>
        )}

        {activeTab === 'changelog' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-themed-text-primary mb-4">Changelog</h3>
            {extendedInfo?.changelog && extendedInfo.changelog.length > 0 ? (
              <div className="space-y-6">
                {extendedInfo.changelog.map((entry, index) => (
                  <div key={index} className="border border-themed-border-primary rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-semibold text-themed-text-primary">
                          v{entry.version}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          entry.releaseType === 'Major' ? 'bg-themed-bg-surface text-themed-text-primary' :
                          entry.releaseType === 'Minor' ? 'bg-themed-bg-surface text-themed-text-primary' :
                          'bg-themed-bg-surface text-themed-text-primary'
                        }`}>
                          {entry.releaseType}
                        </span>
                      </div>
                      <span className="text-sm text-themed-text-secondary">
                        {new Date(entry.releaseDate).toLocaleDateString()}
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {entry.changes.map((change, changeIndex) => (
                        <li key={changeIndex} className="flex items-start">
                          <span className="inline-block w-2 h-2 bg-themed-interactive-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          <span className="text-sm text-themed-text-secondary">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-themed-text-secondary">No changelog entries available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 