import { useState, useEffect } from 'react'
import { Save, RefreshCw, Database, Bell, Settings as SettingsIcon } from 'lucide-react'
import { useTheme } from '../lib/theme'
import ThemeSelector from '../components/ThemeSelector'

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
}

const Settings = () => {
  const { currentTheme } = useTheme()
  const [settings, setSettings] = useState<AppSettings>({
    refreshInterval: 30,
    alertThresholds: {
      cpu: 80,
      memory: 85,
      disk: 90,
      responseTime: 500
    },
    dataRetention: 30,
    enableNotifications: true,
    apiEndpoint: 'https://localhost:7201/api/v1'
  })
  
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
    setSettings({
      refreshInterval: 30,
      alertThresholds: {
        cpu: 80,
        memory: 85,
        disk: 90,
        responseTime: 500
      },
      dataRetention: 30,
      enableNotifications: true,
      apiEndpoint: 'https://localhost:7201/api/v1'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-themed-interactive-primary"></div>
        <span className="ml-4 text-themed-text-secondary">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-themed-border-primary pb-4">
        <h1 className="text-3xl font-bold text-themed-text-primary">Application Settings</h1>
        <p className="mt-2 text-themed-text-secondary">Configure your MetricsApp preferences and system parameters</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* General Settings */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-themed-bg-tertiary shadow-lg rounded-lg border border-themed-border-primary">
            <div className="px-6 py-4 border-b border-themed-border-primary">
              <h3 className="text-lg font-semibold text-themed-text-primary flex items-center">
                <SettingsIcon className="h-5 w-5 mr-2 themed-text-accent" />
                General Settings
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label htmlFor="refreshInterval" className="block text-sm font-medium text-themed-text-primary mb-2">
                  Refresh Interval
                </label>
                <select
                  id="refreshInterval"
                  className="block w-full px-3 py-3 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
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
                <label htmlFor="apiEndpoint" className="block text-sm font-medium text-themed-text-primary mb-2">
                  API Endpoint
                </label>
                <input
                  type="url"
                  id="apiEndpoint"
                  className="block w-full px-3 py-3 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary font-mono text-sm"
                  value={settings.apiEndpoint}
                  onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="dataRetention" className="block text-sm font-medium text-themed-text-primary mb-2">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  id="dataRetention"
                  min="1"
                  max="365"
                  className="block w-full px-3 py-3 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                  value={settings.dataRetention}
                  onChange={(e) => setSettings({ ...settings, dataRetention: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Alert Thresholds */}
          <div className="bg-themed-bg-tertiary shadow-lg rounded-lg border border-themed-border-primary">
            <div className="px-6 py-4 border-b border-themed-border-primary">
              <h3 className="text-lg font-semibold text-themed-text-primary flex items-center">
                <Bell className="h-5 w-5 mr-2 themed-status-warning" />
                Alert Thresholds
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="cpuThreshold" className="block text-sm font-medium text-themed-text-primary mb-2">
                    CPU Usage (%)
                  </label>
                  <input
                    type="number"
                    id="cpuThreshold"
                    min="0"
                    max="100"
                    className="block w-full px-3 py-3 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                    value={settings.alertThresholds.cpu}
                    onChange={(e) => setSettings({
                      ...settings,
                      alertThresholds: { ...settings.alertThresholds, cpu: parseInt(e.target.value) }
                    })}
                  />
                </div>

                <div>
                  <label htmlFor="memoryThreshold" className="block text-sm font-medium text-themed-text-primary mb-2">
                    Memory Usage (%)
                  </label>
                  <input
                    type="number"
                    id="memoryThreshold"
                    min="0"
                    max="100"
                    className="block w-full px-3 py-3 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                    value={settings.alertThresholds.memory}
                    onChange={(e) => setSettings({
                      ...settings,
                      alertThresholds: { ...settings.alertThresholds, memory: parseInt(e.target.value) }
                    })}
                  />
                </div>

                <div>
                  <label htmlFor="diskThreshold" className="block text-sm font-medium text-themed-text-primary mb-2">
                    Disk Usage (%)
                  </label>
                  <input
                    type="number"
                    id="diskThreshold"
                    min="0"
                    max="100"
                    className="block w-full px-3 py-3 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                    value={settings.alertThresholds.disk}
                    onChange={(e) => setSettings({
                      ...settings,
                      alertThresholds: { ...settings.alertThresholds, disk: parseInt(e.target.value) }
                    })}
                  />
                </div>

                <div>
                  <label htmlFor="responseTimeThreshold" className="block text-sm font-medium text-themed-text-primary mb-2">
                    Response Time (ms)
                  </label>
                  <input
                    type="number"
                    id="responseTimeThreshold"
                    min="0"
                    className="block w-full px-3 py-3 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                    value={settings.alertThresholds.responseTime}
                    onChange={(e) => setSettings({
                      ...settings,
                      alertThresholds: { ...settings.alertThresholds, responseTime: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Notifications */}
          <div className="bg-themed-bg-tertiary shadow-lg rounded-lg border border-themed-border-primary">
            <div className="px-6 py-4 border-b border-themed-border-primary">
              <h3 className="text-lg font-semibold text-themed-text-primary flex items-center">
                <Bell className="h-5 w-5 mr-2 themed-status-info" />
                Notifications
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-themed-text-primary">Enable Notifications</h4>
                  <p className="text-sm text-themed-text-secondary">Receive alerts when thresholds are exceeded</p>
                </div>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:ring-offset-2 ${
                    settings.enableNotifications ? 'bg-themed-interactive-primary' : 'bg-themed-bg-surface'
                  }`}
                  onClick={() => setSettings({ ...settings, enableNotifications: !settings.enableNotifications })}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-themed-bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                      settings.enableNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-themed-bg-tertiary shadow-lg rounded-lg border border-themed-border-primary">
            <div className="px-6 py-4 border-b border-themed-border-primary">
              <h3 className="text-lg font-semibold text-themed-text-primary">Actions</h3>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-themed-primary w-full inline-flex justify-center items-center"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-themed-text-inverse mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>

              {saved && (
                <div className="text-center text-sm text-themed-status-success bg-themed-status-success-bg bg-opacity-10 p-2 rounded-lg">
                  Settings saved successfully!
                </div>
              )}

              <button
                onClick={handleReset}
                className="btn-themed-secondary w-full inline-flex justify-center items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="bg-themed-bg-tertiary shadow-lg rounded-lg border border-themed-border-primary">
            <div className="px-6 py-4 border-b border-themed-border-primary">
              <h3 className="text-lg font-semibold text-themed-text-primary flex items-center">
                <Database className="h-5 w-5 mr-2 themed-status-info" />
                System Information
              </h3>
            </div>
            <div className="p-6 space-y-3 text-sm">
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
                <span className="text-themed-text-primary">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-themed-status-info-bg text-themed-status-info">
                    Development
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-themed-text-secondary">Theme:</span>
                <span className="text-themed-text-primary w-full flex flex-col items-end">
                  <ThemeSelector variant="dropdown" showLabel={true} />
                  <span className="mt-2 text-xs text-themed-text-secondary">
                    {currentTheme.name} - {currentTheme.description}
                  </span>
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