import { 
  DataSourceConfiguration, 
  DataSourceTypeInfo, 
  DataSourceTestResult,
  DataSourceMetadata
} from './datasource-api'

// Mock data source types
export const mockDataSourceTypes: DataSourceTypeInfo[] = [
  {
    dataSourceType: 'prometheus',
    displayName: 'Prometheus',
    description: 'Connect to Prometheus metrics server',
    version: '1.0.0',
    configurationSchema: {
      fields: [
        {
          name: 'url',
          label: 'Server URL',
          type: 'Url',
          required: true,
          placeholder: 'http://prometheus:9090'
        },
        {
          name: 'timeout',
          label: 'Timeout (seconds)',
          type: 'Number',
          required: false,
          defaultValue: 30
        }
      ],
      defaults: { timeout: 30 },
      validationRules: [
        {
          fieldName: 'url',
          type: 'Required',
          errorMessage: 'URL is required'
        },
        {
          fieldName: 'url',
          type: 'Url',
          errorMessage: 'Must be a valid URL'
        }
      ]
    }
  },
  {
    dataSourceType: 'elasticsearch',
    displayName: 'Elasticsearch',
    description: 'Connect to Elasticsearch cluster',
    version: '1.0.0',
    configurationSchema: {
      fields: [
        {
          name: 'url',
          label: 'Elasticsearch URL',
          type: 'Url',
          required: true,
          placeholder: 'http://elasticsearch:9200'
        },
        {
          name: 'index',
          label: 'Index Pattern',
          type: 'Text',
          required: true,
          placeholder: 'logs-*'
        }
      ],
      defaults: {},
      validationRules: [
        {
          fieldName: 'url',
          type: 'Required',
          errorMessage: 'URL is required'
        },
        {
          fieldName: 'index',
          type: 'Required',
          errorMessage: 'Index pattern is required'
        }
      ]
    }
  },
  {
    dataSourceType: 'mysql',
    displayName: 'MySQL',
    description: 'Connect to MySQL database',
    version: '1.0.0',
    configurationSchema: {
      fields: [
        {
          name: 'host',
          label: 'Host',
          type: 'Text',
          required: true,
          placeholder: 'localhost'
        },
        {
          name: 'port',
          label: 'Port',
          type: 'Number',
          required: true,
          defaultValue: 3306
        },
        {
          name: 'database',
          label: 'Database',
          type: 'Text',
          required: true,
          placeholder: 'myapp'
        },
        {
          name: 'username',
          label: 'Username',
          type: 'Text',
          required: true
        },
        {
          name: 'password',
          label: 'Password',
          type: 'Password',
          required: true
        }
      ],
      defaults: { port: 3306 },
      validationRules: [
        {
          fieldName: 'host',
          type: 'Required',
          errorMessage: 'Host is required'
        },
        {
          fieldName: 'database',
          type: 'Required',
          errorMessage: 'Database is required'
        }
      ]
    }
  },
  {
    dataSourceType: 'postgresql',
    displayName: 'PostgreSQL',
    description: 'Connect to PostgreSQL database',
    version: '1.0.0',
    configurationSchema: {
      fields: [
        {
          name: 'host',
          label: 'Host',
          type: 'Text',
          required: true,
          placeholder: 'localhost'
        },
        {
          name: 'port',
          label: 'Port',
          type: 'Number',
          required: true,
          defaultValue: 5432
        },
        {
          name: 'database',
          label: 'Database',
          type: 'Text',
          required: true,
          placeholder: 'myapp'
        },
        {
          name: 'username',
          label: 'Username',
          type: 'Text',
          required: true
        },
        {
          name: 'password',
          label: 'Password',
          type: 'Password',
          required: true
        }
      ],
      defaults: { port: 5432 },
      validationRules: [
        {
          fieldName: 'host',
          type: 'Required',
          errorMessage: 'Host is required'
        },
        {
          fieldName: 'database',
          type: 'Required',
          errorMessage: 'Database is required'
        }
      ]
    }
  },
  {
    dataSourceType: 'redis',
    displayName: 'Redis',
    description: 'Connect to Redis cache',
    version: '1.0.0',
    configurationSchema: {
      fields: [
        {
          name: 'host',
          label: 'Host',
          type: 'Text',
          required: true,
          placeholder: 'localhost',
          defaultValue: 'localhost'
        },
        {
          name: 'port',
          label: 'Port',
          type: 'Number',
          required: true,
          defaultValue: 6379
        },
        {
          name: 'database',
          label: 'Database',
          type: 'Number',
          required: false,
          defaultValue: 0
        },
        {
          name: 'password',
          label: 'Password',
          type: 'Password',
          required: false
        }
      ],
      defaults: { host: 'localhost', port: 6379, database: 0 },
      validationRules: [
        {
          fieldName: 'host',
          type: 'Required',
          errorMessage: 'Host is required'
        }
      ]
    }
  },
  {
    dataSourceType: 'sqlserver',
    displayName: 'SQL Server',
    description: 'Connect to Microsoft SQL Server',
    version: '1.0.0',
    configurationSchema: {
      fields: [
        {
          name: 'server',
          label: 'Server',
          type: 'Text',
          required: true,
          placeholder: 'localhost\\SQLEXPRESS'
        },
        {
          name: 'database',
          label: 'Database',
          type: 'Text',
          required: true,
          placeholder: 'MyDatabase'
        },
        {
          name: 'authType',
          label: 'Authentication Type',
          type: 'Select',
          required: true,
          defaultValue: 'Windows',
          options: [
            { value: 'Windows', label: 'Windows Authentication' },
            { value: 'SqlServer', label: 'SQL Server Authentication' }
          ]
        },
        {
          name: 'username',
          label: 'Username',
          type: 'Text',
          required: false
        },
        {
          name: 'password',
          label: 'Password',
          type: 'Password',
          required: false
        }
      ],
      defaults: { authType: 'Windows' },
      validationRules: [
        {
          fieldName: 'server',
          type: 'Required',
          errorMessage: 'Server is required'
        },
        {
          fieldName: 'database',
          type: 'Required',
          errorMessage: 'Database is required'
        }
      ]
    }
  }
]

// Mock stored data sources
let mockDataSources: DataSourceConfiguration[] = [
  {
    id: '1',
    name: 'Production Prometheus',
    dataSourceType: 'prometheus',
    url: 'http://prometheus.prod:9090',
    properties: { timeout: 30 },
    isEnabled: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    name: 'App Logs',
    dataSourceType: 'elasticsearch',
    url: 'http://elasticsearch.prod:9200',
    properties: { index: 'app-logs-*' },
    isEnabled: true,
    createdAt: '2024-01-16T14:30:00Z',
    updatedAt: '2024-01-16T14:30:00Z'
  }
]

export class MockDataSourceApi {
  // Simulate network delay
  private static delay(ms: number = 500) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  static async getDataSourceTypes(): Promise<DataSourceTypeInfo[]> {
    await this.delay(300)
    return [...mockDataSourceTypes]
  }

  static async getDataSourceType(dataSourceType: string): Promise<DataSourceTypeInfo> {
    await this.delay(200)
    const type = mockDataSourceTypes.find(t => t.dataSourceType === dataSourceType)
    if (!type) {
      throw new Error(`DataSource type '${dataSourceType}' not found`)
    }
    return type
  }

  static async getDataSources(): Promise<DataSourceConfiguration[]> {
    await this.delay(300)
    return [...mockDataSources]
  }

  static async getDataSource(id: string): Promise<DataSourceConfiguration> {
    await this.delay(200)
    const ds = mockDataSources.find(d => d.id === id)
    if (!ds) {
      throw new Error(`DataSource with id '${id}' not found`)
    }
    return { ...ds }
  }

  static async createDataSource(configuration: Omit<DataSourceConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataSourceConfiguration> {
    await this.delay(600)
    
    // Simulate validation
    if (!configuration.name.trim()) {
      throw new Error('Name is required')
    }
    
    const now = new Date().toISOString()
    const newDataSource: DataSourceConfiguration = {
      ...configuration,
      id: String(Date.now()),
      createdAt: now,
      updatedAt: now
    }
    
    mockDataSources.push(newDataSource)
    return { ...newDataSource }
  }

  static async updateDataSource(configuration: DataSourceConfiguration): Promise<DataSourceConfiguration> {
    await this.delay(500)
    
    const index = mockDataSources.findIndex(d => d.id === configuration.id)
    if (index === -1) {
      throw new Error(`DataSource with id '${configuration.id}' not found`)
    }
    
    const updated = {
      ...configuration,
      updatedAt: new Date().toISOString()
    }
    
    mockDataSources[index] = updated
    return { ...updated }
  }

  static async deleteDataSource(id: string): Promise<void> {
    await this.delay(300)
    
    const index = mockDataSources.findIndex(d => d.id === id)
    if (index === -1) {
      throw new Error(`DataSource with id '${id}' not found`)
    }
    
    mockDataSources.splice(index, 1)
  }

  static async testDataSource(configuration: Omit<DataSourceConfiguration, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataSourceTestResult> {
    await this.delay(800) // Simulate longer test time
    
    // Basic validation
    if (!configuration.name.trim()) {
      return {
        isSuccess: false,
        responseTimeMs: 0,
        errorMessage: 'Name is required',
        details: 'Please provide a name for the data source'
      }
    }
    
    // Simulate different test scenarios based on configuration
    const random = Math.random()
    
    if (random < 0.1) {
      // 10% chance of failure
      return {
        isSuccess: false,
        responseTimeMs: 1200,
        errorMessage: 'Connection timeout',
        details: 'Unable to connect to the specified endpoint within the timeout period'
      }
    } else if (random < 0.2) {
      // 10% chance of auth failure
      return {
        isSuccess: false,
        responseTimeMs: 450,
        errorMessage: 'Authentication failed',
        details: 'Invalid credentials or insufficient permissions'
      }
    } else {
      // 80% chance of success
      return {
        isSuccess: true,
        responseTimeMs: Math.floor(200 + Math.random() * 300),
        details: 'Connection established successfully',
        version: '1.0.0',
        testedAt: new Date().toISOString(),
        metadata: {
          endpoint: configuration.url,
          type: configuration.dataSourceType
        }
      }
    }
  }

  static async getDataSourceMetadata(id: string): Promise<DataSourceMetadata> {
    await this.delay(400)
    
    const ds = mockDataSources.find(d => d.id === id)
    if (!ds) {
      throw new Error(`DataSource with id '${id}' not found`)
    }
    
    // Return mock metadata based on datasource type
    return {
      availableMetrics: [
        'cpu_usage_percent',
        'memory_usage_bytes',
        'disk_io_read_bytes',
        'disk_io_write_bytes',
        'network_bytes_sent',
        'network_bytes_received'
      ],
      availableFields: [
        { name: 'timestamp', type: 'datetime', isSearchable: true, isAggregatable: false },
        { name: 'host', type: 'string', isSearchable: true, isAggregatable: false },
        { name: 'value', type: 'number', isSearchable: false, isAggregatable: true }
      ],
      availableTags: [
        { name: 'environment', values: ['production', 'staging', 'development'] },
        { name: 'region', values: ['us-east-1', 'us-west-2', 'eu-west-1'] }
      ],
      timeRange: {
        earliestTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        latestTime: new Date().toISOString()
      },
      lastUpdated: new Date().toISOString()
    }
  }

  static async validateConfiguration(dataSourceType: string, configuration: Record<string, any>): Promise<{ isValid: boolean; errors: string[] }> {
    await this.delay(200)
    
    const errors: string[] = []
    
    // Basic validation
    if (!configuration.name?.trim()) {
      errors.push('Name is required')
    }
    
    // Type-specific validation
    const typeInfo = mockDataSourceTypes.find(t => t.dataSourceType === dataSourceType)
    if (!typeInfo) {
      errors.push('Unknown data source type')
      return { isValid: false, errors }
    }
    
    // Validate required fields
    typeInfo.configurationSchema.fields.forEach(field => {
      if (field.required && !configuration[field.name]) {
        errors.push(`${field.label} is required`)
      }
    })
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
} 