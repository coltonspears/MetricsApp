import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  RefreshCw,
  Settings,
  Save,
  Share2,
  Star,
  Clock,
  ChevronDown,
  Plus,
  Edit3,
  Copy,
  Download,
  History,
  Trash2,
  MoreVertical,
  X,
  Play,
  Pause,
  Maximize2,
  AlertTriangle,
  Folder
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import PageHeader from '../components/PageHeader'
import {
  DashboardApi,
  DashboardUtils,
  type DashboardInstance,
  type DashboardTemplate,
  type DashboardPanel,
  type DashboardVariableValue,
  type TimeRangeConfig,
  type PanelType
} from '../lib/dashboard-api'
import TelemetryApi from '../lib/telemetry-api'

// Time range presets
const TIME_RANGE_PRESETS = [
  { label: 'Last 5 minutes', value: { from: 'now-5m', to: 'now' } },
  { label: 'Last 15 minutes', value: { from: 'now-15m', to: 'now' } },
  { label: 'Last 30 minutes', value: { from: 'now-30m', to: 'now' } },
  { label: 'Last 1 hour', value: { from: 'now-1h', to: 'now' } },
  { label: 'Last 3 hours', value: { from: 'now-3h', to: 'now' } },
  { label: 'Last 6 hours', value: { from: 'now-6h', to: 'now' } },
  { label: 'Last 12 hours', value: { from: 'now-12h', to: 'now' } },
  { label: 'Last 24 hours', value: { from: 'now-24h', to: 'now' } },
  { label: 'Last 7 days', value: { from: 'now-7d', to: 'now' } },
  { label: 'Last 30 days', value: { from: 'now-30d', to: 'now' } },
]

const REFRESH_INTERVALS = [
  { label: 'Off', value: 0 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
  { label: '30m', value: 1800 },
  { label: '1h', value: 3600 },
]

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

interface PanelData {
  loading: boolean
  error?: string
  data: any[]
  lastUpdated?: Date
}

const DashboardView = () => {
  const { dashboardId } = useParams<{ dashboardId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [dashboard, setDashboard] = useState<DashboardInstance | null>(null)
  const [template, setTemplate] = useState<DashboardTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dashboard state
  const [timeRange, setTimeRange] = useState<TimeRangeConfig>({ from: 'now-1h', to: 'now' })
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)
  const [variableValues, setVariableValues] = useState<Record<string, DashboardVariableValue>>({})
  const [panelData, setPanelData] = useState<Record<string, PanelData>>({})

  // UI state
  const [isEditing, setIsEditing] = useState(false)
  const [timeRangeOpen, setTimeRangeOpen] = useState(false)
  const [refreshOpen, setRefreshOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fullscreenPanelId, setFullscreenPanelId] = useState<string | null>(null)

  // Get effective panels (from instance or template)
  const panels = dashboard?.panels || template?.panels || []
  const variables = template?.variables || []

  // Load dashboard
  useEffect(() => {
    loadDashboard()
  }, [dashboardId])

  // Auto-refresh
  useEffect(() => {
    if (!isAutoRefresh || refreshInterval === 0) return

    const interval = setInterval(() => {
      refreshAllPanels()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [isAutoRefresh, refreshInterval, timeRange, variableValues])

  const loadDashboard = async () => {
    if (!dashboardId) return

    try {
      setLoading(true)
      setError(null)

      const instance = await DashboardApi.getInstance(dashboardId)
      setDashboard(instance)

      // Load template if linked
      if (instance.templateId) {
        try {
          const tmpl = await DashboardApi.getTemplate(instance.templateId)
          setTemplate(tmpl)
        } catch {
          // Template might not exist anymore
          console.warn('Failed to load template:', instance.templateId)
        }
      }

      // Initialize state from dashboard
      if (instance.timeRange) {
        setTimeRange(instance.timeRange)
      }
      if (instance.refreshIntervalSeconds !== undefined) {
        setRefreshInterval(instance.refreshIntervalSeconds)
      }
      if (instance.variableValues) {
        setVariableValues(instance.variableValues)
      }

      // Load initial panel data
      setTimeout(() => refreshAllPanels(), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const refreshAllPanels = async () => {
    const effectivePanels = dashboard?.panels || template?.panels || []
    
    for (const panel of effectivePanels) {
      refreshPanel(panel)
    }
  }

  const refreshPanel = async (panel: DashboardPanel) => {
    if (panel.type === 'row' || panel.type === 'text') return

    setPanelData(prev => ({
      ...prev,
      [panel.id]: { ...prev[panel.id], loading: true }
    }))

    try {
      const { start, end } = DashboardUtils.parseTimeRange(timeRange.from, timeRange.to)
      
      // Get the query expression with resolved variables
      const query = panel.queries[0]
      if (!query?.expression) {
        setPanelData(prev => ({
          ...prev,
          [panel.id]: { loading: false, data: [], error: 'No query defined' }
        }))
        return
      }

      const resolvedQuery = DashboardUtils.resolveVariables(query.expression, variableValues)

      // Execute query through telemetry API
      const metrics = await TelemetryApi.queryMetrics({
        startTime: start,
        endTime: end,
        metricNames: [resolvedQuery],
        limit: 1000
      })

      const chartData = metrics.flatMap(metric =>
        metric.samples.map((sample: any) => ({
          timestamp: new Date(sample.timestamp * 1000),
          value: sample.value,
          metric: metric.name,
          labels: sample.labels
        }))
      )

      setPanelData(prev => ({
        ...prev,
        [panel.id]: {
          loading: false,
          data: chartData,
          lastUpdated: new Date()
        }
      }))
    } catch (err) {
      setPanelData(prev => ({
        ...prev,
        [panel.id]: {
          loading: false,
          data: [],
          error: err instanceof Error ? err.message : 'Query failed'
        }
      }))
    }
  }

  const handleSave = async () => {
    if (!dashboard) return

    try {
      setSaving(true)
      await DashboardApi.patchInstance(dashboard.id, {
        timeRange,
        refreshIntervalSeconds: refreshInterval,
        variableValues,
        panels: dashboard.panels,
        message: 'Dashboard saved'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStar = async () => {
    if (!dashboard) return

    try {
      const result = await DashboardApi.toggleStar(dashboard.id)
      setDashboard(prev => prev ? { ...prev, isStarred: result.isStarred } : null)
    } catch (err) {
      console.error('Failed to toggle star:', err)
    }
  }

  const handleExport = async () => {
    if (!dashboard) return

    try {
      const exportData = await DashboardApi.exportDashboard(dashboard.id)
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${dashboard.slug}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export:', err)
    }
  }

  const handleDelete = async () => {
    if (!dashboard || !confirm('Are you sure you want to delete this dashboard?')) return

    try {
      await DashboardApi.deleteInstance(dashboard.id)
      navigate('/dashboards')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const renderPanel = (panel: DashboardPanel) => {
    const data = panelData[panel.id] || { loading: false, data: [] }
    const isFullscreen = fullscreenPanelId === panel.id

    const panelContent = (
      <div
        className={`panel h-full flex flex-col ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}
        style={!isFullscreen ? {
          gridColumn: `span ${Math.min(panel.gridPos.width, 24)}`,
          minHeight: `${panel.gridPos.height * 30}px`
        } : undefined}
      >
        <div className="panel-header flex-shrink-0">
          <h4 className="panel-title text-sm truncate">{panel.title}</h4>
          <div className="flex items-center gap-1">
            {data.lastUpdated && (
              <span className="text-xs text-themed-text-muted">
                {data.lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => refreshPanel(panel)}
              className="p-1 hover:bg-themed-bg-secondary rounded"
              title="Refresh"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${data.loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setFullscreenPanelId(isFullscreen ? null : panel.id)}
              className="p-1 hover:bg-themed-bg-secondary rounded"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <X className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {data.loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="h-8 w-8 animate-spin text-themed-interactive-primary" />
            </div>
          ) : data.error ? (
            <div className="flex items-center justify-center h-full text-themed-status-error">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span className="text-sm">{data.error}</span>
            </div>
          ) : (
            renderVisualization(panel, data.data)
          )}
        </div>
      </div>
    )

    if (isFullscreen) {
      return (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setFullscreenPanelId(null)} />
          {panelContent}
        </>
      )
    }

    return panelContent
  }

  const renderVisualization = (panel: DashboardPanel, data: any[]) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-themed-text-muted">
          <span className="text-sm">No data</span>
        </div>
      )
    }

    const height = fullscreenPanelId === panel.id ? 'calc(100vh - 150px)' : '100%'

    switch (panel.type) {
      case 'timeseries':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis
                dataKey="timestamp"
                stroke="var(--text-secondary)"
                tickFormatter={(v) => new Date(v).toLocaleTimeString()}
                fontSize={11}
              />
              <YAxis stroke="var(--text-secondary)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                }}
                labelFormatter={(v) => new Date(v).toLocaleString()}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'barchart':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis
                dataKey="timestamp"
                stroke="var(--text-secondary)"
                tickFormatter={(v) => new Date(v).toLocaleTimeString()}
                fontSize={11}
              />
              <YAxis stroke="var(--text-secondary)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'piechart':
        const aggregated = data.reduce((acc: any, item: any) => {
          const key = item.labels?.service || item.metric || 'unknown'
          acc[key] = (acc[key] || 0) + item.value
          return acc
        }, {})
        const pieData = Object.entries(aggregated).map(([name, value]) => ({ name, value }))

        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )

      case 'stat':
        const latest = data[data.length - 1]?.value || 0
        const previous = data[data.length - 2]?.value || 0
        const change = latest - previous
        const changePercent = previous !== 0 ? (change / previous) * 100 : 0

        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-4xl font-bold text-themed-text-primary">
              {typeof latest === 'number' ? latest.toFixed(2) : latest}
            </div>
            <div className={`text-sm flex items-center mt-2 ${change >= 0 ? 'text-themed-status-success' : 'text-themed-status-error'}`}>
              <span>{change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(1)}%)</span>
              <span className="ml-1">{change >= 0 ? '↗' : '↘'}</span>
            </div>
          </div>
        )

      case 'gauge':
        const gaugeValue = data[data.length - 1]?.value || 0
        const max = panel.fieldConfig.defaults.max || 100
        const percentage = Math.min((gaugeValue / max) * 100, 100)

        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--border-primary)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={CHART_COLORS[0]}
                  strokeWidth="8"
                  strokeDasharray={`${percentage * 2.51} 251`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{gaugeValue.toFixed(0)}</span>
              </div>
            </div>
          </div>
        )

      case 'table':
        return (
          <div className="overflow-auto h-full">
            <table className="min-w-full">
              <thead className="sticky top-0 bg-themed-bg-secondary">
                <tr className="border-b border-themed-border-primary">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-themed-text-secondary uppercase">Time</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-themed-text-secondary uppercase">Value</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-themed-text-secondary uppercase">Labels</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-themed-border-primary">
                {data.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-sm">{new Date(row.timestamp).toLocaleString()}</td>
                    <td className="px-3 py-2 text-sm font-mono">{row.value?.toFixed(2)}</td>
                    <td className="px-3 py-2 text-sm">
                      {row.labels && Object.entries(row.labels).map(([k, v]) => (
                        <span key={k} className="badge-muted mr-1">{k}={String(v)}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      case 'text':
        return (
          <div className="p-4 prose prose-sm max-w-none">
            {panel.options.content || 'No content'}
          </div>
        )

      default:
        return (
          <div className="flex items-center justify-center h-full text-themed-text-muted">
            <span className="text-sm">Visualization type '{panel.type}' not implemented</span>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-themed-interactive-primary" />
          <span className="ml-3 text-themed-text-secondary">Loading dashboard...</span>
        </div>
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="page-shell">
        <div className="flex-1 flex flex-col items-center justify-center">
          <AlertTriangle className="h-12 w-12 text-themed-status-error mb-4" />
          <h2 className="text-xl font-semibold mb-2">Dashboard Not Found</h2>
          <p className="text-themed-text-secondary mb-4">{error || 'The requested dashboard could not be found.'}</p>
          <button onClick={() => navigate('/dashboards')} className="btn-themed-primary">
            Go to Dashboards
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <PageHeader
        title={dashboard.name}
        description={dashboard.description}
        meta={
          <div className="flex items-center gap-2">
            {dashboard.templateId && (
              <span className="badge-muted">From template</span>
            )}
            {dashboard.folderId && (
              <span className="badge-muted">
                <Folder className="h-3 w-3 mr-1" />
                Folder
              </span>
            )}
          </div>
        }
        actions={
          <div className="page-actions">
            {/* Time Range Selector */}
            <div className="relative">
              <button
                onClick={() => setTimeRangeOpen(!timeRangeOpen)}
                className="btn-themed-secondary"
              >
                <Clock className="h-4 w-4 mr-2" />
                {DashboardUtils.formatTimeRange(timeRange.from, timeRange.to)}
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
              {timeRangeOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTimeRangeOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-themed-bg-elevated border border-themed-border-primary rounded-lg shadow-lg z-20">
                    {TIME_RANGE_PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setTimeRange(preset.value)
                          setTimeRangeOpen(false)
                          refreshAllPanels()
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-themed-bg-secondary first:rounded-t-lg last:rounded-b-lg ${
                          timeRange.from === preset.value.from ? 'bg-themed-bg-secondary text-themed-interactive-primary' : ''
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Refresh Control */}
            <div className="relative">
              <button
                onClick={() => setRefreshOpen(!refreshOpen)}
                className={`btn-themed-secondary ${isAutoRefresh && refreshInterval > 0 ? 'text-themed-status-success' : ''}`}
              >
                {isAutoRefresh && refreshInterval > 0 ? (
                  <Play className="h-4 w-4 mr-2" />
                ) : (
                  <Pause className="h-4 w-4 mr-2" />
                )}
                {refreshInterval > 0 ? REFRESH_INTERVALS.find(r => r.value === refreshInterval)?.label : 'Off'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
              {refreshOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRefreshOpen(false)} />
                  <div className="absolute right-0 mt-2 w-36 bg-themed-bg-elevated border border-themed-border-primary rounded-lg shadow-lg z-20">
                    {REFRESH_INTERVALS.map((interval) => (
                      <button
                        key={interval.value}
                        onClick={() => {
                          setRefreshInterval(interval.value)
                          setIsAutoRefresh(interval.value > 0)
                          setRefreshOpen(false)
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-themed-bg-secondary first:rounded-t-lg last:rounded-b-lg ${
                          refreshInterval === interval.value ? 'bg-themed-bg-secondary text-themed-interactive-primary' : ''
                        }`}
                      >
                        {interval.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={refreshAllPanels}
              className="btn-themed-secondary"
              title="Refresh all panels"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={handleToggleStar}
              className={`btn-themed-secondary ${dashboard.isStarred ? 'text-yellow-500' : ''}`}
              title={dashboard.isStarred ? 'Unstar' : 'Star'}
            >
              <Star className={`h-4 w-4 ${dashboard.isStarred ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-themed-primary"
            >
              <Save className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
              Save
            </button>

            {/* More Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="btn-themed-secondary"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-themed-bg-elevated border border-themed-border-primary rounded-lg shadow-lg z-20">
                    <button
                      onClick={() => {
                        setIsEditing(!isEditing)
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-themed-bg-secondary flex items-center gap-2 first:rounded-t-lg"
                    >
                      <Edit3 className="h-4 w-4" />
                      {isEditing ? 'Exit Edit Mode' : 'Edit Dashboard'}
                    </button>
                    <button
                      onClick={() => {
                        navigate(`/dashboards/${dashboardId}/settings`)
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-themed-bg-secondary flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        navigate(`/dashboards/${dashboardId}/versions`)
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-themed-bg-secondary flex items-center gap-2"
                    >
                      <History className="h-4 w-4" />
                      Version History
                    </button>
                    <hr className="border-themed-border-primary my-1" />
                    <button
                      onClick={() => {
                        handleExport()
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-themed-bg-secondary flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export JSON
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement share
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-themed-bg-secondary flex items-center gap-2"
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implement duplicate
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-themed-bg-secondary flex items-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </button>
                    <hr className="border-themed-border-primary my-1" />
                    <button
                      onClick={() => {
                        handleDelete()
                        setMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-themed-bg-secondary flex items-center gap-2 text-themed-status-error last:rounded-b-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        }
      >
        <div className="flex items-center gap-2 text-sm">
          <span className="text-themed-text-muted">v{dashboard.version}</span>
          <span className="text-themed-text-muted">•</span>
          <span className="text-themed-text-muted">
            Updated {new Date(dashboard.updatedAt).toLocaleDateString()}
          </span>
          {dashboard.tags.length > 0 && (
            <>
              <span className="text-themed-text-muted">•</span>
              {dashboard.tags.map(tag => (
                <span key={tag} className="badge-muted">{tag}</span>
              ))}
            </>
          )}
        </div>
      </PageHeader>

      {/* Variable Controls */}
      {variables.length > 0 && (
        <div className="page-toolbar">
          {variables.filter(v => !v.hidden).map(variable => (
            <div key={variable.name} className="page-toolbar__group">
              <label className="text-xs font-semibold uppercase tracking-wide text-themed-text-muted">
                {variable.label}
              </label>
              {variable.type === 'DataSource' ? (
                <select
                  value={variableValues[variable.name]?.dataSourceId || ''}
                  onChange={(e) => {
                    setVariableValues(prev => ({
                      ...prev,
                      [variable.name]: {
                        value: e.target.value,
                        dataSourceId: e.target.value,
                        isDefault: false
                      }
                    }))
                  }}
                  className="input-themed"
                >
                  <option value="">Select data source...</option>
                  {/* TODO: Load actual data sources */}
                </select>
              ) : variable.options ? (
                <select
                  value={String(variableValues[variable.name]?.value || variable.defaultValue)}
                  onChange={(e) => {
                    setVariableValues(prev => ({
                      ...prev,
                      [variable.name]: {
                        value: e.target.value,
                        isDefault: false
                      }
                    }))
                  }}
                  className="input-themed"
                >
                  {variable.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={String(variableValues[variable.name]?.value || variable.defaultValue || '')}
                  onChange={(e) => {
                    setVariableValues(prev => ({
                      ...prev,
                      [variable.name]: {
                        value: e.target.value,
                        isDefault: false
                      }
                    }))
                  }}
                  className="input-themed"
                  placeholder={variable.label}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Panels Grid */}
      <div 
        className="grid gap-4"
        style={{ 
          gridTemplateColumns: `repeat(24, 1fr)`,
        }}
      >
        {panels.map(panel => (
          <div 
            key={panel.id}
            style={{
              gridColumn: `span ${Math.min(panel.gridPos.width, 24)}`,
            }}
          >
            {renderPanel(panel)}
          </div>
        ))}
      </div>

      {panels.length === 0 && (
        <div className="panel flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-themed-text-muted mb-4">
            <Settings className="h-16 w-16 opacity-50" />
          </div>
          <h3 className="text-xl font-medium mb-2">No Panels Yet</h3>
          <p className="text-themed-text-secondary text-center max-w-md mb-6">
            This dashboard doesn't have any panels. Add panels to start visualizing your data.
          </p>
          <button
            onClick={() => navigate(`/dashboards/${dashboardId}/edit`)}
            className="btn-themed-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Panel
          </button>
        </div>
      )}
    </div>
  )
}

export default DashboardView

