import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { 
  Puzzle, ArrowLeft, Tag, User, ExternalLink, Settings, RefreshCw, AlertCircle, 
  Globe, Mail, Database, LayoutDashboard, Shield, Bell, Route, Package,
  CheckCircle2, XCircle, Clock, GitBranch, FileCode, Lock, Zap, HardDrive,
  Power, PowerOff, Plus, Eye, ChevronRight, Activity, BarChart3, FileJson,
  Copy, Check
} from 'lucide-react'
import { 
  PluginManifest, CAPABILITY_INFO, LoadedPluginDto, STATE_COLORS, 
  PluginState, STATE_DESCRIPTIONS, CapabilityUsage 
} from '../plugins/types'
import { 
  loadPluginManifest, loadLoadedPlugins, enablePlugin, disablePlugin, 
  reloadPlugin, getPluginCapabilityUsage 
} from '../plugins/api'
import PluginHost from '../components/PluginHost'
import PageHeader from '../components/PageHeader'

const CapabilityIcon = ({ capability, size = 'sm' }: { capability: string; size?: 'sm' | 'md' | 'lg' }) => {
  const cap = capability.toLowerCase();
  const sizeClasses = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };
  const iconClass = sizeClasses[size];
  
  switch (cap) {
    case 'datasource': return <Database className={iconClass} />;
    case 'dashboard': return <LayoutDashboard className={iconClass} />;
    case 'setup': return <Settings className={iconClass} />;
    case 'authentication': return <Shield className={iconClass} />;
    case 'alertchannel': return <Bell className={iconClass} />;
    case 'routes': return <Route className={iconClass} />;
    case 'persistence': return <HardDrive className={iconClass} />;
    default: return <Zap className={iconClass} />;
  }
};

const StateIcon = ({ state }: { state: PluginState }) => {
  const iconClass = "h-4 w-4";
  switch (state) {
    case 'Running': return <CheckCircle2 className={iconClass} style={{ color: STATE_COLORS.Running }} />;
    case 'Error': return <XCircle className={iconClass} style={{ color: STATE_COLORS.Error }} />;
    case 'Loaded': return <Clock className={iconClass} style={{ color: STATE_COLORS.Loaded }} />;
    case 'Disabled': return <PowerOff className={iconClass} style={{ color: STATE_COLORS.Disabled }} />;
    default: return <Clock className={iconClass} style={{ color: STATE_COLORS.Discovered }} />;
  }
};

// Copy button component
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button 
      onClick={handleCopy}
      className="p-1 rounded hover:bg-white/10 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3" style={{ color: 'var(--status-success)' }} />
      ) : (
        <Copy className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
      )}
    </button>
  );
};

export default function PluginDetailPage() {
  const { pluginId } = useParams<{ pluginId: string }>()
  const navigate = useNavigate()
  const [manifest, setManifest] = useState<PluginManifest | null>(null)
  const [loadedPlugin, setLoadedPlugin] = useState<LoadedPluginDto | null>(null)
  const [capabilityUsage, setCapabilityUsage] = useState<CapabilityUsage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'exports' | 'settings' | 'usage'>('overview')

  const loadData = useCallback(async () => {
    if (!pluginId) return;
    
    setLoading(true)
    setError(null)
    
    try {
      const [manifestData, loadedPlugins] = await Promise.all([
        loadPluginManifest(pluginId),
        loadLoadedPlugins()
      ]);
      
      setManifest(manifestData)
      const loaded = loadedPlugins.find(p => p.pluginId === pluginId)
      setLoadedPlugin(loaded || null)
      
      // Load capability usage if manifest is available
      if (manifestData) {
        const usage = await getPluginCapabilityUsage(pluginId, manifestData);
        setCapabilityUsage(usage);
      }
    } catch (err) {
      setError('Failed to load plugin')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [pluginId]);

  useEffect(() => {
    loadData();
  }, [loadData])

  const handleEnable = async () => {
    if (!pluginId) return;
    setActionLoading('enable');
    const success = await enablePlugin(pluginId);
    if (success) {
      await loadData();
    }
    setActionLoading(null);
  };

  const handleDisable = async () => {
    if (!pluginId) return;
    setActionLoading('disable');
    const success = await disablePlugin(pluginId);
    if (success) {
      await loadData();
    }
    setActionLoading(null);
  };

  const handleReload = async () => {
    if (!pluginId) return;
    setActionLoading('reload');
    const success = await reloadPlugin(pluginId);
    if (success) {
      await loadData();
    }
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3">
            <div 
              className="animate-spin rounded-full h-8 w-8 border-2 border-b-transparent"
              style={{ borderColor: 'var(--interactive-primary)', borderBottomColor: 'transparent' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading plugin...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error || !manifest) {
    return (
      <div className="page-shell">
        <div className="panel flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 mb-3 opacity-50" style={{ color: 'var(--status-error)' }} />
          <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            Plugin not found
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            The plugin "{pluginId}" could not be loaded.
          </p>
          <Link to="/plugins" className="btn-themed-primary">
            <ArrowLeft className="h-4 w-4" />
            Back to Plugins
          </Link>
        </div>
      </div>
    )
  }

  const hasUI = manifest.entry?.frontendBundle || manifest.bundleUrl
  const capabilities = manifest.capabilities || loadedPlugin?.capabilities || []
  const isDisabled = loadedPlugin?.state === 'Disabled'

  // Calculate total usage across all capabilities
  const totalUsage = capabilityUsage.reduce((sum, u) => sum + u.count, 0);

  return (
    <div className="page-shell">
      <PageHeader
        title={manifest.title || manifest.name}
        description={manifest.description}
        meta={
          <Link 
            to="/plugins" 
            className="badge-muted"
            style={{ textDecoration: 'none' }}
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Plugins
          </Link>
        }
        actions={
          <div className="flex gap-2">
            {loadedPlugin && (
              <>
                {isDisabled ? (
                  <button 
                    className="btn-themed-primary"
                    onClick={handleEnable}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'enable' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                    Enable
                  </button>
                ) : (
                  <button 
                    className="btn-themed-secondary"
                    onClick={handleDisable}
                    disabled={actionLoading !== null}
                  >
                    {actionLoading === 'disable' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <PowerOff className="h-4 w-4" />
                    )}
                    Disable
                  </button>
                )}
              </>
            )}
            <button 
              className="btn-themed-secondary"
              onClick={handleReload}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'reload' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Reload
            </button>
            <button className="btn-themed-secondary">
              <Settings className="h-4 w-4" />
              Configure
            </button>
            {manifest.author?.homepage && (
              <a 
                href={manifest.author.homepage} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-themed-secondary"
              >
                <ExternalLink className="h-4 w-4" />
                Docs
              </a>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Plugin State */}
          {loadedPlugin && (
            <span 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: `${STATE_COLORS[loadedPlugin.state]}15`,
                color: STATE_COLORS[loadedPlugin.state],
                border: `1px solid ${STATE_COLORS[loadedPlugin.state]}30`
              }}
              title={STATE_DESCRIPTIONS[loadedPlugin.state]}
            >
              <StateIcon state={loadedPlugin.state} />
              {loadedPlugin.state}
            </span>
          )}
          <span className="badge-muted font-mono">
            v{manifest.version}
          </span>
          {manifest.license && (
            <span className="badge-muted">
              <FileCode className="h-3 w-3" />
              {manifest.license}
            </span>
          )}
          {manifest.author?.name && (
            <span className="badge-muted">
              <User className="h-3 w-3" />
              {manifest.author.name}
            </span>
          )}
          {totalUsage > 0 && (
            <span 
              className="badge-muted"
              style={{ backgroundColor: 'var(--status-success)15', color: 'var(--status-success)' }}
            >
              <Activity className="h-3 w-3" />
              {totalUsage} active {totalUsage === 1 ? 'instance' : 'instances'}
            </span>
          )}
        </div>
      </PageHeader>

      {/* Error Alert */}
      {loadedPlugin?.error && (
        <div 
          className="p-3 mb-4 flex items-start gap-2 text-sm rounded-lg"
          style={{ 
            backgroundColor: 'var(--alert-error-bg)', 
            color: 'var(--alert-error-text)',
            border: '1px solid var(--alert-error-border)'
          }}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">Plugin Error</div>
            <div className="mt-1 opacity-90 font-mono text-xs">{loadedPlugin.error}</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {[
          { id: 'overview', label: 'Overview', icon: Eye },
          { id: 'exports', label: 'Exports', icon: Package },
          { id: 'usage', label: 'Usage', icon: BarChart3 },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? '' : 'hover:bg-white/5'
            }`}
            style={{
              backgroundColor: activeTab === tab.id ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {activeTab === 'overview' && (
            <>
              {/* Capabilities */}
              {capabilities.length > 0 && (
                <div className="panel">
                  <div className="panel-header">
                    <h3 className="panel-title">Capabilities</h3>
                    <span className="badge-muted text-xs">{capabilities.length} total</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {capabilities.map(cap => {
                      const info = CAPABILITY_INFO[cap.toLowerCase()];
                      const usage = capabilityUsage.find(u => u.capability === cap.toLowerCase());
                      return (
                        <div 
                          key={cap}
                          className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-white/5"
                          style={{ backgroundColor: 'var(--bg-tertiary)' }}
                        >
                          <div 
                            className="w-10 h-10 flex items-center justify-center rounded-lg flex-shrink-0"
                            style={{ backgroundColor: `${info?.color || 'var(--text-muted)'}15` }}
                          >
                            <CapabilityIcon capability={cap} size="lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: info?.color || 'var(--text-primary)' }}>
                                {info?.label || cap}
                              </span>
                              {usage && usage.count > 0 && (
                                <span 
                                  className="text-xs px-1.5 py-0.5 rounded"
                                  style={{ backgroundColor: 'var(--status-success)15', color: 'var(--status-success)' }}
                                >
                                  {usage.count} in use
                                </span>
                              )}
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {info?.description || 'Plugin capability'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              {manifest.exports && (
                <div className="panel">
                  <div className="panel-header">
                    <h3 className="panel-title">Quick Actions</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {manifest.exports.datasources && manifest.exports.datasources.length > 0 && (
                      <button
                        onClick={() => navigate('/connections/new')}
                        className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02]"
                        style={{ 
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-primary)'
                        }}
                      >
                        <div 
                          className="w-10 h-10 flex items-center justify-center rounded-lg"
                          style={{ backgroundColor: 'var(--status-info)15' }}
                        >
                          <Plus className="h-5 w-5" style={{ color: 'var(--status-info)' }} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            Add Data Source
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Create new connection
                          </div>
                        </div>
                      </button>
                    )}
                    {manifest.exports.routes && manifest.exports.routes.length > 0 && (
                      <button
                        onClick={() => {
                          const firstRoute = manifest.exports?.routes?.[0];
                          if (firstRoute) navigate(firstRoute.path);
                        }}
                        className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02]"
                        style={{ 
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-primary)'
                        }}
                      >
                        <div 
                          className="w-10 h-10 flex items-center justify-center rounded-lg"
                          style={{ backgroundColor: 'var(--interactive-primary)15' }}
                        >
                          <Route className="h-5 w-5" style={{ color: 'var(--interactive-primary)' }} />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            Open Plugin
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Go to plugin page
                          </div>
                        </div>
                      </button>
                    )}
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02]"
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-primary)'
                      }}
                    >
                      <div 
                        className="w-10 h-10 flex items-center justify-center rounded-lg"
                        style={{ backgroundColor: 'var(--status-warning)15' }}
                      >
                        <Settings className="h-5 w-5" style={{ color: 'var(--status-warning)' }} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Configure
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Plugin settings
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Plugin UI */}
              {hasUI ? (
                <div className="panel">
                  <div className="panel-header">
                    <h3 className="panel-title">Plugin Interface</h3>
                  </div>
                  <PluginHost
                    pluginId={manifest.pluginId}
                    bundleUrl={manifest.entry?.frontendBundle || manifest.bundleUrl || ''}
                  />
                </div>
              ) : (
                <div className="panel flex flex-col items-center justify-center py-12">
                  <Puzzle 
                    className="h-12 w-12 mb-3 opacity-30" 
                    style={{ color: 'var(--text-muted)' }} 
                  />
                  <h3 
                    className="text-base font-medium mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Backend Plugin
                  </h3>
                  <p 
                    className="text-sm text-center max-w-md"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    This plugin provides backend functionality. Use the exports above to interact with its features.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'exports' && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Plugin Exports</h3>
              </div>
              
              {!manifest.exports ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    This plugin does not export any components
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Data Sources */}
                  {manifest.exports.datasources && manifest.exports.datasources.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Database className="h-3.5 w-3.5" />
                        Data Sources ({manifest.exports.datasources.length})
                      </h4>
                      <div className="space-y-2">
                        {manifest.exports.datasources.map(ds => {
                          const usage = capabilityUsage.find(u => u.capability === 'datasource');
                          const dsUsage = usage?.items.filter(i => i.type?.toLowerCase() === ds.type.toLowerCase()) || [];
                          return (
                            <div 
                              key={ds.type}
                              className="p-4 rounded-lg"
                              style={{ backgroundColor: 'var(--bg-tertiary)' }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                  <div 
                                    className="w-10 h-10 flex items-center justify-center rounded-lg"
                                    style={{ backgroundColor: 'var(--status-info)15' }}
                                  >
                                    <Database className="h-5 w-5" style={{ color: 'var(--status-info)' }} />
                                  </div>
                                  <div>
                                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {ds.displayName}
                                    </div>
                                    <div className="text-xs font-mono mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                      {ds.type}
                                      <CopyButton text={ds.type} />
                                    </div>
                                    {ds.description && (
                                      <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                                        {ds.description}
                                      </p>
                                    )}
                                    {ds.categories && ds.categories.length > 0 && (
                                      <div className="flex gap-1 mt-2">
                                        {ds.categories.map(cat => (
                                          <span key={cat} className="badge-muted text-xs">{cat}</span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  {dsUsage.length > 0 && (
                                    <span 
                                      className="text-xs px-2 py-1 rounded"
                                      style={{ backgroundColor: 'var(--status-success)15', color: 'var(--status-success)' }}
                                    >
                                      {dsUsage.length} configured
                                    </span>
                                  )}
                                  <button
                                    onClick={() => navigate('/connections/add')}
                                    className="btn-themed-primary text-xs py-1.5 px-3"
                                  >
                                    <Plus className="h-3 w-3" />
                                    Add
                                  </button>
                                </div>
                              </div>
                              {dsUsage.length > 0 && (
                                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-secondary)' }}>
                                  <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                                    Active Connections
                                  </div>
                                  <div className="space-y-1">
                                    {dsUsage.slice(0, 3).map(item => (
                                      <Link
                                        key={item.id}
                                        to={`/connections/${item.id}`}
                                        className="flex items-center gap-2 text-sm hover:underline"
                                        style={{ color: 'var(--interactive-primary)' }}
                                      >
                                        <ChevronRight className="h-3 w-3" />
                                        {item.name}
                                      </Link>
                                    ))}
                                    {dsUsage.length > 3 && (
                                      <Link
                                        to="/connections"
                                        className="text-xs"
                                        style={{ color: 'var(--text-muted)' }}
                                      >
                                        +{dsUsage.length - 3} more
                                      </Link>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Dashboard Panels */}
                  {manifest.exports.dashboardPanels && manifest.exports.dashboardPanels.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        Dashboard Panels ({manifest.exports.dashboardPanels.length})
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {manifest.exports.dashboardPanels.map(panel => (
                          <div 
                            key={panel.type}
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                          >
                            <div className="flex items-center gap-2">
                              <LayoutDashboard className="h-4 w-4" style={{ color: 'var(--status-success)' }} />
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {panel.displayName}
                              </span>
                            </div>
                            <div className="text-xs font-mono mt-1 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                              {panel.type}
                              <CopyButton text={panel.type} />
                            </div>
                            {panel.description && (
                              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                                {panel.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Routes */}
                  {manifest.exports.routes && manifest.exports.routes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Route className="h-3.5 w-3.5" />
                        Routes ({manifest.exports.routes.length})
                      </h4>
                      <div className="space-y-2">
                        {manifest.exports.routes.map(route => (
                          <div 
                            key={route.path}
                            className="flex items-center justify-between p-3 rounded-lg"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                          >
                            <div className="flex items-center gap-3">
                              <Route className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                              <div>
                                <div className="text-sm font-mono flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                                  {route.path}
                                  <CopyButton text={route.path} />
                                </div>
                                {route.title && (
                                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {route.title}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {route.requiresAuth === false && (
                                <span className="badge-muted text-xs">Public</span>
                              )}
                              <Link
                                to={route.path}
                                className="btn-themed-secondary text-xs py-1.5 px-3"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Open
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auth Providers */}
                  {manifest.exports.authProviders && manifest.exports.authProviders.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Shield className="h-3.5 w-3.5" />
                        Auth Providers ({manifest.exports.authProviders.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {manifest.exports.authProviders.map(auth => (
                          <div 
                            key={auth.id}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                          >
                            <Shield className="h-4 w-4" style={{ color: 'var(--interactive-primary)' }} />
                            <div>
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {auth.displayName}
                              </span>
                              <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                {auth.id}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alert Channels */}
                  {manifest.exports.alertChannels && manifest.exports.alertChannels.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Bell className="h-3.5 w-3.5" />
                        Alert Channels ({manifest.exports.alertChannels.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {manifest.exports.alertChannels.map(channel => (
                          <div 
                            key={channel.type}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                          >
                            <Bell className="h-4 w-4" style={{ color: 'var(--status-warning)' }} />
                            <div>
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {channel.displayName}
                              </span>
                              <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                {channel.type}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Usage Statistics</h3>
                <span 
                  className="text-xs px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: totalUsage > 0 ? 'var(--status-success)15' : 'var(--bg-tertiary)',
                    color: totalUsage > 0 ? 'var(--status-success)' : 'var(--text-muted)'
                  }}
                >
                  {totalUsage} total {totalUsage === 1 ? 'instance' : 'instances'}
                </span>
              </div>
              
              {capabilityUsage.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                  <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    No Active Usage
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    This plugin's capabilities are not currently in use
                  </p>
                  {manifest.exports?.datasources && manifest.exports.datasources.length > 0 && (
                    <button
                      onClick={() => navigate('/connections/new')}
                      className="btn-themed-primary mt-4"
                    >
                      <Plus className="h-4 w-4" />
                      Create First Connection
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {capabilityUsage.map(usage => {
                    const info = CAPABILITY_INFO[usage.capability];
                    return (
                      <div key={usage.capability} className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-8 h-8 flex items-center justify-center rounded"
                              style={{ backgroundColor: `${info?.color || 'var(--text-muted)'}15` }}
                            >
                              <CapabilityIcon capability={usage.capability} size="md" />
                            </div>
                            <div>
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                {info?.label || usage.capability}
                              </span>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {usage.count} {usage.count === 1 ? 'instance' : 'instances'}
                              </div>
                            </div>
                          </div>
                          <Link
                            to="/connections"
                            className="text-xs"
                            style={{ color: 'var(--interactive-primary)' }}
                          >
                            View all →
                          </Link>
                        </div>
                        <div className="space-y-2">
                          {usage.items.map(item => (
                            <Link
                              key={item.id}
                              to={`/connections/${item.id}`}
                              className="flex items-center justify-between p-2 rounded hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Activity className="h-3 w-3" style={{ color: 'var(--status-success)' }} />
                                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                  {item.name}
                                </span>
                              </div>
                              <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Plugin Settings</h3>
              </div>
              
              {manifest.settings?.schema ? (
                <div className="space-y-4">
                  <div 
                    className="p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <h4 className="text-xs font-medium uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                      <FileJson className="h-3.5 w-3.5" />
                      Configuration Schema
                    </h4>
                    <pre 
                      className="text-xs font-mono p-3 rounded overflow-x-auto"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                    >
                      {JSON.stringify(manifest.settings.schema, null, 2)}
                    </pre>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Plugin configuration can be managed through the application settings or API.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Settings className="h-12 w-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
                  <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    No Configuration
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    This plugin does not require any configuration
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Plugin Info */}
          <div className="panel">
            <div className="panel-header">
              <h3 className="panel-title">Information</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Plugin ID
                </label>
                <p className="mt-0.5 text-sm font-mono flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                  {manifest.pluginId}
                  <CopyButton text={manifest.pluginId} />
                </p>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Name
                </label>
                <p className="mt-0.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {manifest.name}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Version
                </label>
                <p className="mt-0.5 text-sm font-mono" style={{ color: 'var(--text-primary)' }}>
                  {manifest.version}
                </p>
              </div>
              {capabilities.length > 0 && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Capabilities
                  </label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {capabilities.map(cap => {
                      const info = CAPABILITY_INFO[cap.toLowerCase()];
                      return (
                        <span 
                          key={cap}
                          className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                          style={{ 
                            backgroundColor: `${info?.color || 'var(--text-muted)'}15`,
                            color: info?.color || 'var(--text-muted)'
                          }}
                        >
                          <CapabilityIcon capability={cap} size="sm" />
                          {info?.label || cap}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {manifest.entry?.assembly && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Assembly
                  </label>
                  <p className="mt-0.5 text-xs font-mono truncate flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                    {manifest.entry.assembly}
                    <CopyButton text={manifest.entry.assembly} />
                  </p>
                </div>
              )}
              {manifest.repository && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Repository
                  </label>
                  <a 
                    href={manifest.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 text-sm flex items-center gap-1"
                    style={{ color: 'var(--interactive-primary)' }}
                  >
                    <GitBranch className="h-3 w-3" />
                    View Source
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Author Info */}
          {manifest.author && (manifest.author.name || manifest.author.email || manifest.author.homepage) && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Author</h3>
              </div>
              <div className="space-y-2">
                {manifest.author.name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <span style={{ color: 'var(--text-primary)' }}>{manifest.author.name}</span>
                  </div>
                )}
                {manifest.author.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <a 
                      href={`mailto:${manifest.author.email}`}
                      style={{ color: 'var(--interactive-primary)' }}
                    >
                      {manifest.author.email}
                    </a>
                  </div>
                )}
                {manifest.author.homepage && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                    <a 
                      href={manifest.author.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--interactive-primary)' }}
                    >
                      Website
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {manifest.dependencies && (manifest.dependencies.plugins || manifest.dependencies.platform) && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Dependencies</h3>
              </div>
              <div className="space-y-3">
                {manifest.dependencies.platform && Object.keys(manifest.dependencies.platform).length > 0 && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Platform
                    </label>
                    <div className="mt-1 space-y-1">
                      {Object.entries(manifest.dependencies.platform).map(([name, version]) => (
                        <div key={name} className="flex items-center justify-between text-sm">
                          <span style={{ color: 'var(--text-primary)' }}>{name}</span>
                          <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                            {version}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {manifest.dependencies.plugins && Object.keys(manifest.dependencies.plugins).length > 0 && (
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Plugins
                    </label>
                    <div className="mt-1 space-y-1">
                      {Object.entries(manifest.dependencies.plugins).map(([name, spec]) => {
                        const isOptional = typeof spec === 'object' && spec.optional;
                        const version = typeof spec === 'string' ? spec : spec.version;
                        return (
                          <div key={name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                              <span style={{ color: 'var(--text-primary)' }}>{name}</span>
                              {isOptional && (
                                <span className="text-xs px-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                                  optional
                                </span>
                              )}
                            </div>
                            <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                              {version}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Permissions */}
          {manifest.permissions && manifest.permissions.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Permissions</h3>
              </div>
              <div className="space-y-1">
                {manifest.permissions.map(perm => (
                  <div key={perm} className="flex items-center gap-2 text-sm">
                    <Lock className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                    <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{perm}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {manifest.tags && manifest.tags.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {manifest.tags.map(tag => (
                  <span key={tag} className="badge-muted">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Assets */}
          {manifest.assets && (manifest.assets.dashboards?.length || manifest.assets.monitors?.length || manifest.assets.alerts?.length) && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Bundled Assets</h3>
              </div>
              <div className="space-y-3">
                {manifest.assets.dashboards && manifest.assets.dashboards.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" style={{ color: 'var(--status-success)' }} />
                        <span style={{ color: 'var(--text-primary)' }}>Dashboards</span>
                      </div>
                      <span className="badge-muted">{manifest.assets.dashboards.length}</span>
                    </div>
                    <div className="space-y-1 pl-6">
                      {manifest.assets.dashboards.map((path, i) => {
                        const filename = path.split('/').pop() || path;
                        return (
                          <div key={i} className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                            {filename}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {manifest.assets.alerts && manifest.assets.alerts.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" style={{ color: 'var(--status-warning)' }} />
                        <span style={{ color: 'var(--text-primary)' }}>Alert Rules</span>
                      </div>
                      <span className="badge-muted">{manifest.assets.alerts.length}</span>
                    </div>
                    <div className="space-y-1 pl-6">
                      {manifest.assets.alerts.map((path, i) => {
                        const filename = path.split('/').pop() || path;
                        return (
                          <div key={i} className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                            {filename}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {manifest.assets.monitors && manifest.assets.monitors.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" style={{ color: 'var(--status-error)' }} />
                        <span style={{ color: 'var(--text-primary)' }}>Monitors</span>
                      </div>
                      <span className="badge-muted">{manifest.assets.monitors.length}</span>
                    </div>
                    <div className="space-y-1 pl-6">
                      {manifest.assets.monitors.map((path, i) => {
                        const filename = path.split('/').pop() || path;
                        return (
                          <div key={i} className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                            {filename}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
