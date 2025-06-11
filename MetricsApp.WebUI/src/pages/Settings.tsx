import { useState, useEffect } from 'react'
import { Save, RefreshCw, Database, Bell, Settings as SettingsIcon } from 'lucide-react'
import { useTheme } from '../lib/theme'

interface AppSettings {
  apiUrl: string
  apiKey: string
  timeout: number
  refreshInterval: number
  dateFormat: string
  timezone: string
  chartLimit: number
  enableNotifications: boolean
}

const Settings = () => {
  const { currentTheme } = useTheme()
  const [settings, setSettings] = useState<AppSettings>({
    apiUrl: 'https://api.metricsapp.com',
    apiKey: '',
    timeout: 30,
    refreshInterval: 30,
    dateFormat: 'MM/DD/YYYY',
    timezone: 'UTC',
    chartLimit: 1000,
    enableNotifications: true
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
      apiUrl: 'https://api.metricsapp.com',
      apiKey: '',
      timeout: 30,
      refreshInterval: 30,
      dateFormat: 'MM/DD/YYYY',
      timezone: 'UTC',
      chartLimit: 1000,
      enableNotifications: true
    })
  }

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div 
          className="animate-spin rounded-full h-32 w-32 border-b-2"
          style={{ borderColor: 'var(--interactive-primary)' }}
        />
        <span 
          className="ml-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          Loading settings...
        </span>
      </div>
    )
  }

  return (
    <form className="space-y-8" onSubmit={(e) => e.preventDefault()}>
      {/* Header */}
      <div 
        className="pb-4"
        style={{ borderBottom: `1px solid var(--border-primary)` }}
      >
        <h1 
          className="text-2xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          Settings
        </h1>
        <p 
          className="mt-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Manage your application settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* General Settings */}
        <div className="lg:col-span-2 space-y-8">
          <div 
            className="shadow border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div 
              className="px-6 py-4"
              style={{ borderBottom: `1px solid var(--border-primary)` }}
            >
              <h3 
                className="text-lg font-semibold flex items-center"
                style={{ color: 'var(--text-primary)' }}
              >
                <SettingsIcon 
                  className="h-5 w-5 mr-2"
                  style={{ color: 'var(--text-accent)' }}
                />
                General Settings
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label 
                  htmlFor="refreshInterval" 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Refresh Interval
                </label>
                <select
                  id="refreshInterval"
                  className="block w-full px-3 py-3 border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                  value={settings.refreshInterval}
                  onChange={(e) => updateSettings({ refreshInterval: parseInt(e.target.value) })}
                >
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                  <option value={600}>10 minutes</option>
                </select>
              </div>

              <div>
                <label 
                  htmlFor="apiUrl" 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  API URL
                </label>
                <input
                  type="url"
                  id="apiUrl"
                  className="block w-full px-3 py-3 border focus:outline-none focus:ring-2 font-mono text-sm"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-mono)'
                  }}
                  value={settings.apiUrl}
                  onChange={(e) => updateSettings({ apiUrl: e.target.value })}
                />
              </div>

              <div>
                <label 
                  htmlFor="timeout" 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Timeout (seconds)
                </label>
                <input
                  type="number"
                  id="timeout"
                  min="1"
                  max="3600"
                  className="block w-full px-3 py-3 border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                  value={settings.timeout}
                  onChange={(e) => updateSettings({ timeout: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label 
                  htmlFor="dateFormat" 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Date Format
                </label>
                <input
                  type="text"
                  id="dateFormat"
                  className="block w-full px-3 py-3 border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                  value={settings.dateFormat}
                  onChange={(e) => updateSettings({ dateFormat: e.target.value })}
                />
              </div>

              <div>
                <label 
                  htmlFor="timezone" 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Timezone
                </label>
                <input
                  type="text"
                  id="timezone"
                  className="block w-full px-3 py-3 border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                  value={settings.timezone}
                  onChange={(e) => updateSettings({ timezone: e.target.value })}
                />
              </div>

              <div>
                <label 
                  htmlFor="chartLimit" 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Chart Limit
                </label>
                <input
                  type="number"
                  id="chartLimit"
                  min="1"
                  max="10000"
                  className="block w-full px-3 py-3 border focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-md)'
                  }}
                  value={settings.chartLimit}
                  onChange={(e) => updateSettings({ chartLimit: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* API Settings */}
          <div 
            className="shadow border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div 
              className="px-6 py-4"
              style={{ borderBottom: `1px solid var(--border-primary)` }}
            >
              <h3 
                className="text-lg font-semibold flex items-center"
                style={{ color: 'var(--text-primary)' }}
              >
                <Bell 
                  className="h-5 w-5 mr-2"
                  style={{ color: 'var(--status-warning)' }}
                />
                API Settings
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label 
                    htmlFor="apiKey" 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    API Key
                  </label>
                  <input
                    type="password"
                    id="apiKey"
                    className="block w-full px-3 py-3 border focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-md)'
                    }}
                    value={settings.apiKey}
                    onChange={(e) => updateSettings({ apiKey: e.target.value })}
                    placeholder="Enter your API key"
                  />
                </div>

                <div>
                  <label 
                    htmlFor="enableNotifications" 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Enable Notifications
                  </label>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={{
                        backgroundColor: settings.enableNotifications ? 'var(--status-success)' : 'var(--interactive-secondary)',
                        borderRadius: 'var(--radius-full)'
                      }}
                      onClick={() => updateSettings({ enableNotifications: !settings.enableNotifications })}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform shadow ring-0 transition duration-200 ease-in-out ${
                          settings.enableNotifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                        style={{ 
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--text-inverse)'
                        }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Notifications */}
          <div 
            className="shadow border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div 
              className="px-6 py-4"
              style={{ borderBottom: `1px solid var(--border-primary)` }}
            >
              <h3 
                className="text-lg font-semibold flex items-center"
                style={{ color: 'var(--text-primary)' }}
              >
                <Bell 
                  className="h-5 w-5 mr-2"
                  style={{ color: 'var(--status-info)' }}
                />
                Notifications
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Enable Notifications
                  </h4>
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Receive alerts when thresholds are exceeded
                  </p>
                </div>
                <button
                  type="button"
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{
                    backgroundColor: settings.enableNotifications ? 'var(--status-success)' : 'var(--interactive-secondary)',
                    borderRadius: 'var(--radius-full)'
                  }}
                  onClick={() => updateSettings({ enableNotifications: !settings.enableNotifications })}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform shadow ring-0 transition duration-200 ease-in-out ${
                      settings.enableNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                    style={{ 
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--text-inverse)'
                    }}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div 
            className="shadow border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div 
              className="px-6 py-4"
              style={{ borderBottom: `1px solid var(--border-primary)` }}
            >
              <h3 
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Actions
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--interactive-primary)',
                  color: 'var(--text-inverse)',
                  borderRadius: 'var(--radius-md)'
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    e.currentTarget.style.backgroundColor = 'var(--interactive-primary-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    e.currentTarget.style.backgroundColor = 'var(--interactive-primary)'
                  }
                }}
              >
                {saving ? (
                  <div 
                    className="animate-spin rounded-full h-4 w-4 border-b-2 mr-2"
                    style={{ borderColor: 'var(--text-inverse)' }}
                  />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save Settings'}
              </button>

              {saved && (
                <div 
                  className="text-center text-sm p-2"
                  style={{
                    color: 'var(--status-success)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  Settings saved successfully!
                </div>
              )}

              <button
                onClick={handleReset}
                className="w-full inline-flex justify-center items-center px-4 py-3 border text-sm font-medium transition-colors"
                style={{
                  borderColor: 'var(--border-primary)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-md)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-surface)'
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* System Info */}
          <div 
            className="shadow border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div 
              className="px-6 py-4"
              style={{ borderBottom: `1px solid var(--border-primary)` }}
            >
              <h3 
                className="text-lg font-semibold flex items-center"
                style={{ color: 'var(--text-primary)' }}
              >
                <Database 
                  className="h-5 w-5 mr-2"
                  style={{ color: 'var(--status-info)' }}
                />
                System Information
              </h3>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Version:</span>
                <span 
                  className="font-mono"
                  style={{ 
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  1.0.0
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Build:</span>
                <span 
                  className="font-mono"
                  style={{ 
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  2024.01.15
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Environment:</span>
                <span style={{ color: 'var(--text-primary)' }}>
                  <span 
                    className="inline-flex px-2 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--status-info)',
                      color: 'var(--text-inverse)',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    Development
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-secondary)' }}>Theme:</span>
                <span 
                  className="capitalize"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span 
                    className="inline-flex px-2 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--status-success)',
                      color: 'var(--text-inverse)',
                      borderRadius: 'var(--radius-full)'
                    }}
                  >
                    {currentTheme.name}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

export default Settings 