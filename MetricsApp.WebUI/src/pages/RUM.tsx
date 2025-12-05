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
  Clock,
  Download
} from 'lucide-react'
import { RumApi, type RumAnalytics, type RumError } from '../lib/rum-api'
import PageHeader from '../components/PageHeader'

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
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(timeRanges[2])
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    activeSessions: 0,
    currentPageViews: 0,
    errorsLastHour: 0,
    avgResponseTime: 0
  })

  const loadRumData = async () => {
    try {
      setLoading(true)
      setError(null)

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
          url: '/api/v1/telemetry/metrics',
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

    const interval = setInterval(() => {
      setRealTimeMetrics(prev => ({
        activeSessions: Math.max(0, prev.activeSessions + Math.floor(Math.random() * 10) - 5),
        currentPageViews: Math.max(0, prev.currentPageViews + Math.floor(Math.random() * 20) - 10),
        errorsLastHour: Math.max(0, prev.errorsLastHour + (Math.random() > 0.8 ? 1 : 0)),
        avgResponseTime: Math.max(100, prev.avgResponseTime + Math.floor(Math.random() * 200) - 100)
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
      case 'lcp': return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
      case 'fid': return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor'
      case 'cls': return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
      case 'pageLoad': return value <= 2000 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
      default: return 'good'
    }
  }

  const getRatingColor = (rating: 'good' | 'needs-improvement' | 'poor'): string => {
    switch (rating) {
      case 'good': return 'text-themed-status-success'
      case 'needs-improvement': return 'text-themed-status-warning'
      case 'poor': return 'text-themed-status-error'
    }
  }

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']

  return (
    <div className="page-shell">
      <PageHeader
        title="Real User Monitoring"
        description="Monitor user experience, performance, and errors in real-time"
        meta={
          <span className="badge-muted">
            <Monitor className="h-3 w-3" />
            Web Vitals
          </span>
        }
        actions={
          <div className="page-actions">
            <select
              value={selectedTimeRange.value}
              onChange={(e) => {
                const range = timeRanges.find(r => r.value === e.target.value)
                if (range) setSelectedTimeRange(range)
              }}
              className="input-themed"
            >
              {timeRanges.map(range => (
                <option key={range.value} value={range.value}>{range.label}</option>
              ))}
            </select>
            <button onClick={loadRumData} disabled={loading} className="btn-themed-secondary disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="btn-themed-secondary">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-muted">
            <Clock className="h-3 w-3" />
            {selectedTimeRange.label}
          </span>
          <span className="badge-muted">
            <Users className="h-3 w-3" />
            {realTimeMetrics.activeSessions} active
          </span>
          <span className="badge-muted">
            <Eye className="h-3 w-3" />
            {realTimeMetrics.currentPageViews} views
          </span>
        </div>
      </PageHeader>

      <div className="page-toolbar">
        <div className="page-toolbar__group text-sm text-themed-text-secondary">
          <Activity className="h-4 w-4 text-themed-text-muted" />
          <span>Active Sessions: {realTimeMetrics.activeSessions}</span>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group text-sm text-themed-text-secondary">
          <Zap className="h-4 w-4 text-themed-text-muted" />
          <span>Avg Response: {realTimeMetrics.avgResponseTime}ms</span>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group text-sm text-themed-text-secondary">
          <AlertTriangle className="h-4 w-4 text-themed-text-muted" />
          <span>Errors (1h): {realTimeMetrics.errorsLastHour}</span>
        </div>
      </div>

      {error && (
        <div className="panel border-themed-alert-error">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-themed-status-error flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="panel-title text-themed-status-error">RUM Dashboard Error</h3>
              <p className="text-sm text-themed-text-secondary mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="panel flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-themed-interactive-primary" />
          <span className="ml-3 text-themed-text-secondary">Loading RUM data...</span>
        </div>
      ) : analytics && (
        <>
          {/* Real-time Stats */}
          <div className="stat-grid stat-grid--quartet">
            <div className="stat-card">
              <div className="stat-card__icon">
                <Activity className="h-5 w-5" />
              </div>
              <div className="stat-card__label">Active Sessions</div>
              <div className="stat-card__value">{realTimeMetrics.activeSessions}</div>
              <div className="stat-card__meta">Currently online</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon">
                <Eye className="h-5 w-5" />
              </div>
              <div className="stat-card__label">Page Views</div>
              <div className="stat-card__value">{realTimeMetrics.currentPageViews}</div>
              <div className="stat-card__meta">Total in period</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="stat-card__label">Errors (1h)</div>
              <div className="stat-card__value text-themed-status-error">{realTimeMetrics.errorsLastHour}</div>
              <div className="stat-card__meta">Last hour</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__icon">
                <Zap className="h-5 w-5" />
              </div>
              <div className="stat-card__label">Avg Response</div>
              <div className="stat-card__value">{realTimeMetrics.avgResponseTime}ms</div>
              <div className="stat-card__meta">Page load time</div>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="panel-grid panel-grid--cols-3">
            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-themed-interactive-primary" />
                  <h3 className="panel-title">Session Overview</h3>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-themed-text-secondary">Total Sessions</span>
                  <span className="font-semibold text-themed-text-primary">{analytics.overview.totalSessions.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-themed-text-secondary">Avg Duration</span>
                  <span className="font-semibold text-themed-text-primary">{formatDuration(analytics.overview.avgSessionDuration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-themed-text-secondary">Bounce Rate</span>
                  <span className="font-semibold text-themed-text-primary">{formatPercentage(analytics.overview.bounceRate)}</span>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-themed-status-info" />
                  <h3 className="panel-title">Performance</h3>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-themed-text-secondary">Avg Page Load</span>
                  <span className={`font-semibold ${getRatingColor(getPerformanceRating('pageLoad', analytics.performance.avgPageLoadTime))}`}>
                    {analytics.performance.avgPageLoadTime}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-themed-text-secondary">LCP</span>
                  <span className={`font-semibold ${getRatingColor(getPerformanceRating('lcp', analytics.performance.avgLcp))}`}>
                    {analytics.performance.avgLcp}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-themed-text-secondary">FID</span>
                  <span className={`font-semibold ${getRatingColor(getPerformanceRating('fid', analytics.performance.avgFid))}`}>
                    {analytics.performance.avgFid}ms
                  </span>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-themed-status-error" />
                  <h3 className="panel-title">Error Tracking</h3>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-themed-text-secondary">Total Errors</span>
                  <span className="font-semibold text-themed-text-primary">{analytics.overview.totalErrors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-themed-text-secondary">Error Rate</span>
                  <span className="font-semibold text-themed-text-primary">{formatPercentage(analytics.overview.errorRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-themed-text-secondary">Unresolved</span>
                  <span className="font-semibold text-themed-status-error">{recentErrors.filter(e => !e.resolved).length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-themed-interactive-primary" />
                  <h3 className="panel-title">Device Distribution</h3>
                </div>
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
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-themed-status-info" />
                  <h3 className="panel-title">Browser Distribution</h3>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.browsers}>
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
                  <Bar dataKey="count" fill="var(--interactive-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Pages & Errors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-themed-status-warning" />
                  <h3 className="panel-title">Top Pages</h3>
                </div>
                <span className="badge-muted">{analytics.topPages.length} pages</span>
              </div>
              <div className="space-y-3">
                {analytics.topPages.map((page, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-themed-border-primary">
                    <div className="flex-1">
                      <div className="font-medium text-themed-text-primary">{page.url}</div>
                      <div className="text-sm text-themed-text-secondary">
                        {page.views} views • {page.avgLoadTime}ms avg load
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${page.errorRate > 0.005 ? 'text-themed-status-error' : 'text-themed-status-success'}`}>
                      {formatPercentage(page.errorRate)} errors
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-themed-status-error" />
                  <h3 className="panel-title">Recent Errors</h3>
                </div>
                <span className="badge-muted">{recentErrors.length} errors</span>
              </div>
              <div className="space-y-3">
                {recentErrors.map((err) => (
                  <div key={err.id} className="p-3 rounded-lg border border-themed-alert-error bg-themed-alert-error bg-opacity-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-themed-status-error truncate">{err.message}</div>
                        <div className="text-sm text-themed-text-secondary mt-1">
                          {err.url} • {new Date(err.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <span className={`ml-2 badge-muted ${err.severity === 'high' ? 'text-themed-status-error' : 'text-themed-status-warning'}`}>
                        {err.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default RUM
