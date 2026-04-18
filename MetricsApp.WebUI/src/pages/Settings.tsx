import { useState, useEffect } from 'react'
import { Save, RefreshCw, Database, Bell, Settings as SettingsIcon, ExternalLink, Clock, Shield, Sliders } from 'lucide-react'
import { useTheme } from '../lib/theme'
import { API_BASE_URL } from '../lib/api'
import ThemeSelector from '../components/ThemeSelector'
import PageHeader from '../components/PageHeader'

function deriveScalarUrl(apiBase: string): string {
  try {
    const url = new URL(apiBase, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
    return `${url.origin}/scalar`
  } catch {
    return '/scalar'
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  refreshInterval: 30,
  alertThresholds: {
    cpu: 80,
    memory: 85,
    disk: 90,
    responseTime: 500,
  },
  dataRetention: 30,
  enableNotifications: true,
  apiEndpoint: API_BASE_URL,
  scalarURL: deriveScalarUrl(API_BASE_URL),
}

interface AppSettings {
  refreshInterval: number
  alertThresholds: {
    cpu: number
    memory: number
    disk: number
    responseTime: number
  }
  dataRetention: number
  enableNotifications: boolean
  apiEndpoint: string
  scalarURL: string
}

const Settings = () => {
  const { currentTheme } = useTheme()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // Simulate loading settings
    setTimeout(() => {
      setLoading(false)
    }, 500)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    
    // Simulate API call
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }, 1000)
  }

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  function openInNewWindow(scalarURL: string) {
    const newWindow = window.open(scalarURL, '_blank', 'noopener,noreferrer')
    if (newWindow) {
      newWindow.opener = null
    } else {
      console.error('Failed to open new window')
    }
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="flex-1 flex items-center justify-center min-h-[320px]">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-b-transparent border-themed-interactive-primary" />
            <span className="text-themed-text-secondary text-sm">Loading settings...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Application Settings"
        description="Configure your MetricsApp preferences and system parameters"
        meta={
          <span className="badge-muted">
            <SettingsIcon className="h-3 w-3" />
            v1.0.0
          </span>
        }
        actions={
          <div className="page-actions">
            <button onClick={handleReset} className="btn-themed-secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-themed-primary disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-current mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-muted">
            <Clock className="h-3 w-3" />
            Refresh: {settings.refreshInterval}s
          </span>
          <span className="badge-muted">
            <Database className="h-3 w-3" />
            Retention: {settings.dataRetention} days
          </span>
          <span className="badge-muted">
            <Bell className="h-3 w-3" />
            Notifications: {settings.enableNotifications ? 'On' : 'Off'}
          </span>
        </div>
      </PageHeader>

      {saved && (
        <div className="panel border-themed-status-success bg-green-500/5">
          <div className="flex items-center gap-2 text-themed-status-success">
            <Shield className="h-5 w-5" />
            <span className="font-medium">Settings saved successfully!</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-themed-interactive-primary" />
                <h3 className="panel-title">General Settings</h3>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="refreshInterval" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Refresh Interval
                </label>
                <select
                  id="refreshInterval"
                  className="input-themed w-full"
                  value={settings.refreshInterval}
                  onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) })}
                >
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                </select>
              </div>

              <div>
                <label htmlFor="apiEndpoint" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  API Endpoint
                </label>
                <input
                  type="url"
                  id="apiEndpoint"
                  className="input-themed w-full font-mono text-sm"
                  value={settings.apiEndpoint}
                  onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="scalarURL" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Scalar URL
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    id="scalarURL"
                    className="input-themed flex-1 font-mono text-sm"
                    value={settings.scalarURL}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => openInNewWindow(settings.scalarURL)}
                    className="btn-themed-secondary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="dataRetention" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  id="dataRetention"
                  min="1"
                  max="365"
                  className="input-themed w-full"
                  value={settings.dataRetention}
                  onChange={(e) => setSettings({ ...settings, dataRetention: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Alert Thresholds */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-themed-status-warning" />
                <h3 className="panel-title">Alert Thresholds</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cpuThreshold" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  CPU Usage (%)
                </label>
                <input
                  type="number"
                  id="cpuThreshold"
                  min="0"
                  max="100"
                  className="input-themed w-full"
                  value={settings.alertThresholds.cpu}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: { ...settings.alertThresholds, cpu: parseInt(e.target.value) }
                  })}
                />
              </div>

              <div>
                <label htmlFor="memoryThreshold" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Memory Usage (%)
                </label>
                <input
                  type="number"
                  id="memoryThreshold"
                  min="0"
                  max="100"
                  className="input-themed w-full"
                  value={settings.alertThresholds.memory}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: { ...settings.alertThresholds, memory: parseInt(e.target.value) }
                  })}
                />
              </div>

              <div>
                <label htmlFor="diskThreshold" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Disk Usage (%)
                </label>
                <input
                  type="number"
                  id="diskThreshold"
                  min="0"
                  max="100"
                  className="input-themed w-full"
                  value={settings.alertThresholds.disk}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: { ...settings.alertThresholds, disk: parseInt(e.target.value) }
                  })}
                />
              </div>

              <div>
                <label htmlFor="responseTimeThreshold" className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Response Time (ms)
                </label>
                <input
                  type="number"
                  id="responseTimeThreshold"
                  min="0"
                  className="input-themed w-full"
                  value={settings.alertThresholds.responseTime}
                  onChange={(e) => setSettings({
                    ...settings,
                    alertThresholds: { ...settings.alertThresholds, responseTime: parseInt(e.target.value) }
                  })}
                />
              </div>
            </div>
            <div className="panel-footer">
              Alerts will be triggered when metrics exceed these thresholds.
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-themed-status-info" />
                <h3 className="panel-title">Notifications</h3>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-themed-text-primary">Enable Notifications</h4>
                <p className="text-sm text-themed-text-secondary mt-1">Receive alerts when thresholds are exceeded</p>
              </div>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  settings.enableNotifications 
                    ? 'bg-themed-interactive-primary' 
                    : 'bg-themed-bg-elevated'
                }`}
                style={{ 
                  backgroundColor: settings.enableNotifications ? 'var(--interactive-primary)' : 'var(--bg-elevated)'
                }}
                onClick={() => setSettings({ ...settings, enableNotifications: !settings.enableNotifications })}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out ${
                    settings.enableNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                />
              </button>
            </div>
          </div>

          {/* Theme */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-themed-interactive-primary" />
                <h3 className="panel-title">Appearance</h3>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-themed-text-secondary mb-2">
                  Theme
                </label>
                <ThemeSelector variant="dropdown" showLabel={false} />
              </div>
              <p className="text-xs text-themed-text-muted">
                Current: {currentTheme.name} - {currentTheme.description}
              </p>
            </div>
          </div>

          {/* System Info */}
          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-themed-status-info" />
                <h3 className="panel-title">System Information</h3>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-themed-text-secondary">Version:</span>
                <span className="text-themed-text-primary font-mono">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-themed-text-secondary">Build:</span>
                <span className="text-themed-text-primary font-mono">2024.01.15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-themed-text-secondary">Environment:</span>
                <span className="badge-muted text-themed-status-info">
                  Development
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
