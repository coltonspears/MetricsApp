import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, XCircle, Clock, Bell, RefreshCw, Filter, Edit2, Trash2, Settings } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import AlertRuleModal from '../components/AlertRuleModal'

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

interface AlertRule {
  id?: string
  name: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  conditions: Array<{
    id: string
    metric: string
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
    value: number
    duration: number
  }>
  conditionLogic: 'all' | 'any'
  evaluationInterval: number
  notifications: {
    email: boolean
    slack: boolean
    webhook: boolean
    webhookUrl?: string
  }
  enabled: boolean
  labels: Record<string, string>
}

const Alerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all')
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [alertRules, setAlertRules] = useState<AlertRule[]>([])

  const loadAlerts = () => {
    setLoading(true)
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
  }

  useEffect(() => {
    loadAlerts()
  }, [])

  const filteredAlerts = alerts.filter(alert => 
    filter === 'all' || alert.status === filter
  )

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 text-themed-status-error border-themed-status-error'
      case 'warning':
        return 'bg-yellow-500/10 text-themed-status-warning border-themed-status-warning'
      case 'info':
        return 'bg-blue-500/10 text-themed-status-info border-themed-status-info'
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

  const handleSaveRule = (rule: AlertRule) => {
    if (rule.id) {
      // Update existing rule
      setAlertRules(alertRules.map(r => r.id === rule.id ? rule : r))
    } else {
      // Create new rule
      setAlertRules([...alertRules, { ...rule, id: crypto.randomUUID() }])
    }
    setEditingRule(null)
  }

  const handleEditRule = (rule: AlertRule) => {
    setEditingRule(rule)
    setIsRuleModalOpen(true)
  }

  const handleDeleteRule = (ruleId: string) => {
    setAlertRules(alertRules.filter(r => r.id !== ruleId))
  }

  const handleCreateRule = () => {
    setEditingRule(null)
    setIsRuleModalOpen(true)
  }

  const activeCount = alerts.filter(a => a.status === 'active').length
  const acknowledgedCount = alerts.filter(a => a.status === 'acknowledged').length
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex-1 flex items-center justify-center min-h-[320px]">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-b-transparent border-themed-interactive-primary" />
            <span className="text-themed-text-secondary text-sm">Loading alerts...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Alert Management"
        description="Monitor and manage system alerts and notifications"
        meta={
          <span className="badge-muted">
            <Bell className="h-3 w-3" />
            {alerts.length} total alerts
          </span>
        }
        actions={
          <div className="page-actions">
            <button onClick={loadAlerts} disabled={loading} className="btn-themed-secondary disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={handleCreateRule} className="btn-themed-primary">
              <Bell className="h-4 w-4 mr-2" />
              Create Alert Rule
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-muted">
            <AlertTriangle className="h-3 w-3" />
            {activeCount} active
          </span>
          <span className="badge-muted">
            <Clock className="h-3 w-3" />
            {acknowledgedCount} acknowledged
          </span>
          <span className="badge-muted">
            <CheckCircle className="h-3 w-3" />
            {resolvedCount} resolved
          </span>
        </div>
      </PageHeader>

      {/* Summary Stats */}
      <div className="stat-grid stat-grid--quartet">
        <div className="stat-card">
          <div className="stat-card__icon">
            <AlertTriangle className="h-5 w-5 text-themed-status-error" />
          </div>
          <div className="stat-card__label">Active</div>
          <div className="stat-card__value">{activeCount}</div>
          <div className="stat-card__meta">Requires attention</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">
            <Clock className="h-5 w-5 text-themed-status-warning" />
          </div>
          <div className="stat-card__label">Acknowledged</div>
          <div className="stat-card__value">{acknowledgedCount}</div>
          <div className="stat-card__meta">Being investigated</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">
            <CheckCircle className="h-5 w-5 text-themed-status-success" />
          </div>
          <div className="stat-card__label">Resolved</div>
          <div className="stat-card__value">{resolvedCount}</div>
          <div className="stat-card__meta">Issues fixed</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">
            <Bell className="h-5 w-5 text-themed-interactive-primary" />
          </div>
          <div className="stat-card__label">Total</div>
          <div className="stat-card__value">{alerts.length}</div>
          <div className="stat-card__meta">All alerts</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="page-toolbar">
        <div className="page-toolbar__group">
          <Filter className="h-4 w-4 text-themed-text-muted" />
          <span className="text-sm text-themed-text-secondary">Filter:</span>
        </div>
        <div className="page-toolbar__group">
          {(['all', 'active', 'acknowledged', 'resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                filter === status
                  ? 'btn-themed-primary'
                  : 'btn-themed-secondary'
              }`}
            >
              {status}
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-black/10">
                {status === 'all' ? alerts.length : alerts.filter(a => a.status === status).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="panel flex flex-col items-center justify-center py-16">
            <Bell className="h-16 w-16 text-themed-text-muted mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-themed-text-primary mb-2">No alerts</h3>
            <p className="text-themed-text-secondary">
              {filter === 'all' ? 'No alerts found.' : `No ${filter} alerts found.`}
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="panel transition-colors hover:border-themed-border-accent"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(alert.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-themed-text-primary">
                        {alert.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-themed-text-secondary">
                      {alert.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-themed-text-muted">
                      <span className="badge-muted">Source: {alert.source}</span>
                      <span className="badge-muted">Metric: {alert.metricName}</span>
                      <span className="badge-muted">Current: {alert.currentValue}</span>
                      <span className="badge-muted">Threshold: {alert.threshold}</span>
                      <span className="badge-muted">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {alert.status === 'active' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="btn-themed-secondary"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Acknowledge
                    </button>
                  )}
                  {(alert.status === 'active' || alert.status === 'acknowledged') && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      className="btn-themed-primary"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert Rules Section */}
      <div className="panel">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-themed-interactive-primary" />
            <h3 className="panel-title">Alert Rules</h3>
          </div>
          <span className="badge-muted">{alertRules.length} rules</span>
        </div>
        
        {alertRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="h-10 w-10 text-themed-text-muted mb-3 opacity-50" />
            <p className="text-themed-text-secondary">No alert rules configured</p>
            <p className="text-sm text-themed-text-muted mt-1">Create a rule to start monitoring metrics</p>
            <button onClick={handleCreateRule} className="btn-themed-primary mt-4">
              <Bell className="h-4 w-4 mr-2" />
              Create Your First Rule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-themed-border-primary">
            {alertRules.map(rule => (
              <div key={rule.id} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    rule.enabled ? 'bg-themed-status-success' : 'bg-themed-text-muted'
                  }`} style={{
                    backgroundColor: rule.enabled ? 'var(--status-success)' : 'var(--text-muted)'
                  }} />
                  <div>
                    <h4 className="font-medium text-themed-text-primary">{rule.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        rule.severity === 'critical' 
                          ? 'bg-red-500/10 text-themed-status-error' 
                          : rule.severity === 'warning'
                          ? 'bg-yellow-500/10 text-themed-status-warning'
                          : 'bg-blue-500/10 text-themed-status-info'
                      }`}>
                        {rule.severity}
                      </span>
                      <span className="text-xs text-themed-text-muted">
                        {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-themed-text-muted">
                        • Every {rule.evaluationInterval}s
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditRule(rule)}
                    className="p-2 text-themed-text-secondary hover:text-themed-text-primary transition-colors"
                    title="Edit rule"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteRule(rule.id!)}
                    className="p-2 text-themed-text-secondary hover:text-themed-status-error transition-colors"
                    title="Delete rule"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert Rule Modal */}
      <AlertRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => {
          setIsRuleModalOpen(false)
          setEditingRule(null)
        }}
        onSave={handleSaveRule}
        editingRule={editingRule}
      />
    </div>
  )
}

export default Alerts
