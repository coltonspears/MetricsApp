import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Puzzle, Search, Package, RefreshCw, ChevronRight, AlertCircle, 
  Database, LayoutDashboard, Settings, Shield, Bell, HardDrive,
  CheckCircle2, XCircle, Clock, Zap, Filter, Route
} from 'lucide-react'
import { PluginSummaryDto, LoadedPluginDto, CAPABILITY_INFO, STATE_COLORS, PluginState } from '../plugins/types'
import { loadPluginSummaries, loadLoadedPlugins, loadDataSourcePlugins, loadDashboardPanels } from '../plugins/api'
import PageHeader from '../components/PageHeader'

type ViewMode = 'all' | 'loaded' | 'datasources' | 'panels';

const CapabilityIcon = ({ capability }: { capability: string }) => {
  const cap = capability.toLowerCase();
  const iconClass = "h-3.5 w-3.5";
  
  switch (cap) {
    case 'datasource': return <Database className={iconClass} />;
    case 'dashboard': return <LayoutDashboard className={iconClass} />;
    case 'setup': return <Settings className={iconClass} />;
    case 'authentication': return <Shield className={iconClass} />;
    case 'alertchannel': return <Bell className={iconClass} />;
    case 'persistence': return <HardDrive className={iconClass} />;
    case 'routes': return <Route className={iconClass} />;
    default: return <Zap className={iconClass} />;
  }
};

const StateIcon = ({ state }: { state: PluginState }) => {
  const iconClass = "h-3.5 w-3.5";
  switch (state) {
    case 'Running': return <CheckCircle2 className={iconClass} style={{ color: STATE_COLORS.Running }} />;
    case 'Error': return <XCircle className={iconClass} style={{ color: STATE_COLORS.Error }} />;
    case 'Loaded': return <Clock className={iconClass} style={{ color: STATE_COLORS.Loaded }} />;
    case 'Disabled': return <XCircle className={iconClass} style={{ color: STATE_COLORS.Disabled }} />;
    default: return <Clock className={iconClass} style={{ color: STATE_COLORS.Discovered }} />;
  }
};

export default function PluginsListPage() {
  const [plugins, setPlugins] = useState<PluginSummaryDto[]>([])
  const [loadedPlugins, setLoadedPlugins] = useState<LoadedPluginDto[]>([])
  const [dataSources, setDataSources] = useState<Array<{ type: string; displayName: string; description?: string; icon?: string; categories?: string[] }>>([])
  const [panels, setPanels] = useState<Array<{ type: string; displayName: string; description?: string; icon?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null)

  const loadAllData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [pluginData, loadedData, dsData, panelData] = await Promise.all([
        loadPluginSummaries(),
        loadLoadedPlugins(),
        loadDataSourcePlugins(),
        loadDashboardPanels()
      ])
      setPlugins(pluginData)
      setLoadedPlugins(loadedData)
      setDataSources(dsData)
      setPanels(panelData)
    } catch (err) {
      setError('Failed to load plugins')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  // Filter plugins based on search and capability
  const filteredPlugins = plugins.filter(p => {
    const matchesSearch = 
      p.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.capabilities?.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.pluginId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (selectedCapability) {
      // Check both the plugin's capabilities and loaded plugin capabilities
      const loaded = loadedPlugins.find(lp => lp.pluginId === p.pluginId);
      const allCaps = [...(p.capabilities || []), ...(loaded?.capabilities || [])];
      return allCaps.some(c => c.toLowerCase() === selectedCapability.toLowerCase());
    }
    
    return true;
  });

  const filteredLoadedPlugins = loadedPlugins.filter(p => {
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pluginId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.capabilities?.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    if (selectedCapability) {
      return p.capabilities?.some(c => c.toLowerCase() === selectedCapability.toLowerCase());
    }
    
    return true;
  });

  // Get all unique capabilities from both manifests and loaded plugins
  const allCapabilities = [...new Set([
    ...plugins.flatMap(p => p.capabilities || []),
    ...loadedPlugins.flatMap(p => p.capabilities || [])
  ])];

  // Stats
  const runningCount = loadedPlugins.filter(p => p.state === 'Running').length;
  const errorCount = loadedPlugins.filter(p => p.state === 'Error').length;

  // Get primary capability for display
  const getPrimaryCapability = (capabilities: string[]): string | null => {
    const priority = ['datasource', 'dashboard', 'setup', 'authentication', 'alertchannel', 'persistence', 'routes'];
    for (const cap of priority) {
      if (capabilities.some(c => c.toLowerCase() === cap)) return cap;
    }
    return capabilities[0] || null;
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Plugins"
        description="Extend MetricsApp with data sources, dashboards, and more"
        meta={
          <div className="flex items-center gap-3">
            <span className="badge-muted">
              <Puzzle className="h-3 w-3" />
              {plugins.length} installed
            </span>
            {runningCount > 0 && (
              <span className="badge-muted" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--status-success)' }}>
                <CheckCircle2 className="h-3 w-3" />
                {runningCount} running
              </span>
            )}
            {errorCount > 0 && (
              <span className="badge-muted" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-error)' }}>
                <XCircle className="h-3 w-3" />
                {errorCount} errors
              </span>
            )}
          </div>
        }
        actions={
          <div className="flex gap-2">
            <button 
              onClick={loadAllData} 
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="panel p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <Database className="h-4 w-4" style={{ color: 'var(--status-info)' }} />
            </div>
            <div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{dataSources.length}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Data Sources</div>
            </div>
          </div>
        </div>
        <div className="panel p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <LayoutDashboard className="h-4 w-4" style={{ color: 'var(--status-success)' }} />
            </div>
            <div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{panels.length}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Dashboard Panels</div>
            </div>
          </div>
        </div>
        <div className="panel p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <Settings className="h-4 w-4" style={{ color: 'var(--status-warning)' }} />
            </div>
            <div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {loadedPlugins.filter(p => p.capabilities?.includes('setup')).length}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Setup Wizards</div>
            </div>
          </div>
        </div>
        <div className="panel p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <Zap className="h-4 w-4" style={{ color: 'var(--interactive-primary)' }} />
            </div>
            <div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{allCapabilities.length}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Capabilities</div>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {[
          { key: 'all', label: 'All Plugins', count: plugins.length },
          { key: 'loaded', label: 'Loaded', count: loadedPlugins.length },
          { key: 'datasources', label: 'Data Sources', count: dataSources.length },
          { key: 'panels', label: 'Panels', count: panels.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key as ViewMode)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewMode === tab.key 
                ? 'bg-[var(--bg-primary)] shadow-sm' 
                : 'hover:bg-[var(--bg-tertiary)]'
            }`}
            style={{ 
              color: viewMode === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)' 
            }}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Search & Filter Toolbar */}
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
          
          {/* Capability Filter */}
          {allCapabilities.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              <select
                value={selectedCapability || ''}
                onChange={(e) => setSelectedCapability(e.target.value || null)}
                className="input-themed text-sm py-1"
              >
                <option value="">All capabilities</option>
                {allCapabilities.map(cap => (
                  <option key={cap} value={cap}>
                    {CAPABILITY_INFO[cap.toLowerCase()]?.label || cap}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div 
          className="p-3 flex items-center gap-2 text-sm mb-4"
          style={{ 
            backgroundColor: 'var(--alert-error-bg)', 
            color: 'var(--alert-error-text)',
            borderLeft: '3px solid var(--alert-error-border)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <AlertCircle className="h-4 w-4" />
          {error}
          <button onClick={loadAllData} className="btn-themed-secondary btn-themed-sm ml-auto">
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

      {/* All Plugins View */}
      {!loading && viewMode === 'all' && (
        <>
          {filteredPlugins.length === 0 ? (
            <div className="panel flex flex-col items-center justify-center py-12">
              <Puzzle className="h-12 w-12 mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                {searchTerm ? 'No plugins match your search' : 'No plugins installed'}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {searchTerm ? 'Try adjusting your search terms.' : 'Browse the marketplace to find plugins.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlugins.map(plugin => {
                const loaded = loadedPlugins.find(lp => lp.pluginId === plugin.pluginId);
                const capabilities = plugin.capabilities || loaded?.capabilities || [];
                const primaryCap = getPrimaryCapability(capabilities);
                const capInfo = primaryCap ? CAPABILITY_INFO[primaryCap.toLowerCase()] : null;
                
                return (
                  <Link
                    key={plugin.pluginId}
                    to={`/plugins/${plugin.pluginId}`}
                    className="panel group hover:border-[var(--interactive-primary)] transition-colors"
                    style={{ textDecoration: 'none' }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 flex items-center justify-center"
                          style={{ 
                            backgroundColor: capInfo ? `${capInfo.color}15` : 'var(--bg-tertiary)', 
                            borderRadius: 'var(--radius-sm)' 
                          }}
                        >
                          {primaryCap ? (
                            <CapabilityIcon capability={primaryCap} />
                          ) : (
                            <Puzzle className="h-5 w-5" style={{ color: 'var(--interactive-primary)' }} />
                          )}
                        </div>
                        <div>
                          <h3 
                            className="text-sm font-semibold group-hover:text-[var(--interactive-primary)] transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {plugin.title || plugin.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {primaryCap && (
                              <span 
                                className="text-xs font-medium"
                                style={{ color: capInfo?.color || 'var(--text-muted)' }}
                              >
                                {capInfo?.label || primaryCap}
                              </span>
                            )}
                            {primaryCap && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>•</span>
                            )}
                            <span 
                              className="text-xs font-mono"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              v{plugin.version}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {loaded && <StateIcon state={loaded.state} />}
                        <ChevronRight 
                          className="h-4 w-4 opacity-50 group-hover:opacity-100"
                          style={{ color: 'var(--text-muted)' }}
                        />
                      </div>
                    </div>
                    
                    {plugin.description && (
                      <p 
                        className="mt-3 text-xs line-clamp-2"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {plugin.description}
                      </p>
                    )}
                    
                    {/* Capabilities */}
                    {capabilities.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {capabilities.map(cap => {
                          const info = CAPABILITY_INFO[cap.toLowerCase()];
                          return (
                            <span 
                              key={cap}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                              style={{ 
                                backgroundColor: 'var(--bg-tertiary)',
                                color: info?.color || 'var(--text-secondary)'
                              }}
                            >
                              <CapabilityIcon capability={cap} />
                              {info?.label || cap}
                            </span>
                          );
                        })}
                      </div>
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
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Loaded Plugins View */}
      {!loading && viewMode === 'loaded' && (
        <>
          {filteredLoadedPlugins.length === 0 ? (
            <div className="panel flex flex-col items-center justify-center py-12">
              <Puzzle className="h-12 w-12 mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                No loaded plugins
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Plugins need to be deployed to the Plugins folder.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLoadedPlugins.map(plugin => (
                <Link
                  key={plugin.pluginId}
                  to={`/plugins/${plugin.pluginId}`}
                  className="panel flex items-center gap-4 p-3 group hover:border-[var(--interactive-primary)] transition-colors"
                  style={{ textDecoration: 'none' }}
                >
                  <div className="flex items-center gap-2">
                    <StateIcon state={plugin.state} />
                    <span 
                      className="text-xs font-medium uppercase px-2 py-0.5 rounded"
                      style={{ 
                        backgroundColor: `${STATE_COLORS[plugin.state]}15`,
                        color: STATE_COLORS[plugin.state]
                      }}
                    >
                      {plugin.state}
                    </span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {plugin.title || plugin.name}
                      </h3>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        v{plugin.version}
                      </span>
                    </div>
                    <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                      {plugin.pluginId}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {plugin.capabilities?.map(cap => (
                      <span 
                        key={cap}
                        className="p-1 rounded"
                        style={{ backgroundColor: 'var(--bg-tertiary)' }}
                        title={CAPABILITY_INFO[cap.toLowerCase()]?.label || cap}
                      >
                        <CapabilityIcon capability={cap} />
                      </span>
                    ))}
                  </div>
                  
                  {plugin.error && (
                    <span className="text-xs text-red-500 truncate max-w-xs" title={plugin.error}>
                      {plugin.error}
                    </span>
                  )}
                  
                  <ChevronRight className="h-4 w-4 opacity-50" style={{ color: 'var(--text-muted)' }} />
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Data Sources View */}
      {!loading && viewMode === 'datasources' && (
        <>
          {dataSources.length === 0 ? (
            <div className="panel flex flex-col items-center justify-center py-12">
              <Database className="h-12 w-12 mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                No data source plugins
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Install plugins that provide data source capabilities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataSources.map(ds => (
                <div key={ds.type} className="panel">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 flex items-center justify-center"
                      style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}
                    >
                      <Database className="h-5 w-5" style={{ color: 'var(--status-info)' }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {ds.displayName}
                      </h3>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {ds.type}
                      </span>
                    </div>
                  </div>
                  {ds.description && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {ds.description}
                    </p>
                  )}
                  {ds.categories && ds.categories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ds.categories.map(cat => (
                        <span key={cat} className="badge-muted text-xs">{cat}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Panels View */}
      {!loading && viewMode === 'panels' && (
        <>
          {panels.length === 0 ? (
            <div className="panel flex flex-col items-center justify-center py-12">
              <LayoutDashboard className="h-12 w-12 mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
              <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                No dashboard panels
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Install plugins that provide dashboard panel types.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {panels.map(panel => (
                <div key={panel.type} className="panel">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 flex items-center justify-center"
                      style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}
                    >
                      <LayoutDashboard className="h-5 w-5" style={{ color: 'var(--status-success)' }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {panel.displayName}
                      </h3>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {panel.type}
                      </span>
                    </div>
                  </div>
                  {panel.description && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {panel.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
