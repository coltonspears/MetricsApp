import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Activity, Server, Clock, TrendingUp, Database, AlertCircle, Settings, BarChart3 } from 'lucide-react'
import { MetricsApi } from '../lib/api'
import { DashboardConfigManager, DashboardUtils, type DashboardConfig } from '../lib/dashboard-config'
import DashboardConfigPanel from '../components/DashboardConfigPanel'

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
        .sort(([,a], [,b]) => b - a)
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
          : ([,a], [,b]) => b - a
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

  // Get colors based on theme
  const COLORS = DashboardUtils.getChartColors(config.tenant.theme)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-themed-interactive-primary"></div>
        <span className="ml-4 text-themed-text-secondary">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-themed-border-primary pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-themed-text-primary">
              {config.tenant.name}
            </h1>
            <p className="mt-2 text-themed-text-secondary">
              Real-time monitoring and analytics for your infrastructure metrics
            </p>
            {config.tenant.theme !== 'default' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-themed-alert-info bg-opacity-20 text-themed-status-info mt-2">
                {config.tenant.theme} theme
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-themed-text-muted">
              Auto-refresh: {config.kpis.refreshInterval / 1000}s
            </span>
            <button
              onClick={() => setConfigPanelOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-themed-border-primary text-sm font-medium rounded-lg text-themed-text-primary bg-themed-bg-surface hover:bg-themed-interactive-secondary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </button>
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-themed-border-primary text-sm font-medium rounded-lg text-themed-text-primary bg-themed-bg-surface hover:bg-themed-interactive-secondary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary transition-colors disabled:opacity-50"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-themed-alert-error bg-opacity-10 border border-themed-alert-error rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-themed-status-error mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-themed-status-error">Dashboard Error</h3>
              <p className="mt-1 text-sm text-themed-text-secondary">{error}</p>
              <p className="mt-1 text-xs text-themed-text-muted">
                Ensure your MetricsApp API is running on localhost:7201
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {config.kpis.enabled && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-themed-bg-tertiary overflow-hidden shadow-lg rounded-lg border border-themed-border-primary">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 border-themed-alert-success bg-opacity-20 rounded-lg">
                    <Activity className="h-6 w-6 text-themed-status-success" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-themed-text-secondary truncate">Total Metrics</dt>
                    <dd className="text-2xl font-bold text-themed-text-primary">{summary.totalMetrics.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-themed-bg-tertiary overflow-hidden shadow-lg rounded-lg border border-themed-border-primary">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-themed-alert-info bg-opacity-20 rounded-lg">
                    <Server className="h-6 w-6 text-themed-status-info" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-themed-text-secondary truncate">Active Servers</dt>
                    <dd className="text-2xl font-bold text-themed-text-primary">{summary.uniqueServers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-themed-bg-tertiary overflow-hidden shadow-lg rounded-lg border border-themed-border-primary">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 border-themed-alert-error bg-opacity-20 rounded-lg">
                    <Database className="h-6 w-6 text-themed-status-warning" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-themed-text-secondary truncate">Metric Types</dt>
                    <dd className="text-2xl font-bold text-themed-text-primary">{summary.uniqueMetricTypes}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-themed-bg-tertiary overflow-hidden shadow-lg rounded-lg border border-themed-border-primary">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-themed-interactive-secondary rounded-lg">
                    <Clock className="h-6 w-6 text-themed-interactive-primary" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-themed-text-secondary truncate">Last Update</dt>
                    <dd className="text-2xl font-bold text-themed-text-primary">{summary.lastMetricTime}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Timeline Chart */}
        {config.charts.timeline.enabled && (
          <div className="bg-themed-bg-tertiary p-6 rounded-lg shadow-lg border border-themed-border-primary">
            <div className="flex items-center mb-6">
              <TrendingUp className="h-5 w-5 text-themed-interactive-primary mr-2" />
              <h3 className="text-lg font-semibold text-themed-text-primary">Metrics Timeline</h3>
              <span className="ml-2 text-sm text-themed-text-muted">({config.charts.timeline.timeRange})</span>
            </div>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
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
              <div className="flex items-center justify-center h-[300px] text-themed-text-muted">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No timeline data available</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Environment Distribution */}
        {config.charts.environment.enabled && (
          <div className="bg-themed-bg-tertiary p-6 rounded-lg shadow-lg border border-themed-border-primary">
            <div className="flex items-center mb-6">
              <Database className="h-5 w-5 text-themed-status-info mr-2" />
              <h3 className="text-lg font-semibold text-themed-text-primary">Environment Distribution</h3>
            </div>
            {environmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={environmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
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
              <div className="flex items-center justify-center h-[300px] text-themed-text-muted">
                <div className="text-center">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No environment data available</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metric Types */}
        {config.charts.metricTypes.enabled && (
          <div className="bg-themed-bg-tertiary p-6 rounded-lg shadow-lg border border-themed-border-primary">
            <div className="flex items-center mb-6">
              <Activity className="h-5 w-5 text-themed-status-warning mr-2" />
              <h3 className="text-lg font-semibold text-themed-text-primary">Top Metric Types</h3>
            </div>
            {metricTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
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
              <div className="flex items-center justify-center h-[300px] text-themed-text-muted">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No metric type data available</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Server Distribution */}
        {config.charts.servers.enabled && (
          <div className="bg-themed-bg-tertiary p-6 rounded-lg shadow-lg border border-themed-border-primary">
            <div className="flex items-center mb-6">
              <Server className="h-5 w-5 text-themed-status-success mr-2" />
              <h3 className="text-lg font-semibold text-themed-text-primary">Server Distribution</h3>
            </div>
            {serverData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serverData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis type="number" stroke="var(--text-secondary)" />
                  <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" width={100} />
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
              <div className="flex items-center justify-center h-[300px] text-themed-text-muted">
                <div className="text-center">
                  <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No server data available</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dashboard Configuration Panel */}
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