import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Puzzle, Search, Package, RefreshCw, ChevronRight, AlertCircle } from 'lucide-react'
import { PluginSummaryDto } from '../plugins/types'
import { loadPluginSummaries } from '../plugins/api'
import PageHeader from '../components/PageHeader'

export default function PluginsListPage() {
  const [plugins, setPlugins] = useState<PluginSummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const loadPlugins = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await loadPluginSummaries()
      setPlugins(data)
    } catch (err) {
      setError('Failed to load plugins')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPlugins()
  }, [])

  const filteredPlugins = plugins.filter(p =>
    p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.pluginId?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPluginTypeStyle = (type: string) => {
    const t = type?.toLowerCase()
    if (t === 'setup' || t === 'datasource') return { color: 'var(--status-info)' }
    if (t === 'dashboard' || t === 'panel') return { color: 'var(--status-success)' }
    if (t === 'backend') return { color: 'var(--status-warning)' }
    return { color: 'var(--text-secondary)' }
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Plugins"
        description="Extend MetricsApp functionality with plugins"
        meta={
          <span className="badge-muted">
            <Puzzle className="h-3 w-3" />
            {plugins.length} available
          </span>
        }
        actions={
          <div className="flex gap-2">
            <button 
              onClick={loadPlugins} 
              disabled={loading} 
              className="btn-themed-secondary"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="btn-themed-primary">
              <Package className="h-4 w-4" />
              Browse Marketplace
            </button>
          </div>
        }
      />

      {/* Search Toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar__group flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search 
              className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4" 
              style={{ color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-themed w-full pl-8"
            />
          </div>
        </div>
        <div className="page-toolbar__divider" />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {filteredPlugins.length} of {plugins.length}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div 
          className="p-3 flex items-center gap-2 text-sm"
          style={{ 
            backgroundColor: 'var(--alert-error-bg)', 
            color: 'var(--alert-error-text)',
            borderLeft: '3px solid var(--alert-error-border)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <AlertCircle className="h-4 w-4" />
          {error}
          <button onClick={loadPlugins} className="btn-themed-secondary btn-themed-sm ml-auto">
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3">
            <div 
              className="animate-spin rounded-full h-8 w-8 border-2 border-b-transparent"
              style={{ borderColor: 'var(--interactive-primary)', borderBottomColor: 'transparent' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading plugins...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPlugins.length === 0 && (
        <div className="panel flex flex-col items-center justify-center py-12">
          <Puzzle className="h-12 w-12 mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {searchTerm ? 'No plugins match your search' : 'No plugins installed'}
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {searchTerm ? 'Try adjusting your search terms.' : 'Browse the marketplace to find plugins.'}
          </p>
        </div>
      )}

      {/* Plugins Grid */}
      {!loading && filteredPlugins.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlugins.map(plugin => (
            <Link
              key={plugin.pluginId}
              to={`/plugins/${plugin.pluginId}`}
              className="panel group"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 flex items-center justify-center"
                    style={{ 
                      backgroundColor: 'var(--bg-tertiary)', 
                      borderRadius: 'var(--radius-sm)' 
                    }}
                  >
                    <Puzzle className="h-5 w-5" style={{ color: 'var(--interactive-primary)' }} />
                  </div>
                  <div>
                    <h3 
                      className="text-sm font-semibold group-hover:underline"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {plugin.title || plugin.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span 
                        className="text-xs font-medium uppercase"
                        style={getPluginTypeStyle(plugin.type)}
                      >
                        {plugin.type}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>•</span>
                      <span 
                        className="text-xs font-mono"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        v{plugin.version}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight 
                  className="h-4 w-4 opacity-50 group-hover:opacity-100"
                  style={{ color: 'var(--text-muted)' }}
                />
              </div>
              
              {plugin.description && (
                <p 
                  className="mt-3 text-xs line-clamp-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {plugin.description}
                </p>
              )}
              
              <div className="mt-3 flex items-center justify-between">
                <span 
                  className="text-xs font-mono"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {plugin.pluginId}
                </span>
                {plugin.hasFrontend && (
                  <span className="badge-muted text-xs">UI</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
