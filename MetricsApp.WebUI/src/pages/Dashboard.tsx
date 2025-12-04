import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Activity, Server, Clock, TrendingUp, Database, AlertCircle, Settings, BarChart3, Sparkles, Filter } from 'lucide-react'
import { MetricsApi } from '../lib/api'
import { DashboardConfigManager, DashboardUtils, type DashboardConfig } from '../lib/dashboard-config'
import DashboardConfigPanel from '../components/DashboardConfigPanel'
import PageHeader from '../components/PageHeader'

interface MetricSummary {
  totalMetrics: number
  uniqueServers: number
  uniqueMetricTypes: number
  lastMetricTime: string
}

interface ChartData {
  name: string
  value: number
  timestamp?: string
}

type StatIcon = typeof Activity

const formatTimeRange = (range: string): string => {
  const unit = range.slice(-1)
  const rawValue = parseInt(range.slice(0, -1), 10)

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return range
  }

  let unitLabel = ''

  if (unit === 'm') {
    unitLabel = 'minute'
  } else if (unit === 'h') {
    unitLabel = 'hour'
  } else if (unit === 'd') {
    unitLabel = 'day'
  } else {
    return range
  }

  const plural = rawValue === 1 ? unitLabel : `${unitLabel}s`
  return `Last ${rawValue} ${plural}`
}

const capitalize = (value: string): string => {
  if (!value) {
    return value
  }
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const Dashboard = () => {
  const [summary, setSummary] = useState<MetricSummary>({
    totalMetrics: 0,
    uniqueServers: 0,
    uniqueMetricTypes: 0,
    lastMetricTime: 'Loading...'
  })

  const [timelineData, setTimelineData] = useState<ChartData[]>([])
  const [environmentData, setEnvironmentData] = useState<ChartData[]>([])
  const [metricTypeData, setMetricTypeData] = useState<ChartData[]>([])
  const [serverData, setServerData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<DashboardConfig>(DashboardConfigManager.getConfig())
  const [configPanelOpen, setConfigPanelOpen] = useState(false)

  const loadDashboardData = async () => {
    try {
      setError(null)

      // Get time range based on config
      const timeRangeMs = DashboardUtils.getTimeRangeInMs(config.charts.timeline.timeRange)
      const endTime = new Date()
      const startTime = new Date(endTime.getTime() - timeRangeMs)

      const metricsData = await MetricsApi.queryMetrics({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        limit: 10000
      })

      if (metricsData.length === 0) {
        // Show empty state but not as an error
        setSummary({
          totalMetrics: 0,
          uniqueServers: 0,
          uniqueMetricTypes: 0,
          lastMetricTime: 'No data available'
        })
        setTimelineData([])
        setEnvironmentData([])
        setMetricTypeData([])
        setServerData([])
        return
      }

      // Filter by allowed environments if configured
      const filteredData = config.filters.allowedEnvironments
        ? metricsData.filter(m => config.filters.allowedEnvironments!.includes(m.environment))
        : metricsData

      // Calculate summary statistics
      const uniqueServers = new Set(filteredData.map(m => m.source)).size
      const uniqueMetricTypes = new Set(filteredData.map(m => m.metricName)).size
      const latestTimestamp = filteredData.reduce((latest, metric) => {
        const metricTime = new Date(metric.timestamp)
        return metricTime > latest ? metricTime : latest
      }, new Date(0))

      setSummary({
        totalMetrics: filteredData.length,
        uniqueServers,
        uniqueMetricTypes,
        lastMetricTime: latestTimestamp > new Date(0)
          ? `${Math.round((Date.now() - latestTimestamp.getTime()) / 60000)} minutes ago`
          : 'Unknown'
      })

      // Generate timeline data (group by time intervals)
      const timelineMap = new Map<string, number>()
      filteredData.forEach(metric => {
        const time = new Date(metric.timestamp)
        const timeKey = `${time.getHours().toString().padStart(2, '0')}:${Math.floor(time.getMinutes() / 10) * 10}`
        timelineMap.set(timeKey, (timelineMap.get(timeKey) || 0) + 1)
      })

      const sortedTimeline = Array.from(timelineMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => ({ name, value }))
      setTimelineData(sortedTimeline)

      // Generate environment distribution
      const envMap = new Map<string, number>()
      filteredData.forEach(metric => {
        envMap.set(metric.environment, (envMap.get(metric.environment) || 0) + 1)
      })
      setEnvironmentData(Array.from(envMap.entries()).map(([name, value]) => ({ name, value })))

      // Generate metric types data
      const metricTypeMap = new Map<string, number>()
      filteredData.forEach(metric => {
        // Simplify metric names for display
        const simpleName = metric.metricName.split('.').pop() || metric.metricName

        // Filter by allowed metric types if configured
        if (config.filters.allowedMetricTypes &&
            !config.filters.allowedMetricTypes.some(allowed => metric.metricName.includes(allowed))) {
          return
        }

        metricTypeMap.set(simpleName, (metricTypeMap.get(simpleName) || 0) + 1)
      })

      const topMetricTypes = Array.from(metricTypeMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, config.charts.metricTypes.limit)
        .map(([name, value]) => ({ name, value }))
      setMetricTypeData(topMetricTypes)

      // Generate server data
      const serverMap = new Map<string, number>()
      filteredData.forEach(metric => {
        serverMap.set(metric.source, (serverMap.get(metric.source) || 0) + 1)
      })

      const sortedServers = Array.from(serverMap.entries())
        .sort(config.charts.servers.sortBy === 'name'
          ? ([a], [b]) => a.localeCompare(b)
          : ([, a], [, b]) => b - a
        )
        .slice(0, config.charts.servers.limit)
        .map(([name, value]) => ({ name, value }))
      setServerData(sortedServers)

    } catch (err) {
      console.error('Dashboard data loading failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')

      // Set empty data on error
      setSummary({
        totalMetrics: 0,
        uniqueServers: 0,
        uniqueMetricTypes: 0,
        lastMetricTime: 'Error loading data'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = (newConfig: DashboardConfig) => {
    setConfig(newConfig)
    // Reload data with new configuration
    loadDashboardData()
  }

  useEffect(() => {
    loadDashboardData()

    // Set up auto-refresh if enabled
    if (config.kpis.enabled && config.kpis.refreshInterval > 0) {
      const interval = setInterval(loadDashboardData, config.kpis.refreshInterval)
      return () => clearInterval(interval)
    }
  }, [config.kpis.enabled, config.kpis.refreshInterval, config.charts.timeline.timeRange])

  const renderEmptyState = (IconComponent: StatIcon, message: string) => (
    <div className="flex items-center justify-center h-[300px] text-themed-text-muted">
      <div className="text-center space-y-3">
        <IconComponent className="h-12 w-12 mx-auto opacity-50" />
        <p>{message}</p>
      </div>
    </div>
  )

  // Get colors based on theme
  const COLORS = DashboardUtils.getChartColors(config.tenant.theme)

  const formattedTimeRange = formatTimeRange(config.charts.timeline.timeRange)
  const allowedEnvironments = config.filters.allowedEnvironments ?? []
  const environmentBadgeLabel = allowedEnvironments.length ? allowedEnvironments.join(', ') : 'All environments'
  const environmentSummary = allowedEnvironments.length ? `Environments: ${environmentBadgeLabel}` : 'Environments: All'
  const metricFilterSummary = config.filters.allowedMetricTypes && config.filters.allowedMetricTypes.length > 0
    ? `${config.filters.allowedMetricTypes.length} metric filter${config.filters.allowedMetricTypes.length > 1 ? 's' : ''}`
    : 'Metric families: All'
  const autoRefreshLabel = config.kpis.refreshInterval > 0 ? `${Math.round(config.kpis.refreshInterval / 1000)}s` : 'Off'
  const timelineAggregation = capitalize(config.charts.timeline.aggregation ?? 'count')

  const statCards: Array<{
    id: string
    icon: StatIcon
    iconClass: string
    label: string
    value: string
    meta?: string
  }> = [
    {
      id: 'total-metrics',
      icon: Activity,
      iconClass: 'text-themed-status-success',
      label: 'Total Metrics',
      value: summary.totalMetrics.toLocaleString(),
      meta: `Time window: ${formattedTimeRange}`
    },
    {
      id: 'active-sources',
      icon: Server,
      iconClass: 'text-themed-status-info',
      label: 'Active Sources',
      value: summary.uniqueServers.toLocaleString(),
      meta: environmentSummary
    },
    {
      id: 'metric-families',
      icon: BarChart3,
      iconClass: 'text-themed-status-warning',
      label: 'Metric Families',
      value: summary.uniqueMetricTypes.toLocaleString(),
      meta: metricFilterSummary
    },
    {
      id: 'last-update',
      icon: Clock,
      iconClass: 'text-themed-status-info',
      label: 'Last Update',
      value: summary.lastMetricTime,
      meta: `Auto refresh: ${autoRefreshLabel}`
    }
  ]

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex-1 flex items-center justify-center min-h-[320px]">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-b-transparent border-themed-interactive-primary" />
            <span className="text-themed-text-secondary text-sm">Loading dashboard...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <PageHeader
        title={config.tenant.name}
        description="Real-time monitoring and analytics for your infrastructure metrics"
        meta={(
          <span className="badge-muted">
            <Sparkles className="h-3 w-3" />
            Tenant: {config.tenant.id}
          </span>
        )}
        actions={(
          <div className="page-actions">
            <button
              type="button"
              onClick={() => setConfigPanelOpen(true)}
              className="btn-themed-secondary"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </button>
            <button
              type="button"
              onClick={loadDashboardData}
              disabled={loading}
              className="btn-themed-primary disabled:opacity-60"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-muted">
            <Clock className="h-3 w-3" />
            {summary.lastMetricTime === 'No data available' ? 'Awaiting data' : `Last ingest ${summary.lastMetricTime}`}
          </span>
          <span className="badge-muted">
            <BarChart3 className="h-3 w-3" />
            {formattedTimeRange}
          </span>
          <span className="badge-muted">
            <Database className="h-3 w-3" />
            {environmentBadgeLabel}
          </span>
          {config.tenant.theme && config.tenant.theme !== 'default' ? (
            <span className="badge-muted">
              <Sparkles className="h-3 w-3" />
              Theme: {capitalize(config.tenant.theme)}
            </span>
          ) : null}
        </div>
      </PageHeader>

      <div className="page-toolbar">
        <div className="page-toolbar__group text-sm text-themed-text-secondary">
          <Clock className="h-4 w-4 text-themed-text-muted" />
          <span>Auto refresh: {autoRefreshLabel}</span>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group text-sm text-themed-text-secondary">
          <TrendingUp className="h-4 w-4 text-themed-text-muted" />
          <span>Aggregation: {timelineAggregation}</span>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group text-sm text-themed-text-secondary">
          <Filter className="h-4 w-4 text-themed-text-muted" />
          <span>{metricFilterSummary}</span>
        </div>
        {allowedEnvironments.length ? (
          <>
            <div className="page-toolbar__divider" />
            <div className="page-toolbar__group text-sm text-themed-text-secondary">
              <Database className="h-4 w-4 text-themed-text-muted" />
              <span>{environmentBadgeLabel}</span>
            </div>
          </>
        ) : null}
      </div>

      {error && (
        <div className="panel border-themed-alert-error">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-themed-status-error" />
              <h3 className="panel-title text-themed-status-error">Dashboard Error</h3>
            </div>
          </div>
          <p className="text-sm text-themed-text-secondary">{error}</p>
          <div className="panel-footer">
            Ensure your MetricsApp API is running on localhost:7201.
          </div>
        </div>
      )}

      {config.kpis.enabled && (
        <div className="stat-grid stat-grid--quartet">
          {statCards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.id} className="stat-card">
                <span className="stat-card__icon">
                  <Icon className={`h-5 w-5 ${card.iconClass}`} />
                </span>
                <div className="stat-card__label">{card.label}</div>
                <div className="stat-card__value">{card.value}</div>
                {card.meta ? <div className="stat-card__meta">{card.meta}</div> : null}
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        {config.charts.timeline.enabled && (
          <div className="panel xl:col-span-2">
            <div className="panel-header">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-themed-interactive-primary" />
                <div>
                  <h3 className="panel-title">Metrics Timeline</h3>
                  <p className="panel-subtitle">{formattedTimeRange}</p>
                </div>
              </div>
              <span className="badge-muted">
                <BarChart3 className="h-3 w-3" />
                {timelineData.length} points
              </span>
            </div>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={3} dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              renderEmptyState(BarChart3, 'No timeline data available')
            )}
            <div className="panel-footer">Grouped in 10 minute buckets from the selected time window.</div>
          </div>
        )}

        {config.charts.environment.enabled && (
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-themed-status-info" />
                <div>
                  <h3 className="panel-title">Environment Distribution</h3>
                  <p className="panel-subtitle">{environmentBadgeLabel}</p>
                </div>
              </div>
            </div>
            {environmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={environmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {environmentData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              renderEmptyState(Database, 'No environment data available')
            )}
            <div className="panel-footer">{config.charts.environment.showPercentages ? 'Percentages calculated from current query window.' : 'Absolute counts across the selected window.'}</div>
          </div>
        )}

        {config.charts.metricTypes.enabled && (
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-themed-status-warning" />
                <div>
                  <h3 className="panel-title">Top Metric Types</h3>
                  <p className="panel-subtitle">Top {config.charts.metricTypes.limit}</p>
                </div>
              </div>
            </div>
            {metricTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={metricTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" />
                  <YAxis stroke="var(--text-secondary)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Bar dataKey="value" fill="var(--interactive-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              renderEmptyState(Activity, 'No metric type data available')
            )}
            <div className="panel-footer">Metric families ordered by volume within the current window.</div>
          </div>
        )}

        {config.charts.servers.enabled && (
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-themed-status-success" />
                <div>
                  <h3 className="panel-title">Server Distribution</h3>
                  <p className="panel-subtitle">Top {config.charts.servers.limit}</p>
                </div>
              </div>
            </div>
            {serverData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={serverData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis type="number" stroke="var(--text-secondary)" />
                  <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <Bar dataKey="value" fill="var(--interactive-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              renderEmptyState(Server, 'No server data available')
            )}
            <div className="panel-footer">Sorted by {config.charts.servers.sortBy === 'name' ? 'name' : 'ingest volume'} within the active window.</div>
          </div>
        )}
      </div>

      <DashboardConfigPanel
        isOpen={configPanelOpen}
        onClose={() => setConfigPanelOpen(false)}
        config={config}
        onConfigChange={handleConfigChange}
      />
    </div>
  )
}

export default Dashboard
