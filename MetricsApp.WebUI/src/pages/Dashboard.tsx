import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { Activity, Server, Clock, TrendingUp, Database, AlertCircle, Settings } from 'lucide-react'
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
        <span className="ml-4 text-slate-600 dark:text-slate-400">Loading dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {config.tenant.name}
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Real-time monitoring and analytics for your infrastructure metrics
            </p>
            {config.tenant.theme !== 'default' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 mt-2">
                {config.tenant.theme} theme
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Auto-refresh: {config.kpis.refreshInterval / 1000}s
            </span>
            <button
              onClick={() => setConfigPanelOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </button>
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Dashboard Error</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Ensure your MetricsApp API is running on localhost:7201
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {config.kpis.enabled && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white dark:bg-slate-800 overflow-hidden shadow-lg rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                    <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Total Metrics</dt>
                    <dd className="text-2xl font-bold text-slate-900 dark:text-white">{summary.totalMetrics.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 overflow-hidden shadow-lg rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Active Servers</dt>
                    <dd className="text-2xl font-bold text-slate-900 dark:text-white">{summary.uniqueServers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 overflow-hidden shadow-lg rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                    <Database className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Metric Types</dt>
                    <dd className="text-2xl font-bold text-slate-900 dark:text-white">{summary.uniqueMetricTypes}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 overflow-hidden shadow-lg rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Last Update</dt>
                    <dd className="text-2xl font-bold text-slate-900 dark:text-white">{summary.lastMetricTime}</dd>
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
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center mb-6">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Metrics Timeline</h3>
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">({config.charts.timeline.timeRange})</span>
            </div>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }} 
                  />
                  <Line type="monotone" dataKey="value" stroke={COLORS[0]} strokeWidth={3} dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No timeline data available</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Environment Distribution */}
        {config.charts.environment.enabled && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center mb-6">
              <Server className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Environment Distribution</h3>
            </div>
            {environmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={environmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={config.charts.environment.showPercentages 
                      ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`
                      : ({ name }) => name
                    }
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
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <Server className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No environment data available</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metric Types Chart */}
        {config.charts.metricTypes.enabled && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center mb-6">
              <Database className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Top Metric Types</h3>
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">(Top {config.charts.metricTypes.limit})</span>
            </div>
            {metricTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                {config.charts.metricTypes.chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={metricTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {metricTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }} 
                    />
                  </PieChart>
                ) : (
                  <BarChart data={metricTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }} 
                    />
                    <Bar dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No metric type data available</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Server Activity Chart */}
        {config.charts.servers.enabled && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center mb-6">
              <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400 mr-2" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Server Activity</h3>
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                (Top {config.charts.servers.limit}, sorted by {config.charts.servers.sortBy})
              </span>
            </div>
            {serverData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={serverData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" />
                  <YAxis dataKey="name" type="category" stroke="#64748b" width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }} 
                  />
                  <Bar dataKey="value" fill={COLORS[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No server data available</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      <DashboardConfigPanel
        config={config}
        onConfigChange={handleConfigChange}
        isOpen={configPanelOpen}
        onClose={() => setConfigPanelOpen(false)}
      />
    </div>
  )
}

export default Dashboard 