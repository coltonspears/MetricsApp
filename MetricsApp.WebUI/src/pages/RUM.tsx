import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { 
  Users, 
  Eye, 
  AlertTriangle, 
  TrendingUp, 
  Monitor, 
  Globe,
  Zap,
  Activity,
  RefreshCw,
  ChevronDown
} from 'lucide-react'
import { RumApi, type RumAnalytics, type RumError } from '../lib/rum-api'

interface TimeRange {
  label: string
  value: string
  hours: number
}

const timeRanges: TimeRange[] = [
  { label: 'Last Hour', value: '1h', hours: 1 },
  { label: 'Last 4 Hours', value: '4h', hours: 4 },
  { label: 'Last 24 Hours', value: '24h', hours: 24 },
  { label: 'Last 7 Days', value: '7d', hours: 168 },
  { label: 'Last 30 Days', value: '30d', hours: 720 }
]

const RUM = () => {
  const [analytics, setAnalytics] = useState<RumAnalytics | null>(null)
  const [recentErrors, setRecentErrors] = useState<RumError[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(timeRanges[2]) // 24h default
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    activeSessions: 0,
    currentPageViews: 0,
    errorsLastHour: 0,
    avgResponseTime: 0
  })

  const loadRumData = async () => {
    try {
      setError(null)

      // For now, use mock data since API endpoints don't exist yet
      // In production, these would be real API calls:
      // const endTime = new Date()
      // const startTime = new Date(endTime.getTime() - selectedTimeRange.hours * 60 * 60 * 1000)
      // const params = {
      //   startTime: startTime.toISOString(),
      //   endTime: endTime.toISOString(),
      //   limit: 100
      // }
      // const [analyticsData, sessionsData, errorsData, realTimeData] = await Promise.all([
      //   RumApi.getAnalytics(params),
      //   RumApi.getSessions({ ...params, limit: 10 }),
      //   RumApi.getErrors({ ...params, limit: 10 }),
      //   RumApi.getRealTimeMetrics()
      // ])

      // Using mock data for demonstration
      const analyticsData = RumApi.generateMockAnalytics()
      const errorsData: RumError[] = [
        {
          id: 'error_1',
          sessionId: 'session_1',
          timestamp: Date.now() - 30 * 60 * 1000,
          message: 'TypeError: Cannot read property of undefined',
          type: 'javascript',
          severity: 'high',
          url: '/dashboard',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          resolved: false
        },
        {
          id: 'error_2',
          sessionId: 'session_2',
          timestamp: Date.now() - 45 * 60 * 1000,
          message: 'Network request failed: 500 Internal Server Error',
          type: 'network',
          severity: 'high',
          url: '/api/v1/metrics/Query',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          resolved: false
        }
      ]

      setAnalytics(analyticsData)
      setRecentErrors(errorsData)
      setRealTimeMetrics({
        activeSessions: 47,
        currentPageViews: 156,
        errorsLastHour: 3,
        avgResponseTime: 1850
      })

    } catch (err) {
      console.error('RUM data loading failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to load RUM data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRumData()
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      // Update real-time metrics without full reload
      setRealTimeMetrics(prev => ({
        activeSessions: prev.activeSessions + Math.floor(Math.random() * 10) - 5,
        currentPageViews: prev.currentPageViews + Math.floor(Math.random() * 20) - 10,
        errorsLastHour: prev.errorsLastHour + (Math.random() > 0.8 ? 1 : 0),
        avgResponseTime: prev.avgResponseTime + Math.floor(Math.random() * 200) - 100
      }))
    }, 30000)

    return () => clearInterval(interval)
  }, [selectedTimeRange])

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`
  }

  const getPerformanceRating = (metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    switch (metric) {
      case 'lcp':
        return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
      case 'fid':
        return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor'
      case 'cls':
        return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
      case 'pageLoad':
        return value <= 2000 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
      default:
        return 'good'
    }
  }

  const getRatingColor = (rating: 'good' | 'needs-improvement' | 'poor'): string => {
    switch (rating) {
      case 'good': return 'text-green-600 dark:text-green-400'
      case 'needs-improvement': return 'text-yellow-600 dark:text-yellow-400'
      case 'poor': return 'text-red-600 dark:text-red-400'
    }
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
        <span className="ml-4 text-slate-600 dark:text-slate-400">Loading RUM data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">RUM Dashboard Error</h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              RUM endpoints are not yet implemented. This is a preview with mock data.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Real User Monitoring
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Monitor user experience, performance, and errors in real-time
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Time Range Selector */}
            <div className="relative">
              <select
                value={selectedTimeRange.value}
                onChange={(e) => {
                  const range = timeRanges.find(r => r.value === e.target.value)
                  if (range) setSelectedTimeRange(range)
                }}
                className="appearance-none bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            
            <button
              onClick={loadRumData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Metrics */}
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
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Active Sessions</dt>
                  <dd className="text-2xl font-bold text-slate-900 dark:text-white">{realTimeMetrics.activeSessions}</dd>
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
                  <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Page Views</dt>
                  <dd className="text-2xl font-bold text-slate-900 dark:text-white">{realTimeMetrics.currentPageViews}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 overflow-hidden shadow-lg rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Errors (1h)</dt>
                  <dd className="text-2xl font-bold text-slate-900 dark:text-white">{realTimeMetrics.errorsLastHour}</dd>
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
                  <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Avg Response</dt>
                  <dd className="text-2xl font-bold text-slate-900 dark:text-white">{realTimeMetrics.avgResponseTime}ms</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Session Overview</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Total Sessions</span>
              <span className="font-semibold text-slate-900 dark:text-white">{analytics.overview.totalSessions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Avg Duration</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatDuration(analytics.overview.avgSessionDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Bounce Rate</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatPercentage(analytics.overview.bounceRate)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Performance</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Avg Page Load</span>
              <span className={`font-semibold ${getRatingColor(getPerformanceRating('pageLoad', analytics.performance.avgPageLoadTime))}`}>
                {analytics.performance.avgPageLoadTime}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">LCP</span>
              <span className={`font-semibold ${getRatingColor(getPerformanceRating('lcp', analytics.performance.avgLcp))}`}>
                {analytics.performance.avgLcp}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">FID</span>
              <span className={`font-semibold ${getRatingColor(getPerformanceRating('fid', analytics.performance.avgFid))}`}>
                {analytics.performance.avgFid}ms
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Error Tracking</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Total Errors</span>
              <span className="font-semibold text-slate-900 dark:text-white">{analytics.overview.totalErrors}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Error Rate</span>
              <span className="font-semibold text-slate-900 dark:text-white">{formatPercentage(analytics.overview.errorRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Unresolved</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{recentErrors.filter(e => !e.resolved).length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Device Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-6">
            <Monitor className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Device Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.devices}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {analytics.devices.map((_, index) => (
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
        </div>

        {/* Browser Distribution */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-6">
            <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Browser Distribution</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.browsers}>
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
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Pages */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-6">
            <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Top Pages</h3>
          </div>
          <div className="space-y-4">
            {analytics.topPages.map((page, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-slate-900 dark:text-white">{page.url}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {page.views} views • {page.avgLoadTime}ms avg load
                  </div>
                </div>
                <div className={`text-sm font-medium ${page.errorRate > 0.005 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatPercentage(page.errorRate)} errors
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Errors */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center mb-6">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Errors</h3>
          </div>
          <div className="space-y-4">
            {recentErrors.map((error) => (
              <div key={error.id} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-red-900 dark:text-red-200 truncate">{error.message}</div>
                    <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {error.url} • {new Date(error.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    error.severity === 'high' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                  }`}>
                    {error.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RUM 