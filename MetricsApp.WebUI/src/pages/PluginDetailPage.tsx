import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Puzzle, ArrowLeft, Tag, User, ExternalLink, Settings, RefreshCw, AlertCircle, Globe, Mail } from 'lucide-react'
import { PluginManifest } from '../plugins/types'
import { loadPluginManifest } from '../plugins/api'
import PluginHost from '../components/PluginHost'
import PageHeader from '../components/PageHeader'

export default function PluginDetailPage() {
  const { pluginId } = useParams<{ pluginId: string }>()
  const [manifest, setManifest] = useState<PluginManifest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (pluginId) {
      setLoading(true)
      setError(null)
      loadPluginManifest(pluginId)
        .then(data => setManifest(data))
        .catch(err => {
          setError('Failed to load plugin')
          console.error(err)
        })
        .finally(() => setLoading(false))
    }
  }, [pluginId])

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
            <button className="btn-themed-secondary">
              <Settings className="h-4 w-4" />
              Configure
            </button>
            <button className="btn-themed-secondary">
              <RefreshCw className="h-4 w-4" />
              Update
            </button>
            {manifest.author?.homepage && (
              <a 
                href={manifest.author.homepage} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-themed-primary"
              >
                <ExternalLink className="h-4 w-4" />
                Docs
              </a>
            )}
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-muted">
            <Tag className="h-3 w-3" />
            {manifest.type}
          </span>
          <span className="badge-muted font-mono">
            v{manifest.version}
          </span>
          {manifest.author?.name && (
            <span className="badge-muted">
              <User className="h-3 w-3" />
              {manifest.author.name}
            </span>
          )}
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
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
                No UI Available
              </h3>
              <p 
                className="text-sm text-center max-w-md"
                style={{ color: 'var(--text-secondary)' }}
              >
                This plugin provides backend functionality or API extensions only.
              </p>
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
                <label 
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Plugin ID
                </label>
                <p 
                  className="mt-0.5 text-sm font-mono"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {manifest.pluginId}
                </p>
              </div>
              <div>
                <label 
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Version
                </label>
                <p 
                  className="mt-0.5 text-sm"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {manifest.version}
                </p>
              </div>
              <div>
                <label 
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Type
                </label>
                <p 
                  className="mt-0.5 text-sm capitalize"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {manifest.type}
                </p>
              </div>
              {manifest.entry?.assembly && (
                <div>
                  <label 
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Assembly
                  </label>
                  <p 
                    className="mt-0.5 text-sm font-mono"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {manifest.entry.assembly}
                  </p>
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

          {/* Tags */}
          {manifest.tags && manifest.tags.length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {manifest.tags.map(tag => (
                  <span key={tag} className="badge-muted">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {manifest.dependencies && Object.keys(manifest.dependencies).length > 0 && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Dependencies</h3>
              </div>
              <div className="space-y-1">
                {Object.entries(manifest.dependencies).map(([name, version]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text-primary)' }}>{name}</span>
                    <span 
                      className="font-mono"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {version}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assets */}
          {manifest.assets && (manifest.assets.dashboards?.length || manifest.assets.monitors?.length) && (
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Assets</h3>
              </div>
              <div className="space-y-2">
                {manifest.assets.dashboards && manifest.assets.dashboards.length > 0 && (
                  <div>
                    <label 
                      className="text-xs font-medium"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Dashboards ({manifest.assets.dashboards.length})
                    </label>
                  </div>
                )}
                {manifest.assets.monitors && manifest.assets.monitors.length > 0 && (
                  <div>
                    <label 
                      className="text-xs font-medium"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Monitors ({manifest.assets.monitors.length})
                    </label>
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
