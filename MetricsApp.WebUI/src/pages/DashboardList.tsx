import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard,
  Plus,
  Search,
  Star,
  Clock,
  Folder,
  FolderPlus,
  Grid3X3,
  List,
  ChevronRight,
  MoreVertical,
  Copy,
  Download,
  Trash2,
  Edit3,
  Tag,
  Filter,
  SlidersHorizontal,
  FileDown,
  Upload,
  Package,
  Sparkles,
  RefreshCw
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import {
  DashboardApi,
  type DashboardTemplate,
  type DashboardInstance,
  type DashboardFolder
} from '../lib/dashboard-api'

type ViewMode = 'grid' | 'list'
type Tab = 'dashboards' | 'templates' | 'starred'

const DashboardList = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Current tenant (would come from context in a real app)
  const tenantId = 'default'

  // Data state
  const [dashboards, setDashboards] = useState<DashboardInstance[]>([])
  const [templates, setTemplates] = useState<DashboardTemplate[]>([])
  const [folders, setFolders] = useState<DashboardFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>(searchParams.get('tab') as Tab || 'dashboards')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [templateCategories, setTemplateCategories] = useState<string[]>([])

  // Modal state
  const [showNewDashboard, setShowNewDashboard] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [createFromTemplate, setCreateFromTemplate] = useState<DashboardTemplate | null>(null)

  // Load data
  useEffect(() => {
    loadData()
  }, [tenantId])

  useEffect(() => {
    setSearchParams({ tab: activeTab })
  }, [activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [dashboardsData, templatesData, foldersData, categoriesData] = await Promise.all([
        DashboardApi.getInstances({ tenantId }),
        DashboardApi.getTemplates(),
        DashboardApi.getFolders(tenantId),
        DashboardApi.getTemplateCategories()
      ])

      setDashboards(dashboardsData)
      setTemplates(templatesData)
      setFolders(foldersData)
      setTemplateCategories(categoriesData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      // Use mock data on error
      setTemplates([
        {
          id: 'system-overview',
          name: 'System Overview',
          description: 'Monitor CPU, memory, disk, and network metrics',
          version: '1.0.0',
          author: 'MetricsApp',
          tags: ['infrastructure', 'system'],
          category: 'Infrastructure',
          isSystem: true,
          isPublished: true,
          requiredDataSourceTypes: ['prometheus'],
          variables: [],
          panels: [],
          defaultTimeRange: { from: 'now-1h', to: 'now' },
          refreshIntervalSeconds: 30,
          layout: { columns: 24, rowHeight: 30, draggable: true, resizable: true },
          annotations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'application-metrics',
          name: 'Application Metrics',
          description: 'Monitor request rates, latency, and errors',
          version: '1.0.0',
          author: 'MetricsApp',
          tags: ['application', 'apm'],
          category: 'Application',
          isSystem: true,
          isPublished: true,
          requiredDataSourceTypes: ['prometheus'],
          variables: [],
          panels: [],
          defaultTimeRange: { from: 'now-1h', to: 'now' },
          refreshIntervalSeconds: 30,
          layout: { columns: 24, rowHeight: 30, draggable: true, resizable: true },
          annotations: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ])
      setTemplateCategories(['Infrastructure', 'Application', 'Database'])
    } finally {
      setLoading(false)
    }
  }

  // Filter dashboards
  const filteredDashboards = dashboards.filter(d => {
    if (activeTab === 'starred' && !d.isStarred) return false
    if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (selectedFolder && d.folderId !== selectedFolder) return false
    return true
  })

  // Filter templates
  const filteredTemplates = templates.filter(t => {
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (selectedCategory && t.category !== selectedCategory) return false
    if (selectedTags.length > 0 && !selectedTags.some(tag => t.tags.includes(tag))) return false
    return true
  })

  // Get unique tags from templates
  const allTags = [...new Set(templates.flatMap(t => t.tags))]

  const handleCreateDashboard = async (name: string, description?: string) => {
    try {
      const dashboard = await DashboardApi.createInstance({
        tenantId,
        name,
        description,
        tags: [],
        variableValues: {},
        isStarred: false,
        permissions: {
          visibility: 'Private',
          userPermissions: {},
          teamPermissions: {},
          allowAnonymous: false
        },
        syncWithTemplate: false
      })
      navigate(`/dashboards/${dashboard.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dashboard')
    }
  }

  const handleCreateFromTemplate = async (template: DashboardTemplate, name: string) => {
    try {
      const dashboard = await DashboardApi.createFromTemplate({
        templateId: template.id,
        tenantId,
        name,
        syncWithTemplate: true
      })
      navigate(`/dashboards/${dashboard.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dashboard')
    }
  }

  const handleDeleteDashboard = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) return

    try {
      await DashboardApi.deleteInstance(id)
      setDashboards(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const handleToggleStar = async (id: string) => {
    try {
      const result = await DashboardApi.toggleStar(id)
      setDashboards(prev => prev.map(d => 
        d.id === id ? { ...d, isStarred: result.isStarred } : d
      ))
    } catch (err) {
      console.error('Failed to toggle star:', err)
    }
  }

  const handleImport = async (file: File) => {
    try {
      const content = await file.text()
      const data = JSON.parse(content)
      const dashboard = await DashboardApi.importDashboard(tenantId, data)
      setDashboards(prev => [dashboard, ...prev])
      setShowImport(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import')
    }
  }

  const renderDashboardCard = (dashboard: DashboardInstance) => (
    <div
      key={dashboard.id}
      className="panel group cursor-pointer hover:border-themed-border-accent transition-colors"
      onClick={() => navigate(`/dashboards/${dashboard.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-themed-interactive-primary" />
          <h3 className="font-medium text-themed-text-primary truncate">{dashboard.name}</h3>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleToggleStar(dashboard.id)
            }}
            className={`p-1.5 rounded hover:bg-themed-bg-secondary ${dashboard.isStarred ? 'text-yellow-500' : ''}`}
          >
            <Star className={`h-4 w-4 ${dashboard.isStarred ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Show context menu
            }}
            className="p-1.5 rounded hover:bg-themed-bg-secondary"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {dashboard.description && (
        <p className="text-sm text-themed-text-secondary line-clamp-2 mb-3">
          {dashboard.description}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-themed-text-muted">
        <Clock className="h-3 w-3" />
        <span>Updated {new Date(dashboard.updatedAt).toLocaleDateString()}</span>
      </div>

      {dashboard.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {dashboard.tags.slice(0, 3).map(tag => (
            <span key={tag} className="badge-muted text-xs">{tag}</span>
          ))}
          {dashboard.tags.length > 3 && (
            <span className="badge-muted text-xs">+{dashboard.tags.length - 3}</span>
          )}
        </div>
      )}

      {dashboard.templateId && (
        <div className="flex items-center gap-1 mt-2 text-xs text-themed-text-muted">
          <Package className="h-3 w-3" />
          <span>From template</span>
        </div>
      )}
    </div>
  )

  const renderTemplateCard = (template: DashboardTemplate) => (
    <div
      key={template.id}
      className="panel group hover:border-themed-border-accent transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {template.isSystem ? (
            <Sparkles className="h-5 w-5 text-themed-status-info" />
          ) : (
            <Package className="h-5 w-5 text-themed-interactive-primary" />
          )}
          <h3 className="font-medium text-themed-text-primary">{template.name}</h3>
        </div>
        {template.isSystem && (
          <span className="badge-muted text-xs">System</span>
        )}
      </div>

      {template.description && (
        <p className="text-sm text-themed-text-secondary line-clamp-2 mb-3">
          {template.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-themed-text-muted mb-3">
        <span>v{template.version}</span>
        {template.category && (
          <>
            <span>•</span>
            <span>{template.category}</span>
          </>
        )}
      </div>

      {template.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {template.tags.slice(0, 4).map(tag => (
            <span key={tag} className="badge-muted text-xs">{tag}</span>
          ))}
        </div>
      )}

      {template.requiredDataSourceTypes.length > 0 && (
        <div className="text-xs text-themed-text-muted mb-4">
          Requires: {template.requiredDataSourceTypes.join(', ')}
        </div>
      )}

      <button
        onClick={() => setCreateFromTemplate(template)}
        className="btn-themed-primary w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Use Template
      </button>
    </div>
  )

  const renderDashboardList = (dashboard: DashboardInstance) => (
    <div
      key={dashboard.id}
      className="flex items-center gap-4 p-4 bg-themed-bg-secondary rounded-lg hover:bg-themed-bg-elevated cursor-pointer transition-colors"
      onClick={() => navigate(`/dashboards/${dashboard.id}`)}
    >
      <LayoutDashboard className="h-5 w-5 text-themed-interactive-primary flex-shrink-0" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-themed-text-primary truncate">{dashboard.name}</h3>
          {dashboard.isStarred && (
            <Star className="h-4 w-4 text-yellow-500 fill-current flex-shrink-0" />
          )}
        </div>
        {dashboard.description && (
          <p className="text-sm text-themed-text-secondary truncate">{dashboard.description}</p>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-themed-text-muted flex-shrink-0">
        <span>{new Date(dashboard.updatedAt).toLocaleDateString()}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleToggleStar(dashboard.id)
          }}
          className="p-1.5 rounded hover:bg-themed-bg-primary"
        >
          <Star className={`h-4 w-4 ${dashboard.isStarred ? 'text-yellow-500 fill-current' : ''}`} />
        </button>
        <ChevronRight className="h-4 w-4" />
      </div>
    </div>
  )

  return (
    <div className="page-shell">
      <PageHeader
        title="Dashboards"
        description="Create, manage, and explore your metric dashboards"
        actions={
          <div className="page-actions">
            <button
              onClick={() => setShowImport(true)}
              className="btn-themed-secondary"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </button>
            <button
              onClick={() => setShowNewFolder(true)}
              className="btn-themed-secondary"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              New Folder
            </button>
            <button
              onClick={() => setShowNewDashboard(true)}
              className="btn-themed-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Dashboard
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-2">
          <span className="badge-muted">{dashboards.length} dashboards</span>
          <span className="badge-muted">{templates.length} templates</span>
          <span className="badge-muted">{dashboards.filter(d => d.isStarred).length} starred</span>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-themed-border-primary mb-6">
        {(['dashboards', 'templates', 'starred'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-themed-interactive-primary text-themed-interactive-primary'
                : 'border-transparent text-themed-text-secondary hover:text-themed-text-primary'
            }`}
          >
            {tab === 'dashboards' && <LayoutDashboard className="h-4 w-4 inline mr-2" />}
            {tab === 'templates' && <Package className="h-4 w-4 inline mr-2" />}
            {tab === 'starred' && <Star className="h-4 w-4 inline mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-2 text-xs bg-themed-bg-secondary px-1.5 py-0.5 rounded">
              {tab === 'dashboards' ? dashboards.length : 
               tab === 'templates' ? templates.length :
               dashboards.filter(d => d.isStarred).length}
            </span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="page-toolbar mb-6">
        <div className="flex-1">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-themed w-full pl-10"
            />
          </div>
        </div>

        <div className="page-toolbar__divider" />

        {activeTab === 'dashboards' && folders.length > 0 && (
          <>
            <select
              value={selectedFolder || ''}
              onChange={(e) => setSelectedFolder(e.target.value || null)}
              className="input-themed"
            >
              <option value="">All folders</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <div className="page-toolbar__divider" />
          </>
        )}

        {activeTab === 'templates' && (
          <>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="input-themed"
            >
              <option value="">All categories</option>
              {templateCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="page-toolbar__divider" />
          </>
        )}

        <div className="flex items-center gap-1 bg-themed-bg-secondary rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-themed-bg-elevated' : ''}`}
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-themed-bg-elevated' : ''}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="btn-themed-secondary"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-themed-interactive-primary" />
          <span className="ml-3 text-themed-text-secondary">Loading...</span>
        </div>
      ) : (
        <>
          {activeTab === 'templates' ? (
            filteredTemplates.length > 0 ? (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-2'
              }>
                {filteredTemplates.map(template => renderTemplateCard(template))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-themed-text-muted mb-4" />
                <h3 className="text-lg font-medium mb-2">No Templates Found</h3>
                <p className="text-themed-text-secondary">
                  {searchQuery ? 'Try adjusting your search criteria.' : 'No dashboard templates are available.'}
                </p>
              </div>
            )
          ) : (
            filteredDashboards.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredDashboards.map(dashboard => renderDashboardCard(dashboard))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDashboards.map(dashboard => renderDashboardList(dashboard))}
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <LayoutDashboard className="h-12 w-12 mx-auto text-themed-text-muted mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {activeTab === 'starred' ? 'No Starred Dashboards' : 'No Dashboards Yet'}
                </h3>
                <p className="text-themed-text-secondary mb-6">
                  {activeTab === 'starred' 
                    ? 'Star your favorite dashboards for quick access.'
                    : 'Create your first dashboard or use a template to get started.'}
                </p>
                {activeTab !== 'starred' && (
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setActiveTab('templates')}
                      className="btn-themed-secondary"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Browse Templates
                    </button>
                    <button
                      onClick={() => setShowNewDashboard(true)}
                      className="btn-themed-primary"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Dashboard
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </>
      )}

      {/* New Dashboard Modal */}
      {showNewDashboard && (
        <NewDashboardModal
          onClose={() => setShowNewDashboard(false)}
          onCreate={handleCreateDashboard}
        />
      )}

      {/* Create from Template Modal */}
      {createFromTemplate && (
        <CreateFromTemplateModal
          template={createFromTemplate}
          onClose={() => setCreateFromTemplate(null)}
          onCreate={(name) => handleCreateFromTemplate(createFromTemplate, name)}
        />
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}

      {/* New Folder Modal */}
      {showNewFolder && (
        <NewFolderModal
          tenantId={tenantId}
          onClose={() => setShowNewFolder(false)}
          onCreated={(folder) => {
            setFolders(prev => [...prev, folder])
            setShowNewFolder(false)
          }}
        />
      )}
    </div>
  )
}

// Modal Components
interface NewDashboardModalProps {
  onClose: () => void
  onCreate: (name: string, description?: string) => void
}

const NewDashboardModal = ({ onClose, onCreate }: NewDashboardModalProps) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-themed-bg-elevated rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Create New Dashboard</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-themed w-full"
              placeholder="My Dashboard"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-themed w-full"
              rows={3}
              placeholder="Dashboard description..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-themed-secondary">
            Cancel
          </button>
          <button
            onClick={() => onCreate(name, description)}
            disabled={!name.trim()}
            className="btn-themed-primary disabled:opacity-50"
          >
            Create Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

interface CreateFromTemplateModalProps {
  template: DashboardTemplate
  onClose: () => void
  onCreate: (name: string) => void
}

const CreateFromTemplateModal = ({ template, onClose, onCreate }: CreateFromTemplateModalProps) => {
  const [name, setName] = useState(template.name)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-themed-bg-elevated rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-2">Create from Template</h2>
        <p className="text-themed-text-secondary mb-4">
          Creating dashboard from "{template.name}"
        </p>
        
        <div>
          <label className="block text-sm font-medium mb-1">Dashboard Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-themed w-full"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-themed-secondary">
            Cancel
          </button>
          <button
            onClick={() => onCreate(name)}
            disabled={!name.trim()}
            className="btn-themed-primary disabled:opacity-50"
          >
            Create Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

interface ImportModalProps {
  onClose: () => void
  onImport: (file: File) => void
}

const ImportModal = ({ onClose, onImport }: ImportModalProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImport(file)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-themed-bg-elevated rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Import Dashboard</h2>
        
        <div className="border-2 border-dashed border-themed-border-primary rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 mx-auto text-themed-text-muted mb-4" />
          <p className="text-themed-text-secondary mb-4">
            Drop a JSON file here or click to browse
          </p>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
            id="import-file"
          />
          <label htmlFor="import-file" className="btn-themed-secondary cursor-pointer">
            Select File
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-themed-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

interface NewFolderModalProps {
  tenantId: string
  onClose: () => void
  onCreated: (folder: DashboardFolder) => void
}

const NewFolderModal = ({ tenantId, onClose, onCreated }: NewFolderModalProps) => {
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    try {
      setCreating(true)
      const folder = await DashboardApi.createFolder({
        tenantId,
        name,
        sortOrder: 0
      })
      onCreated(folder)
    } catch (err) {
      console.error('Failed to create folder:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-themed-bg-elevated rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Create Folder</h2>
        
        <div>
          <label className="block text-sm font-medium mb-1">Folder Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-themed w-full"
            placeholder="My Folder"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-themed-secondary">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || creating}
            className="btn-themed-primary disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Folder'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DashboardList

