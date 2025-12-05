import React, { useState, useEffect } from 'react'
import {
  X,
  Bell,
  AlertTriangle,
  Plus,
  Trash2,
  Save,
  TestTube,
  Zap,
  Mail,
  MessageSquare,
  Webhook
} from 'lucide-react'

interface AlertCondition {
  id: string
  metric: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq'
  value: number
  duration: number // in seconds
}

interface AlertRule {
  id?: string
  name: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  conditions: AlertCondition[]
  conditionLogic: 'all' | 'any'
  evaluationInterval: number // in seconds
  notifications: {
    email: boolean
    slack: boolean
    webhook: boolean
    webhookUrl?: string
  }
  enabled: boolean
  labels: Record<string, string>
}

interface AlertRuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (rule: AlertRule) => void
  editingRule?: AlertRule | null
}

const AVAILABLE_METRICS = [
  { name: 'cpu_usage_percent', label: 'CPU Usage (%)', unit: '%' },
  { name: 'memory_usage_percent', label: 'Memory Usage (%)', unit: '%' },
  { name: 'disk_usage_percent', label: 'Disk Usage (%)', unit: '%' },
  { name: 'http_request_duration_seconds', label: 'HTTP Request Duration', unit: 's' },
  { name: 'http_requests_total', label: 'HTTP Requests Total', unit: 'count' },
  { name: 'error_rate_percent', label: 'Error Rate (%)', unit: '%' },
  { name: 'network_bytes_total', label: 'Network Bytes Total', unit: 'bytes' },
  { name: 'database_connections_active', label: 'Active DB Connections', unit: 'count' },
  { name: 'cache_hit_rate_percent', label: 'Cache Hit Rate (%)', unit: '%' },
  { name: 'queue_depth', label: 'Queue Depth', unit: 'count' }
]

const OPERATORS = [
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' }
]

const AlertRuleModal: React.FC<AlertRuleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRule
}) => {
  const [rule, setRule] = useState<AlertRule>({
    name: '',
    description: '',
    severity: 'warning',
    conditions: [
      { id: crypto.randomUUID(), metric: 'cpu_usage_percent', operator: 'gt', value: 80, duration: 300 }
    ],
    conditionLogic: 'all',
    evaluationInterval: 60,
    notifications: {
      email: true,
      slack: false,
      webhook: false
    },
    enabled: true,
    labels: {}
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [newLabelKey, setNewLabelKey] = useState('')
  const [newLabelValue, setNewLabelValue] = useState('')

  useEffect(() => {
    if (editingRule) {
      setRule(editingRule)
    } else {
      setRule({
        name: '',
        description: '',
        severity: 'warning',
        conditions: [
          { id: crypto.randomUUID(), metric: 'cpu_usage_percent', operator: 'gt', value: 80, duration: 300 }
        ],
        conditionLogic: 'all',
        evaluationInterval: 60,
        notifications: {
          email: true,
          slack: false,
          webhook: false
        },
        enabled: true,
        labels: {}
      })
    }
    setErrors({})
    setTestResult(null)
  }, [editingRule, isOpen])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!rule.name.trim()) {
      newErrors.name = 'Rule name is required'
    }

    if (rule.conditions.length === 0) {
      newErrors.conditions = 'At least one condition is required'
    }

    rule.conditions.forEach((condition, idx) => {
      if (!condition.metric) {
        newErrors[`condition_${idx}_metric`] = 'Metric is required'
      }
      if (condition.value === undefined || isNaN(condition.value)) {
        newErrors[`condition_${idx}_value`] = 'Valid value is required'
      }
    })

    if (rule.notifications.webhook && !rule.notifications.webhookUrl?.trim()) {
      newErrors.webhookUrl = 'Webhook URL is required when webhook notification is enabled'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validate()) {
      onSave(rule)
      onClose()
    }
  }

  const handleTest = () => {
    // Simulate testing the rule
    setTestResult(null)
    setTimeout(() => {
      const success = Math.random() > 0.3
      setTestResult({
        success,
        message: success
          ? 'Rule tested successfully. Conditions evaluated against recent data.'
          : 'Rule test failed. No matching data found in the selected time range.'
      })
    }, 1000)
  }

  const addCondition = () => {
    setRule({
      ...rule,
      conditions: [
        ...rule.conditions,
        { id: crypto.randomUUID(), metric: 'cpu_usage_percent', operator: 'gt', value: 80, duration: 300 }
      ]
    })
  }

  const removeCondition = (id: string) => {
    if (rule.conditions.length > 1) {
      setRule({
        ...rule,
        conditions: rule.conditions.filter(c => c.id !== id)
      })
    }
  }

  const updateCondition = (id: string, updates: Partial<AlertCondition>) => {
    setRule({
      ...rule,
      conditions: rule.conditions.map(c =>
        c.id === id ? { ...c, ...updates } : c
      )
    })
  }

  const addLabel = () => {
    if (newLabelKey.trim() && newLabelValue.trim()) {
      setRule({
        ...rule,
        labels: { ...rule.labels, [newLabelKey.trim()]: newLabelValue.trim() }
      })
      setNewLabelKey('')
      setNewLabelValue('')
    }
  }

  const removeLabel = (key: string) => {
    const { [key]: removed, ...rest } = rule.labels
    setRule({ ...rule, labels: rest })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-3xl rounded-lg shadow-xl overflow-hidden"
          style={{ backgroundColor: 'var(--bg-primary)' }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" style={{ color: 'var(--interactive-primary)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-black/10 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Rule Name *
                    </label>
                    <input
                      type="text"
                      value={rule.name}
                      onChange={(e) => setRule({ ...rule, name: e.target.value })}
                      placeholder="e.g., High CPU Usage Alert"
                      className="input-themed w-full"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm" style={{ color: 'var(--status-error)' }}>{errors.name}</p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Description
                    </label>
                    <textarea
                      value={rule.description}
                      onChange={(e) => setRule({ ...rule, description: e.target.value })}
                      placeholder="Describe what this alert monitors..."
                      rows={2}
                      className="input-themed w-full resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Severity
                    </label>
                    <select
                      value={rule.severity}
                      onChange={(e) => setRule({ ...rule, severity: e.target.value as AlertRule['severity'] })}
                      className="input-themed w-full"
                    >
                      <option value="critical">Critical</option>
                      <option value="warning">Warning</option>
                      <option value="info">Info</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Evaluation Interval
                    </label>
                    <select
                      value={rule.evaluationInterval}
                      onChange={(e) => setRule({ ...rule, evaluationInterval: Number(e.target.value) })}
                      className="input-themed w-full"
                    >
                      <option value={30}>Every 30 seconds</option>
                      <option value={60}>Every 1 minute</option>
                      <option value={300}>Every 5 minutes</option>
                      <option value={600}>Every 10 minutes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Conditions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Conditions
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Match</span>
                    <select
                      value={rule.conditionLogic}
                      onChange={(e) => setRule({ ...rule, conditionLogic: e.target.value as 'all' | 'any' })}
                      className="input-themed text-xs py-1"
                    >
                      <option value="all">ALL conditions</option>
                      <option value="any">ANY condition</option>
                    </select>
                  </div>
                </div>

                {errors.conditions && (
                  <p className="text-sm" style={{ color: 'var(--status-error)' }}>{errors.conditions}</p>
                )}

                <div className="space-y-3">
                  {rule.conditions.map((condition) => (
                    <div 
                      key={condition.id}
                      className="p-4 rounded-lg border"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    >
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-4">
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Metric
                          </label>
                          <select
                            value={condition.metric}
                            onChange={(e) => updateCondition(condition.id, { metric: e.target.value })}
                            className="input-themed w-full text-sm"
                          >
                            {AVAILABLE_METRICS.map(m => (
                              <option key={m.name} value={m.name}>{m.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Operator
                          </label>
                          <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(condition.id, { operator: e.target.value as AlertCondition['operator'] })}
                            className="input-themed w-full text-sm"
                          >
                            {OPERATORS.map(op => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2">
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            Value
                          </label>
                          <input
                            type="number"
                            value={condition.value}
                            onChange={(e) => updateCondition(condition.id, { value: Number(e.target.value) })}
                            className="input-themed w-full text-sm"
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                            For Duration
                          </label>
                          <select
                            value={condition.duration}
                            onChange={(e) => updateCondition(condition.id, { duration: Number(e.target.value) })}
                            className="input-themed w-full text-sm"
                          >
                            <option value={0}>Immediately</option>
                            <option value={60}>1 minute</option>
                            <option value={300}>5 minutes</option>
                            <option value={600}>10 minutes</option>
                            <option value={900}>15 minutes</option>
                          </select>
                        </div>

                        <div className="col-span-1">
                          <button
                            onClick={() => removeCondition(condition.id)}
                            disabled={rule.conditions.length <= 1}
                            className="p-2 rounded-md transition-colors disabled:opacity-30"
                            style={{ color: 'var(--status-error)' }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addCondition}
                  className="btn-themed-secondary text-sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Condition
                </button>
              </div>

              {/* Notifications */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Notifications
                </h3>

                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      rule.notifications.email ? 'border-2' : ''
                    }`}
                    style={{ 
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: rule.notifications.email ? 'var(--interactive-primary)' : 'var(--border-primary)'
                    }}
                    onClick={() => setRule({
                      ...rule,
                      notifications: { ...rule.notifications, email: !rule.notifications.email }
                    })}
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5" style={{ color: rule.notifications.email ? 'var(--interactive-primary)' : 'var(--text-muted)' }} />
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Email</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Send email alerts</div>
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      rule.notifications.slack ? 'border-2' : ''
                    }`}
                    style={{ 
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: rule.notifications.slack ? 'var(--interactive-primary)' : 'var(--border-primary)'
                    }}
                    onClick={() => setRule({
                      ...rule,
                      notifications: { ...rule.notifications, slack: !rule.notifications.slack }
                    })}
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5" style={{ color: rule.notifications.slack ? 'var(--interactive-primary)' : 'var(--text-muted)' }} />
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Slack</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Post to Slack</div>
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      rule.notifications.webhook ? 'border-2' : ''
                    }`}
                    style={{ 
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: rule.notifications.webhook ? 'var(--interactive-primary)' : 'var(--border-primary)'
                    }}
                    onClick={() => setRule({
                      ...rule,
                      notifications: { ...rule.notifications, webhook: !rule.notifications.webhook }
                    })}
                  >
                    <div className="flex items-center gap-3">
                      <Webhook className="h-5 w-5" style={{ color: rule.notifications.webhook ? 'var(--interactive-primary)' : 'var(--text-muted)' }} />
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Webhook</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Custom webhook</div>
                      </div>
                    </div>
                  </div>
                </div>

                {rule.notifications.webhook && (
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Webhook URL *
                    </label>
                    <input
                      type="url"
                      value={rule.notifications.webhookUrl || ''}
                      onChange={(e) => setRule({
                        ...rule,
                        notifications: { ...rule.notifications, webhookUrl: e.target.value }
                      })}
                      placeholder="https://example.com/webhook"
                      className="input-themed w-full font-mono text-sm"
                    />
                    {errors.webhookUrl && (
                      <p className="mt-1 text-sm" style={{ color: 'var(--status-error)' }}>{errors.webhookUrl}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Labels */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Labels (Optional)
                </h3>

                <div className="flex flex-wrap gap-2">
                  {Object.entries(rule.labels).map(([key, value]) => (
                    <div 
                      key={key}
                      className="flex items-center gap-2 px-2 py-1 rounded-md text-sm"
                      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-primary)' }}
                    >
                      <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {key}: {value}
                      </span>
                      <button onClick={() => removeLabel(key)} className="p-0.5 hover:bg-black/10 rounded">
                        <X className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLabelKey}
                    onChange={(e) => setNewLabelKey(e.target.value)}
                    placeholder="Key"
                    className="input-themed flex-1 text-sm"
                  />
                  <input
                    type="text"
                    value={newLabelValue}
                    onChange={(e) => setNewLabelValue(e.target.value)}
                    placeholder="Value"
                    className="input-themed flex-1 text-sm"
                  />
                  <button onClick={addLabel} className="btn-themed-secondary text-sm">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <div 
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    borderColor: testResult.success ? 'var(--status-success)' : 'var(--status-error)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <Zap className="h-5 w-5" style={{ color: 'var(--status-success)' }} />
                    ) : (
                      <AlertTriangle className="h-5 w-5" style={{ color: 'var(--status-error)' }} />
                    )}
                    <span 
                      className="text-sm font-medium"
                      style={{ color: testResult.success ? 'var(--status-success)' : 'var(--status-error)' }}
                    >
                      {testResult.message}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div 
            className="flex items-center justify-between px-6 py-4 border-t"
            style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => setRule({ ...rule, enabled: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enabled</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={handleTest} className="btn-themed-secondary">
                <TestTube className="h-4 w-4 mr-2" />
                Test Rule
              </button>
              <button onClick={onClose} className="btn-themed-secondary">
                Cancel
              </button>
              <button onClick={handleSave} className="btn-themed-primary">
                <Save className="h-4 w-4 mr-2" />
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlertRuleModal

