import { useState } from 'react'
import { Settings, X, Save, RotateCcw } from 'lucide-react'
import { DashboardConfigManager, defaultConfigs, type DashboardConfig } from '../lib/dashboard-config'

interface DashboardConfigPanelProps {
  config: DashboardConfig
  onConfigChange: (config: DashboardConfig) => void
  isOpen: boolean
  onClose: () => void
}

const DashboardConfigPanel = ({ config, onConfigChange, isOpen, onClose }: DashboardConfigPanelProps) => {
  const [localConfig, setLocalConfig] = useState<DashboardConfig>(config)

  const handleSave = () => {
    DashboardConfigManager.saveConfig(localConfig)
    onConfigChange(localConfig)
    onClose()
  }

  const handleReset = () => {
    const defaultConfig = defaultConfigs.enterprise
    setLocalConfig(defaultConfig)
  }

  const handlePresetChange = (presetId: string) => {
    if (defaultConfigs[presetId]) {
      setLocalConfig(defaultConfigs[presetId])
    }
  }

  const updateConfig = (path: string, value: any) => {
    const keys = path.split('.')
    const newConfig = { ...localConfig }
    let current: any = newConfig
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
    
    setLocalConfig(newConfig)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-slate-800 shadow-xl border-l border-slate-200 dark:border-slate-700">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center">
              <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400 mr-2" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Dashboard Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Preset Configurations */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Configuration Presets
              </label>
              <div className="space-y-2">
                {Object.entries(defaultConfigs).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handlePresetChange(key)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      localConfig.tenant.id === preset.tenant.id
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-medium">{preset.tenant.name}</div>
                    <div className="text-sm opacity-75">
                      {preset.tenant.theme} theme • {preset.kpis.refreshInterval / 1000}s refresh
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tenant Settings */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Tenant Settings
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Dashboard Name
                  </label>
                  <input
                    type="text"
                    value={localConfig.tenant.name}
                    onChange={(e) => updateConfig('tenant.name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Theme
                  </label>
                  <select
                    value={localConfig.tenant.theme || 'default'}
                    onChange={(e) => updateConfig('tenant.theme', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="default">Default</option>
                    <option value="corporate">Corporate</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* KPI Settings */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                KPI Settings
              </label>
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="kpis-enabled"
                    checked={localConfig.kpis.enabled}
                    onChange={(e) => updateConfig('kpis.enabled', e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                  />
                  <label htmlFor="kpis-enabled" className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                    Enable KPI Cards
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Refresh Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={localConfig.kpis.refreshInterval / 1000}
                    onChange={(e) => updateConfig('kpis.refreshInterval', parseInt(e.target.value) * 1000)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Chart Settings */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Chart Settings
              </label>
              <div className="space-y-4">
                {/* Timeline Chart */}
                <div className="p-3 border border-slate-200 dark:border-slate-600 rounded-lg">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="timeline-enabled"
                      checked={localConfig.charts.timeline.enabled}
                      onChange={(e) => updateConfig('charts.timeline.enabled', e.target.checked)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                    />
                    <label htmlFor="timeline-enabled" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Timeline Chart
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Time Range
                    </label>
                    <select
                      value={localConfig.charts.timeline.timeRange}
                      onChange={(e) => updateConfig('charts.timeline.timeRange', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="30m">30 minutes</option>
                      <option value="1h">1 hour</option>
                      <option value="4h">4 hours</option>
                      <option value="24h">24 hours</option>
                      <option value="7d">7 days</option>
                    </select>
                  </div>
                </div>

                {/* Metric Types Chart */}
                <div className="p-3 border border-slate-200 dark:border-slate-600 rounded-lg">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="metricTypes-enabled"
                      checked={localConfig.charts.metricTypes.enabled}
                      onChange={(e) => updateConfig('charts.metricTypes.enabled', e.target.checked)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                    />
                    <label htmlFor="metricTypes-enabled" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Metric Types Chart
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Limit
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="20"
                        value={localConfig.charts.metricTypes.limit}
                        onChange={(e) => updateConfig('charts.metricTypes.limit', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Chart Type
                      </label>
                      <select
                        value={localConfig.charts.metricTypes.chartType || 'bar'}
                        onChange={(e) => updateConfig('charts.metricTypes.chartType', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="bar">Bar Chart</option>
                        <option value="pie">Pie Chart</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Servers Chart */}
                <div className="p-3 border border-slate-200 dark:border-slate-600 rounded-lg">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="servers-enabled"
                      checked={localConfig.charts.servers.enabled}
                      onChange={(e) => updateConfig('charts.servers.enabled', e.target.checked)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                    />
                    <label htmlFor="servers-enabled" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Server Activity Chart
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Limit
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="15"
                        value={localConfig.charts.servers.limit}
                        onChange={(e) => updateConfig('charts.servers.limit', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Sort By
                      </label>
                      <select
                        value={localConfig.charts.servers.sortBy || 'count'}
                        onChange={(e) => updateConfig('charts.servers.sortBy', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="count">Activity Count</option>
                        <option value="name">Server Name</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Environment Chart */}
                <div className="p-3 border border-slate-200 dark:border-slate-600 rounded-lg">
                  <div className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id="environment-enabled"
                      checked={localConfig.charts.environment.enabled}
                      onChange={(e) => updateConfig('charts.environment.enabled', e.target.checked)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                    />
                    <label htmlFor="environment-enabled" className="ml-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      Environment Distribution
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="environment-percentages"
                      checked={localConfig.charts.environment.showPercentages || false}
                      onChange={(e) => updateConfig('charts.environment.showPercentages', e.target.checked)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                    />
                    <label htmlFor="environment-percentages" className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                      Show percentages
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleReset}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 border border-transparent rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardConfigPanel 