const API_BASE_URL = '/api/v1'

// Types for DataSource API
export interface DataSourceConfiguration {
  id: string
  name: string
  dataSourceType: string
  url: string
  properties: Record<string, any>
  authentication?: DataSourceAuthentication
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface DataSourceAuthentication {
  type: 'None' | 'Basic' | 'Bearer' | 'ApiKey' | 'OAuth2'
  username?: string
  password?: string
  token?: string
  apiKey?: string
  apiKeyHeader?: string
  properties?: Record<string, string>
}

export interface DataSourceTypeInfo {
  dataSourceType: string
  displayName: string
  description: string
  version: string
  configurationSchema: DataSourceConfigurationSchema
}

export interface DataSourceConfigurationSchema {
  fields: ConfigurationField[]
  defaults: Record<string, any>
  validationRules: ValidationRule[]
}

export interface ConfigurationField {
  name: string
  label: string
  description?: string
  type: 'Text' | 'Number' | 'Boolean' | 'Url' | 'Password' | 'Select'
  required: boolean
  defaultValue?: any
  placeholder?: string
  options?: string[]
}

export interface ValidationRule {
  fieldName: string
  type: 'Required' | 'MinLength' | 'MaxLength' | 'Pattern' | 'Range' | 'Url' | 'Email'
  value?: any
  errorMessage: string
}

export interface DataSourceTestResult {
  isSuccess: boolean
  responseTimeMs: number
  errorMessage?: string
  details?: string
  version?: string
  metadata?: Record<string, any>
  testedAt?: string
}

export interface DataSourceMetadata {
  availableMetrics: string[]
  availableFields: DataSourceField[]
  availableTags: DataSourceTag[]
  timeRange?: {
    earliestTime: string
    latestTime: string
  }
  properties?: Record<string, any>
  lastUpdated?: string
}

export interface DataSourceField {
  name: string
  type: string
  description?: string
  isSearchable: boolean
  isAggregatable: boolean
}

export interface DataSourceTag {
  name: string
  values: string[]
  description?: string
}

export interface LogQueryCriteria {
  query?: string
  startTime: string
  endTime: string
  limit?: number
  offset?: number
  severityLevel?: string
}

export interface MetricQueryCriteria {
  query: string
  startTime: string
  endTime: string
  step?: string
}

export interface LogQueryResult {
  logs: LogRecord[]
  totalHits: number
  errorMessage?: string
}

export interface LogRecord {
  timestamp: string
  severityText: string
  body: string
  attributes: Record<string, any>
  resource: Record<string, any>
}

export interface MetricQueryResult {
  resultType: string
  result?: any[]
  errorMessage?: string
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export class DataSourceApi {
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
        const errorText = await response.text()
        throw new ApiError(response.status, `HTTP ${response.status}: ${errorText || response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(0, 'Network error: Unable to connect to the API. Please ensure the service is running.')
      }
      
      throw new ApiError(500, error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  // DataSource Type Management
  static async getDataSourceTypes(): Promise<DataSourceTypeInfo[]> {
    const response = await fetch(`${API_BASE_URL}/datasources/types`)
    if (!response.ok) {
      throw new ApiError(response.status, `Failed to fetch datasource types: ${response.statusText}`)
    }
    return response.json()
  }

  static async getDataSourceType(dataSourceType: string): Promise<DataSourceTypeInfo> {
    const response = await fetch(`${API_BASE_URL}/datasources/types/${encodeURIComponent(dataSourceType)}`)
    if (!response.ok) {
      throw new ApiError(response.status, `Failed to fetch datasource type: ${response.statusText}`)
    }
    return response.json()
  }

  // DataSource Configuration Management
  static async getDataSources(): Promise<DataSourceConfiguration[]> {
    return this.request<DataSourceConfiguration[]>('/datasources')
  }

  static async getDataSource(id: string): Promise<DataSourceConfiguration> {
    return this.request<DataSourceConfiguration>(`/datasources/${id}`)
  }

  static async createDataSource(configuration: Omit<DataSourceConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataSourceConfiguration> {
    return this.request<DataSourceConfiguration>('/datasources', {
      method: 'POST',
      body: JSON.stringify(configuration)
    })
  }

  static async updateDataSource(configuration: DataSourceConfiguration): Promise<DataSourceConfiguration> {
    return this.request<DataSourceConfiguration>(`/datasources/${configuration.id}`, {
      method: 'PUT',
      body: JSON.stringify(configuration)
    })
  }

  static async deleteDataSource(id: string): Promise<void> {
    await this.request<void>(`/datasources/${id}`, {
      method: 'DELETE'
    })
  }

  // DataSource Testing
  static async testDataSource(configuration: Omit<DataSourceConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataSourceTestResult> {
    return this.request<DataSourceTestResult>('/datasources/test', {
      method: 'POST',
      body: JSON.stringify(configuration)
    })
  }

  // DataSource Metadata
  static async getDataSourceMetadata(id: string): Promise<DataSourceMetadata> {
    return this.request<DataSourceMetadata>(`/datasources/${id}/metadata`)
  }

  // DataSource Querying
  static async queryLogs(id: string, criteria: LogQueryCriteria): Promise<LogQueryResult> {
    return this.request<LogQueryResult>(`/datasources/${id}/query/logs`, {
      method: 'POST',
      body: JSON.stringify(criteria)
    })
  }

  static async queryMetrics(id: string, criteria: MetricQueryCriteria): Promise<MetricQueryResult> {
    return this.request<MetricQueryResult>(`/datasources/${id}/query/metrics`, {
      method: 'POST',
      body: JSON.stringify(criteria)
    })
  }

  // Utility methods
  static async validateConfiguration(dataSourceType: string, configuration: Record<string, any>): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const typeInfo = await this.getDataSourceType(dataSourceType)
      const errors: string[] = []

      // Validate required fields
      typeInfo.configurationSchema.fields.forEach(field => {
        if (field.required && !configuration[field.name]) {
          errors.push(`${field.label} is required`)
        }
      })

      // Validate against validation rules
      typeInfo.configurationSchema.validationRules.forEach(rule => {
        const value = configuration[rule.fieldName]
        
        switch (rule.type) {
          case 'Required':
            if (!value) {
              errors.push(rule.errorMessage)
            }
            break
          case 'Url':
            if (value && !isValidUrl(value)) {
              errors.push(rule.errorMessage)
            }
            break
          case 'MinLength':
            if (value && value.length < rule.value) {
              errors.push(rule.errorMessage)
            }
            break
          case 'MaxLength':
            if (value && value.length > rule.value) {
              errors.push(rule.errorMessage)
            }
            break
          case 'Pattern':
            if (value && !new RegExp(rule.value).test(value)) {
              errors.push(rule.errorMessage)
            }
            break
        }
      })

      return {
        isValid: errors.length === 0,
        errors
      }
    } catch (error) {
      return {
        isValid: false,
        errors: ['Failed to validate configuration: ' + (error instanceof Error ? error.message : 'Unknown error')]
      }
    }
  }
}

// Utility functions
function isValidUrl(string: string): boolean {
  try {
    new URL(string)
    return true
  } catch (_) {
    return false
  }
}

export { ApiError } 