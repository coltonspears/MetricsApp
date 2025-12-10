const API_BASE_URL = '/api/v1/dashboards'

// ============================================================================
// Types
// ============================================================================

export interface DashboardTemplate {
  id: string
  name: string
  description?: string
  version: string
  author?: string
  tags: string[]
  category?: string
  previewImage?: string
  variables: DashboardVariable[]
  panels: DashboardPanel[]
  defaultTimeRange: TimeRangeConfig
  refreshIntervalSeconds: number
  layout: DashboardLayout
  annotations: DashboardAnnotation[]
  isSystem: boolean
  isPublished: boolean
  sourcePluginId?: string
  requiredDataSourceTypes: string[]
  createdAt: string
  updatedAt: string
}

export interface DashboardVariable {
  name: string
  label: string
  description?: string
  type: DashboardVariableType
  defaultValue?: string
  query?: string
  dataSourceRef?: string
  options?: VariableOption[]
  multi: boolean
  includeAll: boolean
  sortOrder: number
  hidden: boolean
  allowedDataSourceTypes?: string[]
}

export type DashboardVariableType = 
  | 'Constant'
  | 'TextInput'
  | 'DataSource'
  | 'Query'
  | 'Custom'
  | 'Interval'

export interface VariableOption {
  value: string
  label: string
  selected: boolean
}

export interface DashboardPanel {
  id: string
  title: string
  description?: string
  type: PanelType
  gridPos: PanelGridPosition
  dataSourceRef?: string
  queries: PanelQuery[]
  options: Record<string, any>
  fieldConfig: PanelFieldConfig
  collapsed: boolean
  repeat?: PanelRepeat
  links: PanelLink[]
  alerts?: PanelAlert[]
}

export type PanelType = 
  | 'timeseries'
  | 'stat'
  | 'gauge'
  | 'bargauge'
  | 'table'
  | 'piechart'
  | 'barchart'
  | 'text'
  | 'row'
  | 'heatmap'
  | 'logs'
  | 'alertlist'

export interface PanelGridPosition {
  x: number
  y: number
  width: number
  height: number
}

export interface PanelQuery {
  refId: string
  expression: string
  format?: string
  legendFormat?: string
  interval?: string
  hidden: boolean
  queryOptions: Record<string, any>
}

export interface PanelFieldConfig {
  defaults: PanelFieldDefaults
  overrides: PanelFieldOverride[]
}

export interface PanelFieldDefaults {
  unit?: string
  decimals?: number
  min?: number
  max?: number
  color?: string
  thresholds: Threshold[]
  mappings: ValueMapping[]
}

export interface PanelFieldOverride {
  matcher: FieldMatcher
  properties: Record<string, any>
}

export interface FieldMatcher {
  id: string
  options?: string
}

export interface Threshold {
  value: number
  color: string
  label?: string
}

export interface ValueMapping {
  type: string
  match?: any
  result: MappingResult
}

export interface MappingResult {
  text?: string
  color?: string
  index?: number
}

export interface PanelRepeat {
  variable: string
  direction: 'horizontal' | 'vertical'
  maxPerRow?: number
}

export interface PanelLink {
  title: string
  url: string
  targetBlank: boolean
}

export interface PanelAlert {
  name: string
  conditions: AlertCondition[]
  evaluateEverySeconds: number
  forSeconds: number
}

export interface AlertCondition {
  type: string
  evaluator: string
  value: number
  reducer: string
}

export interface TimeRangeConfig {
  from: string
  to: string
}

export interface DashboardLayout {
  columns: number
  rowHeight: number
  draggable: boolean
  resizable: boolean
}

export interface DashboardAnnotation {
  name: string
  dataSourceRef: string
  query: string
  iconColor: string
  enabled: boolean
}

// Dashboard Instance Types
export interface DashboardInstance {
  id: string
  tenantId: string
  appId?: string
  name: string
  description?: string
  slug: string
  templateId?: string
  templateVersion?: string
  ownerId?: string
  folderId?: string
  tags: string[]
  variableValues: Record<string, DashboardVariableValue>
  panelOverrides?: DashboardPanel[]
  panels?: DashboardPanel[]
  timeRange?: TimeRangeConfig
  refreshIntervalSeconds?: number
  isStarred: boolean
  permissions: DashboardPermissions
  version: number
  syncWithTemplate: boolean
  sharing?: DashboardSharing
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  lastModifiedBy?: string
}

export interface DashboardVariableValue {
  value: any
  dataSourceId?: string
  isDefault: boolean
  selectedValues?: string[]
}

export interface DashboardPermissions {
  visibility: DashboardVisibility
  userPermissions: Record<string, DashboardPermissionLevel>
  teamPermissions: Record<string, DashboardPermissionLevel>
  allowAnonymous: boolean
}

export type DashboardVisibility = 'Private' | 'TenantPublic' | 'LinkShared' | 'Public'
export type DashboardPermissionLevel = 'View' | 'Edit' | 'Admin'

export interface DashboardSharing {
  enabled: boolean
  shareToken?: string
  expiresAt?: string
  allowEmbed: boolean
  snapshotId?: string
}

export interface DashboardFolder {
  id: string
  tenantId: string
  name: string
  parentId?: string
  description?: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface DashboardVersion {
  id: string
  dashboardId: string
  version: number
  userId?: string
  message?: string
  data: string
  createdAt: string
}

// Request Types
export interface CreateFromTemplateRequest {
  templateId: string
  tenantId: string
  appId?: string
  name?: string
  description?: string
  ownerId?: string
  folderId?: string
  tags?: string[]
  variableValues?: Record<string, DashboardVariableValue>
  syncWithTemplate?: boolean
}

export interface DashboardPatchRequest {
  name?: string
  description?: string
  tags?: string[]
  folderId?: string
  isStarred?: boolean
  timeRange?: TimeRangeConfig
  refreshIntervalSeconds?: number
  panels?: DashboardPanel[]
  variableValues?: Record<string, DashboardVariableValue>
  modifiedBy?: string
  message?: string
}

export interface DashboardExport {
  instance: DashboardInstance
  template?: DashboardTemplate
  exportedAt: string
  version: string
}

// ============================================================================
// API Client
// ============================================================================

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export class DashboardApi {
  private static async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new ApiError(
          response.status,
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      throw new ApiError(0, error instanceof Error ? error.message : 'Network error')
    }
  }

  // ========== Templates ==========

  static async getTemplates(params?: {
    category?: string
    search?: string
    tags?: string[]
  }): Promise<DashboardTemplate[]> {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.set('category', params.category)
    if (params?.search) searchParams.set('search', params.search)
    if (params?.tags) params.tags.forEach(t => searchParams.append('tags', t))
    
    const query = searchParams.toString()
    return this.request<DashboardTemplate[]>(`/templates${query ? `?${query}` : ''}`)
  }

  static async getTemplate(templateId: string): Promise<DashboardTemplate> {
    return this.request<DashboardTemplate>(`/templates/${templateId}`)
  }

  static async createTemplate(template: Omit<DashboardTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<DashboardTemplate> {
    return this.request<DashboardTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    })
  }

  static async updateTemplate(templateId: string, template: DashboardTemplate): Promise<DashboardTemplate> {
    return this.request<DashboardTemplate>(`/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    })
  }

  static async deleteTemplate(templateId: string): Promise<void> {
    return this.request<void>(`/templates/${templateId}`, {
      method: 'DELETE',
    })
  }

  static async getTemplateCategories(): Promise<string[]> {
    return this.request<string[]>('/templates/categories')
  }

  // ========== Instances ==========

  static async getInstances(params?: {
    tenantId?: string
    appId?: string
    folderId?: string
    search?: string
    starred?: boolean
  }): Promise<DashboardInstance[]> {
    const searchParams = new URLSearchParams()
    if (params?.tenantId) searchParams.set('tenantId', params.tenantId)
    if (params?.appId) searchParams.set('appId', params.appId)
    if (params?.folderId) searchParams.set('folderId', params.folderId)
    if (params?.search) searchParams.set('search', params.search)
    if (params?.starred !== undefined) searchParams.set('starred', String(params.starred))
    
    const query = searchParams.toString()
    return this.request<DashboardInstance[]>(`/instances${query ? `?${query}` : ''}`)
  }

  static async getInstance(instanceId: string): Promise<DashboardInstance> {
    return this.request<DashboardInstance>(`/instances/${instanceId}`)
  }

  static async getInstanceBySlug(tenantId: string, slug: string): Promise<DashboardInstance> {
    return this.request<DashboardInstance>(`/instances/by-slug/${tenantId}/${slug}`)
  }

  static async createFromTemplate(request: CreateFromTemplateRequest): Promise<DashboardInstance> {
    return this.request<DashboardInstance>('/instances/from-template', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  static async createInstance(instance: Omit<DashboardInstance, 'id' | 'slug' | 'version' | 'createdAt' | 'updatedAt'>): Promise<DashboardInstance> {
    return this.request<DashboardInstance>('/instances', {
      method: 'POST',
      body: JSON.stringify(instance),
    })
  }

  static async updateInstance(instanceId: string, instance: DashboardInstance, message?: string): Promise<DashboardInstance> {
    const params = message ? `?message=${encodeURIComponent(message)}` : ''
    return this.request<DashboardInstance>(`/instances/${instanceId}${params}`, {
      method: 'PUT',
      body: JSON.stringify(instance),
    })
  }

  static async patchInstance(instanceId: string, patch: DashboardPatchRequest): Promise<DashboardInstance> {
    return this.request<DashboardInstance>(`/instances/${instanceId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
  }

  static async deleteInstance(instanceId: string): Promise<void> {
    return this.request<void>(`/instances/${instanceId}`, {
      method: 'DELETE',
    })
  }

  static async toggleStar(instanceId: string): Promise<{ isStarred: boolean }> {
    return this.request<{ isStarred: boolean }>(`/instances/${instanceId}/star`, {
      method: 'POST',
    })
  }

  // ========== Versions ==========

  static async getVersions(instanceId: string): Promise<DashboardVersion[]> {
    return this.request<DashboardVersion[]>(`/instances/${instanceId}/versions`)
  }

  static async restoreVersion(instanceId: string, version: number): Promise<DashboardInstance> {
    return this.request<DashboardInstance>(`/instances/${instanceId}/versions/${version}/restore`, {
      method: 'POST',
    })
  }

  // ========== Folders ==========

  static async getFolders(tenantId: string): Promise<DashboardFolder[]> {
    return this.request<DashboardFolder[]>(`/folders?tenantId=${tenantId}`)
  }

  static async createFolder(folder: Omit<DashboardFolder, 'id' | 'createdAt' | 'updatedAt'>): Promise<DashboardFolder> {
    return this.request<DashboardFolder>('/folders', {
      method: 'POST',
      body: JSON.stringify(folder),
    })
  }

  static async updateFolder(folderId: string, folder: DashboardFolder): Promise<DashboardFolder> {
    return this.request<DashboardFolder>(`/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify(folder),
    })
  }

  static async deleteFolder(folderId: string, moveContentsToRoot = true): Promise<void> {
    return this.request<void>(`/folders/${folderId}?moveContentsToRoot=${moveContentsToRoot}`, {
      method: 'DELETE',
    })
  }

  // ========== Export/Import ==========

  static async exportDashboard(instanceId: string): Promise<DashboardExport> {
    return this.request<DashboardExport>(`/instances/${instanceId}/export`)
  }

  static async importDashboard(tenantId: string, data: DashboardExport): Promise<DashboardInstance> {
    return this.request<DashboardInstance>(`/import?tenantId=${tenantId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

export const DashboardUtils = {
  /**
   * Generate a unique panel ID
   */
  generatePanelId(): string {
    return `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  },

  /**
   * Create a default panel
   */
  createDefaultPanel(type: PanelType = 'timeseries', gridPos?: Partial<PanelGridPosition>): DashboardPanel {
    return {
      id: this.generatePanelId(),
      title: 'New Panel',
      type,
      gridPos: {
        x: 0,
        y: 0,
        width: 12,
        height: 8,
        ...gridPos,
      },
      queries: [{
        refId: 'A',
        expression: '',
        hidden: false,
        queryOptions: {},
      }],
      options: {},
      fieldConfig: {
        defaults: {
          thresholds: [],
          mappings: [],
        },
        overrides: [],
      },
      collapsed: false,
      links: [],
    }
  },

  /**
   * Parse relative time range to absolute dates
   */
  parseTimeRange(from: string, to: string): { start: Date; end: Date } {
    const now = new Date()
    
    const parseRelative = (str: string, baseDate: Date): Date => {
      if (str === 'now') return new Date(baseDate)
      
      const match = str.match(/^now-(\d+)([smhdwMy])$/)
      if (!match) return new Date(str)
      
      const [, amount, unit] = match
      const ms = parseInt(amount) * {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000,
        'M': 30 * 24 * 60 * 60 * 1000,
        'y': 365 * 24 * 60 * 60 * 1000,
      }[unit]!
      
      return new Date(baseDate.getTime() - ms)
    }
    
    return {
      start: parseRelative(from, now),
      end: parseRelative(to, now),
    }
  },

  /**
   * Format a time range for display
   */
  formatTimeRange(from: string, to: string): string {
    if (from.startsWith('now-') && to === 'now') {
      const match = from.match(/^now-(\d+)([smhdwMy])$/)
      if (match) {
        const [, amount, unit] = match
        const unitNames: Record<string, string> = {
          's': 'second',
          'm': 'minute',
          'h': 'hour',
          'd': 'day',
          'w': 'week',
          'M': 'month',
          'y': 'year',
        }
        const unitName = unitNames[unit] || unit
        return `Last ${amount} ${unitName}${parseInt(amount) > 1 ? 's' : ''}`
      }
    }
    return `${from} to ${to}`
  },

  /**
   * Resolve variable references in a query
   */
  resolveVariables(
    expression: string,
    variables: Record<string, DashboardVariableValue>
  ): string {
    let result = expression
    
    for (const [name, varValue] of Object.entries(variables)) {
      const value = Array.isArray(varValue.selectedValues)
        ? varValue.selectedValues.join('|')
        : String(varValue.value)
      
      // Replace $variable and ${variable} patterns
      result = result.replace(new RegExp(`\\$${name}\\b`, 'g'), value)
      result = result.replace(new RegExp(`\\$\\{${name}\\}`, 'g'), value)
    }
    
    return result
  },

  /**
   * Calculate next available Y position for a new panel
   */
  getNextPanelY(panels: DashboardPanel[]): number {
    if (panels.length === 0) return 0
    return Math.max(...panels.map(p => p.gridPos.y + p.gridPos.height))
  },

  /**
   * Validate a dashboard instance
   */
  validateDashboard(dashboard: Partial<DashboardInstance>): string[] {
    const errors: string[] = []
    
    if (!dashboard.name?.trim()) {
      errors.push('Dashboard name is required')
    }
    
    if (!dashboard.tenantId?.trim()) {
      errors.push('Tenant ID is required')
    }
    
    return errors
  },

  /**
   * Get panel type display info
   */
  getPanelTypeInfo(type: PanelType): { name: string; icon: string; description: string } {
    const types: Record<PanelType, { name: string; icon: string; description: string }> = {
      timeseries: { name: 'Time Series', icon: 'TrendingUp', description: 'Graph data over time' },
      stat: { name: 'Stat', icon: 'Hash', description: 'Single value with trend' },
      gauge: { name: 'Gauge', icon: 'Gauge', description: 'Gauge visualization' },
      bargauge: { name: 'Bar Gauge', icon: 'BarChart2', description: 'Horizontal bar gauge' },
      table: { name: 'Table', icon: 'Table', description: 'Tabular data view' },
      piechart: { name: 'Pie Chart', icon: 'PieChart', description: 'Pie/donut chart' },
      barchart: { name: 'Bar Chart', icon: 'BarChart3', description: 'Vertical bar chart' },
      text: { name: 'Text', icon: 'Type', description: 'Markdown/HTML text' },
      row: { name: 'Row', icon: 'Minus', description: 'Collapsible row' },
      heatmap: { name: 'Heatmap', icon: 'Grid', description: 'Heatmap visualization' },
      logs: { name: 'Logs', icon: 'FileText', description: 'Log panel' },
      alertlist: { name: 'Alert List', icon: 'AlertTriangle', description: 'List of alerts' },
    }
    
    return types[type] || { name: type, icon: 'Square', description: '' }
  },
}

export { ApiError }

