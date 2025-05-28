import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Clock, Bell, Filter } from 'lucide-react'

interface Alert {
  id: string
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  status: 'active' | 'acknowledged' | 'resolved'
  timestamp: string
  source: string
  metricName: string
  threshold: string
  currentValue: string
}

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all')

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockAlerts: Alert[] = [
        {
          id: '1',
          title: 'High CPU Usage',
          description: 'CPU usage has exceeded 90% for more than 5 minutes',
          severity: 'critical',
          status: 'active',
          timestamp: '2024-01-15T10:30:00Z',
          source: 'PROD-WEB-01',
          metricName: 'cpu.usage',
          threshold: '90%',
          currentValue: '95.2%'
        },
        {
          id: '2',
          title: 'Memory Usage Warning',
          description: 'Memory usage is approaching threshold',
          severity: 'warning',
          status: 'acknowledged',
          timestamp: '2024-01-15T10:25:00Z',
          source: 'PROD-DB-01',
          metricName: 'memory.usage',
          threshold: '80%',
          currentValue: '85.1%'
        },
        {
          id: '3',
          title: 'Disk Space Low',
          description: 'Available disk space is below 10%',
          severity: 'warning',
          status: 'active',
          timestamp: '2024-01-15T10:20:00Z',
          source: 'PROD-API-02',
          metricName: 'disk.free',
          threshold: '10%',
          currentValue: '8.5%'
        },
        {
          id: '4',
          title: 'Response Time Spike',
          description: 'API response time has increased significantly',
          severity: 'info',
          status: 'resolved',
          timestamp: '2024-01-15T10:15:00Z',
          source: 'STAGE-API-01',
          metricName: 'response.time',
          threshold: '500ms',
          currentValue: '750ms'
        }
      ]
      
      setAlerts(mockAlerts)
      setLoading(false)
    }, 1000)
  }, [])

  const filteredAlerts = alerts.filter(alert => 
    filter === 'all' || alert.status === filter
  )

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800'
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      case 'acknowledged':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      default:
        return <XCircle className="h-5 w-5 text-slate-500" />
    }
  }

  const handleAcknowledge = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'acknowledged' as const }
        : alert
    ))
  }

  const handleResolve = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'resolved' as const }
        : alert
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600"></div>
        <span className="ml-4 text-slate-600 dark:text-slate-400">Loading alerts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Alert Management</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Monitor and manage system alerts and notifications</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
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
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Active</dt>
                  <dd className="text-2xl font-bold text-slate-900 dark:text-white">
                    {alerts.filter(a => a.status === 'active').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 overflow-hidden shadow-lg rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Acknowledged</dt>
                  <dd className="text-2xl font-bold text-slate-900 dark:text-white">
                    {alerts.filter(a => a.status === 'acknowledged').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 overflow-hidden shadow-lg rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Resolved</dt>
                  <dd className="text-2xl font-bold text-slate-900 dark:text-white">
                    {alerts.filter(a => a.status === 'resolved').length}
                  </dd>
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
                  <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">Total</dt>
                  <dd className="text-2xl font-bold text-slate-900 dark:text-white">
                    {alerts.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
              <Filter className="h-5 w-5 mr-2 text-emerald-600 dark:text-emerald-400" />
              Filter Alerts
            </h3>
            <div className="flex space-x-2">
              {(['all', 'active', 'acknowledged', 'resolved'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filter === status
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Alert Details 
            <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
              ({filteredAlerts.length} alerts)
            </span>
          </h3>
        </div>
        
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(alert.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-slate-900 dark:text-white">
                          {alert.title}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        {alert.description}
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Source:</span>
                          <span className="ml-1 text-slate-900 dark:text-white font-mono">{alert.source}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Metric:</span>
                          <span className="ml-1 text-slate-900 dark:text-white font-mono">{alert.metricName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Threshold:</span>
                          <span className="ml-1 text-slate-900 dark:text-white font-mono">{alert.threshold}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Current:</span>
                          <span className="ml-1 text-slate-900 dark:text-white font-mono font-bold">{alert.currentValue}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <div className="flex space-x-2">
                      {alert.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="inline-flex items-center px-3 py-2 border border-yellow-300 dark:border-yellow-600 text-sm font-medium rounded-lg text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleResolve(alert.id)}
                            className="inline-flex items-center px-3 py-2 border border-green-300 dark:border-green-600 text-sm font-medium rounded-lg text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolve
                          </button>
                        </>
                      )}
                      {alert.status === 'acknowledged' && (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="inline-flex items-center px-3 py-2 border border-green-300 dark:border-green-600 text-sm font-medium rounded-lg text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No alerts found</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                No alerts match the current filter criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Alerts 