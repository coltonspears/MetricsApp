export interface DashboardConfig {
  tenant: {
    id: string
    name: string
    theme?: 'default' | 'corporate' | 'minimal'
  }
  kpis: {
    enabled: boolean
    refreshInterval: number
    customKpis?: CustomKpi[]
  }
  charts: {
    timeline: { enabled: boolean; timeRange: string; aggregation?: 'sum' | 'avg' | 'count' }
    metricTypes: { enabled: boolean; limit: number; chartType?: 'bar' | 'pie' }
    servers: { enabled: boolean; limit: number; sortBy?: 'count' | 'name' }
    environment: { enabled: boolean; showPercentages?: boolean }
    custom?: CustomChart[]
  }
  filters: {
    defaultTimeRange: string
    allowedEnvironments?: string[]
    allowedMetricTypes?: string[]
  }
  branding?: {
    logo?: string
    primaryColor?: string
    secondaryColor?: string
  }
}

export interface CustomKpi {
  id: string
  title: string
  icon: string
  query: string
  format: 'number' | 'percentage' | 'duration' | 'bytes'
  color?: string
}

export interface CustomChart {
  id: string
  title: string
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter'
  query: string
  position: { row: number; col: number; width: number; height: number }
  config?: {
    xAxis?: string
    yAxis?: string
    groupBy?: string
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
    timeWindow?: string
  }
}

// Default configurations for different tenant types
export const defaultConfigs: Record<string, DashboardConfig> = {
  enterprise: {
    tenant: { id: 'enterprise', name: 'Enterprise Dashboard', theme: 'corporate' },
    kpis: {
      enabled: true,
      refreshInterval: 30000,
      customKpis: [
        {
          id: 'sla-uptime',
          title: 'SLA Uptime',
          icon: 'TrendingUp',
          query: 'uptime_percentage',
          format: 'percentage',
          color: '#10b981'
        }
      ]
    },
    charts: {
      timeline: { enabled: true, timeRange: '24h', aggregation: 'avg' },
      metricTypes: { enabled: true, limit: 15, chartType: 'bar' },
      servers: { enabled: true, limit: 12, sortBy: 'count' },
      environment: { enabled: true, showPercentages: true },
      custom: [
        {
          id: 'response-time-trend',
          title: 'Response Time Trend',
          type: 'line',
          query: 'response_time',
          position: { row: 2, col: 1, width: 2, height: 1 },
          config: {
            timeWindow: '1h',
            aggregation: 'avg'
          }
        }
      ]
    },
    filters: {
      defaultTimeRange: '24h',
      allowedEnvironments: ['Production', 'Staging'],
      allowedMetricTypes: ['cpu', 'memory', 'disk', 'network', 'response_time']
    },
    branding: {
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6'
    }
  },
  
  startup: {
    tenant: { id: 'startup', name: 'Startup Dashboard', theme: 'minimal' },
    kpis: {
      enabled: true,
      refreshInterval: 60000
    },
    charts: {
      timeline: { enabled: true, timeRange: '1h', aggregation: 'count' },
      metricTypes: { enabled: true, limit: 8, chartType: 'pie' },
      servers: { enabled: true, limit: 5, sortBy: 'name' },
      environment: { enabled: false }
    },
    filters: {
      defaultTimeRange: '1h'
    }
  },
  
  development: {
    tenant: { id: 'development', name: 'Development Dashboard', theme: 'default' },
    kpis: {
      enabled: true,
      refreshInterval: 15000
    },
    charts: {
      timeline: { enabled: true, timeRange: '30m', aggregation: 'count' },
      metricTypes: { enabled: true, limit: 12, chartType: 'bar' },
      servers: { enabled: true, limit: 10, sortBy: 'count' },
      environment: { enabled: true, showPercentages: false }
    },
    filters: {
      defaultTimeRange: '30m',
      allowedEnvironments: ['Development', 'Testing']
    }
  }
}

export class DashboardConfigManager {
  private static readonly STORAGE_KEY = 'dashboard-config'
  
  static getConfig(tenantId?: string): DashboardConfig {
    // Try to load from localStorage first
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (error) {
        console.warn('Failed to parse stored dashboard config:', error)
      }
    }
    
    // Fall back to default config based on tenant
    if (tenantId && defaultConfigs[tenantId]) {
      return defaultConfigs[tenantId]
    }
    
    // Ultimate fallback to enterprise config
    return defaultConfigs.enterprise
  }
  
  static saveConfig(config: DashboardConfig): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save dashboard config:', error)
    }
  }
  
  static async loadConfigFromApi(tenantId: string): Promise<DashboardConfig> {
    try {
      // This would be replaced with actual API call
      const response = await fetch(`/api/v1/dashboard/config/${tenantId}`)
      if (response.ok) {
        const config = await response.json()
        this.saveConfig(config)
        return config
      }
    } catch (error) {
      console.warn('Failed to load config from API, using defaults:', error)
    }
    
    return this.getConfig(tenantId)
  }
  
  static updateConfig(updates: Partial<DashboardConfig>): DashboardConfig {
    const current = this.getConfig()
    const updated = this.mergeConfigs(current, updates)
    this.saveConfig(updated)
    return updated
  }
  
  private static mergeConfigs(base: DashboardConfig, updates: Partial<DashboardConfig>): DashboardConfig {
    return {
      ...base,
      ...updates,
      tenant: { ...base.tenant, ...updates.tenant },
      kpis: { ...base.kpis, ...updates.kpis },
      charts: { ...base.charts, ...updates.charts },
      filters: { ...base.filters, ...updates.filters },
      branding: { ...base.branding, ...updates.branding }
    }
  }
}

// Utility functions for working with dashboard configs
export const DashboardUtils = {
  getTimeRangeInMs(timeRange: string): number {
    const unit = timeRange.slice(-1)
    const value = parseInt(timeRange.slice(0, -1))
    
    switch (unit) {
      case 'm': return value * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'd': return value * 24 * 60 * 60 * 1000
      default: return 60 * 60 * 1000 // Default to 1 hour
    }
  },
  
  formatMetricValue(value: number, format: CustomKpi['format']): string {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'duration':
        return `${value.toFixed(0)}ms`
      case 'bytes':
        const units = ['B', 'KB', 'MB', 'GB', 'TB']
        let size = value
        let unitIndex = 0
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024
          unitIndex++
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`
      case 'number':
      default:
        return value.toLocaleString()
    }
  },
  
  getChartColors(theme: DashboardConfig['tenant']['theme'] = 'default'): string[] {
    switch (theme) {
      case 'corporate':
        return ['#1e40af', '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe']
      case 'minimal':
        return ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6']
      case 'default':
      default:
        return ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']
    }
  }
} 