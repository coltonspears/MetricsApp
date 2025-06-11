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
        return 'bg-themed-status-error bg-opacity-10 text-themed-status-error border-themed-status-error'
      case 'warning':
        return 'bg-themed-status-warning bg-opacity-10 text-themed-status-warning border-themed-status-warning'
      case 'info':
        return 'bg-themed-status-info bg-opacity-10 text-themed-status-info border-themed-status-info'
      default:
        return 'bg-themed-bg-surface text-themed-text-primary border-themed-border-primary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <AlertTriangle className="h-5 w-5 text-themed-status-error" />
      case 'acknowledged':
        return <Clock className="h-5 w-5 text-themed-status-warning" />
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-themed-status-success" />
      default:
        return <XCircle className="h-5 w-5 text-themed-text-secondary" />
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-themed-interactive-primary"></div>
        <span className="ml-4 text-themed-text-secondary">Loading alerts...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-themed-border-primary pb-4">
        <h1 className="text-3xl font-bold text-themed-text-primary">Alert Management</h1>
        <p className="mt-2 text-themed-text-secondary">Monitor and manage system alerts and notifications</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-themed-bg-tertiary overflow-hidden shadow-lg rounded-lg border border-themed-border-primary">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-themed-status-error bg-opacity-20 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-themed-status-error" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-themed-text-secondary truncate">Active</dt>
                  <dd className="text-2xl font-bold text-themed-text-primary">
                    {alerts.filter(a => a.status === 'active').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-themed-bg-tertiary overflow-hidden shadow-lg rounded-lg border border-themed-border-primary">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-themed-status-warning bg-opacity-20 rounded-lg">
                  <Clock className="h-6 w-6 text-themed-status-warning" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-themed-text-secondary truncate">Acknowledged</dt>
                  <dd className="text-2xl font-bold text-themed-text-primary">
                    {alerts.filter(a => a.status === 'acknowledged').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-themed-bg-tertiary overflow-hidden shadow-lg rounded-lg border border-themed-border-primary">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="p-3 bg-themed-status-success bg-opacity-20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-themed-status-success" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-themed-text-secondary truncate">Resolved</dt>
                  <dd className="text-2xl font-bold text-themed-text-primary">
                    {alerts.filter(a => a.status === 'resolved').length}
                  </dd>
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
                  <Bell className="h-6 w-6 text-themed-interactive-primary" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-themed-text-secondary truncate">Total</dt>
                  <dd className="text-2xl font-bold text-themed-text-primary">
                    {alerts.length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-themed-border-secondary">
        <nav className="-mb-px flex space-x-8">
          {(['all', 'active', 'acknowledged', 'resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                filter === status
                  ? 'border-themed-interactive-primary text-themed-interactive-primary'
                  : 'border-transparent text-themed-text-secondary hover:text-themed-text-primary hover:border-themed-border-secondary'
              }`}
            >
              {status}
              <span className="ml-2 bg-themed-bg-surface text-themed-text-secondary px-2 py-1 rounded-full text-xs">
                {status === 'all' ? alerts.length : alerts.filter(a => a.status === status).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="mx-auto h-12 w-12 text-themed-text-muted" />
            <h3 className="mt-2 text-sm font-medium text-themed-text-primary">No alerts</h3>
            <p className="mt-1 text-sm text-themed-text-secondary">
              {filter === 'all' ? 'No alerts found.' : `No ${filter} alerts found.`}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-themed-bg-tertiary border border-themed-border-primary rounded-lg p-6 transition-colors hover:bg-themed-bg-elevated"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getStatusIcon(alert.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-medium text-themed-text-primary">
                        {alert.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-themed-text-secondary">
                      {alert.description}
                    </p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-themed-text-muted">
                      <span>Source: {alert.source}</span>
                      <span>Metric: {alert.metricName}</span>
                      <span>Current: {alert.currentValue}</span>
                      <span>Threshold: {alert.threshold}</span>
                      <span>
                        {new Date(alert.timestamp).toLocaleDateString()} {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {alert.status === 'active' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="inline-flex items-center px-3 py-2 border border-themed-status-warning text-sm font-medium rounded-sm text-themed-status-warning bg-themed-bg-surface hover:bg-themed-status-warning hover:text-themed-text-inverse transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {(alert.status === 'active' || alert.status === 'acknowledged') && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="inline-flex items-center px-3 py-2 border border-themed-status-success text-sm font-medium rounded-sm text-themed-status-success bg-themed-bg-surface hover:bg-themed-status-success hover:text-themed-text-inverse transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Alerts 