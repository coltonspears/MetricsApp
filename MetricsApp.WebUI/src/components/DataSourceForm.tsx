import { useState, useEffect } from 'react'
import { Eye, EyeOff, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { 
  DataSourceConfiguration, 
  DataSourceTypeInfo, 
  DataSourceTestResult,
  ConfigurationField,
  DataSourceApi 
} from '../lib/datasource-api'

interface DataSourceFormProps {
  dataSourceTypes: DataSourceTypeInfo[]
  initialData?: DataSourceConfiguration
  preselectedType?: string
  onSubmit: (data: Omit<DataSourceConfiguration, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function DataSourceForm({ 
  dataSourceTypes, 
  initialData, 
  preselectedType, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}: DataSourceFormProps) {
  const [selectedType, setSelectedType] = useState<string>(preselectedType || initialData?.dataSourceType || '')
  const [formData, setFormData] = useState<Record<string, any>>({
    name: initialData?.name || '',
    url: initialData?.url || '',
    isEnabled: initialData?.isEnabled ?? true,
    properties: initialData?.properties || {},
    authentication: initialData?.authentication || { type: 'None' }
  })
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState<DataSourceTestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const selectedTypeInfo = dataSourceTypes.find(t => t.dataSourceType === selectedType)

  useEffect(() => {
    if (selectedTypeInfo) {
      // Apply default values from schema
      const newProperties = { ...formData.properties }
      selectedTypeInfo.configurationSchema.fields.forEach(field => {
        if (field.defaultValue !== undefined && newProperties[field.name] === undefined) {
          newProperties[field.name] = field.defaultValue
        }
      })
      setFormData(prev => ({ ...prev, properties: newProperties }))
    }
  }, [selectedType, selectedTypeInfo])

  const handleFieldChange = (fieldName: string, value: any) => {
    if (fieldName === 'name' || fieldName === 'url' || fieldName === 'isEnabled') {
      setFormData(prev => ({ ...prev, [fieldName]: value }))
    } else {
      setFormData(prev => ({
        ...prev,
        properties: { ...prev.properties, [fieldName]: value }
      }))
    }
    
    // Clear test result when configuration changes
    setTestResult(null)
    setValidationErrors([])
  }

  const handleAuthFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      authentication: {
        ...prev.authentication,
        [fieldName]: value
      }
    }))
    setTestResult(null)
  }

  const handleTestConnection = async () => {
    if (!selectedTypeInfo) return

    // Validate required fields before testing
    if (!formData.name.trim()) {
      setTestResult({
        isSuccess: false,
        responseTimeMs: 0,
        errorMessage: 'Name is required',
        details: 'Please enter a name for the datasource'
      })
      return
    }

    // Validate based on datasource type
    if (selectedType === 'sqlserver') {
      // Validate SQL Server specific fields
      const server = formData.properties['server']?.trim()
      const database = formData.properties['database']?.trim()
      const authType = formData.properties['authType'] || 'Windows'
      
      if (!server) {
        setTestResult({
          isSuccess: false,
          responseTimeMs: 0,
          errorMessage: 'Server is required',
          details: 'Please enter a SQL Server instance name or IP address'
        })
        return
      }
      
      if (!database) {
        setTestResult({
          isSuccess: false,
          responseTimeMs: 0,
          errorMessage: 'Database is required',
          details: 'Please enter a database name'
        })
        return
      }
      
      if (authType === 'SqlServer') {
        const username = formData.properties['username']?.trim()
        const password = formData.properties['password']?.trim()
        
        if (!username || !password) {
          setTestResult({
            isSuccess: false,
            responseTimeMs: 0,
            errorMessage: 'Username and password are required for SQL Server authentication',
            details: 'Please enter both username and password'
          })
          return
        }
      }
    } else {
      // For other datasources, validate URL
      if (!formData.url.trim()) {
        setTestResult({
          isSuccess: false,
          responseTimeMs: 0,
          errorMessage: 'URL is required',
          details: 'Please enter a valid URL'
        })
        return
      }
      
      // Validate authentication fields if authentication is enabled
      if (formData.authentication?.type === 'Basic') {
        if (!formData.authentication.username?.trim() || !formData.authentication.password?.trim()) {
          setTestResult({
            isSuccess: false,
            responseTimeMs: 0,
            errorMessage: 'Username and password are required for basic authentication',
            details: 'Please enter both username and password'
          })
          return
        }
      } else if (formData.authentication?.type === 'Bearer') {
        if (!formData.authentication.token?.trim()) {
          setTestResult({
            isSuccess: false,
            responseTimeMs: 0,
            errorMessage: 'Bearer token is required',
            details: 'Please enter a bearer token'
          })
          return
        }
      } else if (formData.authentication?.type === 'ApiKey') {
        if (!formData.authentication.apiKey?.trim()) {
          setTestResult({
            isSuccess: false,
            responseTimeMs: 0,
            errorMessage: 'API key is required',
            details: 'Please enter an API key'
          })
          return
        }
      }
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const testConfig = {
        name: formData.name,
        dataSourceType: selectedType,
        url: formData.url,
        properties: formData.properties,
        authentication: formData.authentication?.type === 'None' ? null : {
          ...formData.authentication,
          type: formData.authentication?.type === 'None' ? 0 :
                formData.authentication?.type === 'Basic' ? 1 :
                formData.authentication?.type === 'Bearer' ? 2 :
                formData.authentication?.type === 'ApiKey' ? 3 :
                formData.authentication?.type === 'OAuth2' ? 4 : 0
        },
        isEnabled: formData.isEnabled
      }

      const result = await DataSourceApi.testDataSource(testConfig)
      setTestResult(result)
    } catch (error) {
      setTestResult({
        isSuccess: false,
        responseTimeMs: 0,
        errorMessage: error instanceof Error ? error.message : 'Test failed',
        details: 'Unable to test connection'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTypeInfo) return

    // Validate configuration
    const validation = await DataSourceApi.validateConfiguration(selectedType, {
      ...formData.properties,
      url: formData.url,
      name: formData.name
    })

    if (!validation.isValid) {
      setValidationErrors(validation.errors)
      return
    }

    setValidationErrors([])

    // Convert authentication type to numeric value for backend
    const authType = formData.authentication?.type === 'None' ? 0 :
                    formData.authentication?.type === 'Basic' ? 1 :
                    formData.authentication?.type === 'Bearer' ? 2 :
                    formData.authentication?.type === 'ApiKey' ? 3 :
                    formData.authentication?.type === 'OAuth2' ? 4 : 0

    const submitData = {
      name: formData.name,
      dataSourceType: selectedType,
      url: formData.url,
      properties: formData.properties,
      authentication: formData.authentication?.type === 'None' ? null : {
        ...formData.authentication,
        type: authType
      },
      isEnabled: formData.isEnabled
    }

    await onSubmit(submitData)
  }

  const renderField = (field: ConfigurationField) => {
    const value = field.name === 'url' ? formData.url : formData.properties[field.name] || ''
    
    // For SQL Server datasource, conditionally render username/password fields
    if (selectedType === 'sqlserver') {
      const authType = formData.properties['authType'] || 'Windows'
      
      // Hide username/password fields when using Windows Authentication
      if ((field.name === 'username' || field.name === 'password') && authType === 'Windows') {
        return null
      }
    }
    
    switch (field.type) {
      case 'Boolean':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field.name}
              checked={value}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              className="h-4 w-4 bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary font-mono rounded"
            />
            <label htmlFor={field.name} className="ml-2 block text-sm text-themed-text-primary">
              {field.label}
            </label>
          </div>
        )

      case 'Number':
        return (
          <input
            type="number"
            id={field.name}
            value={value}
            onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value) || 0)}
            placeholder={field.placeholder}
            className="mt-1 block w-full px-4 py-3 border-themed-border-primary bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary font-mono"
            required={field.required}
          />
        )

      case 'Password':
        return (
          <div className="relative">
            <input
              type={showPasswords[field.name] ? 'text' : 'password'}
              id={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="mt-1 block w-full pl-4 pr-10 py-3 bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary font-mono"
              required={field.required}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPasswords(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
            >
              {showPasswords[field.name] ? (
                <EyeOff className="h-4 w-4 text-themed-text-secondary" />
              ) : (
                <Eye className="h-4 w-4 text-themed-text-secondary" />
              )}
            </button>
          </div>
        )

      case 'Select':
        return (
          <select
            id={field.name}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="mt-1 block w-full px-4 py-3 bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary font-mono"
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )

      default: // Text, Url
        return (
          <input
            type={field.type === 'Url' ? 'url' : 'text'}
            id={field.name}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className="mt-1 block w-full px-4 py-3 bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary font-mono"
            required={field.required}
          />
        )
    }
  }

  const renderAuthenticationFields = () => {
    return (
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-themed-text-primary">Authentication</h4>
        
        <div>
          <label className="block text-sm font-medium text-themed-text-primary">
            Authentication Type
          </label>
          <select
            value={formData.authentication?.type || 'None'}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              authentication: { type: e.target.value as any }
            }))}
            className="mt-1 block w-full px-4 py-3 bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
          >
            <option value="None">No Authentication</option>
            <option value="Basic">Username & Password</option>
            <option value="Bearer">Bearer Token</option>
            <option value="ApiKey">API Key</option>
          </select>
        </div>

        {formData.authentication?.type === 'Basic' && (
          <>
            <div>
              <label className="block text-sm font-medium text-themed-text-primary">
                Username
              </label>
              <input
                type="text"
                value={formData.authentication.username || ''}
                onChange={(e) => handleAuthFieldChange('username', e.target.value)}
                placeholder="Enter username"
                className="mt-1 block w-full px-4 py-3 bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-themed-text-primary">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.password ? 'text' : 'password'}
                  value={formData.authentication.password || ''}
                  onChange={(e) => handleAuthFieldChange('password', e.target.value)}
                  placeholder="Enter password"
                  className="mt-1 block w-full pl-4 pr-10 py-3 bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPasswords(prev => ({ ...prev, password: !prev.password }))}
                >
                  {showPasswords.password ? (
                    <EyeOff className="h-4 w-4 text-themed-text-secondary" />
                  ) : (
                    <Eye className="h-4 w-4 text-themed-text-secondary" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {formData.authentication?.type === 'Bearer' && (
          <div>
            <label className="block text-sm font-medium text-themed-text-primary">
              Bearer Token
            </label>
            <div className="relative">
              <input
                type={showPasswords.token ? 'text' : 'password'}
                value={formData.authentication.token || ''}
                onChange={(e) => handleAuthFieldChange('token', e.target.value)}
                placeholder="Enter bearer token"
                className="mt-1 block w-full pl-4 pr-10 py-3 bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPasswords(prev => ({ ...prev, token: !prev.token }))}
              >
                {showPasswords.token ? (
                  <EyeOff className="h-4 w-4 text-themed-text-secondary" />
                ) : (
                  <Eye className="h-4 w-4 text-themed-text-secondary" />
                )}
              </button>
            </div>
          </div>
        )}

        {formData.authentication?.type === 'ApiKey' && (
          <div>
            <label className="block text-sm font-medium text-themed-text-primary">
              API Key
            </label>
            <div className="relative">
              <input
                type={showPasswords.apiKey ? 'text' : 'password'}
                value={formData.authentication.apiKey || ''}
                onChange={(e) => handleAuthFieldChange('apiKey', e.target.value)}
                placeholder="Enter API key"
                className="mt-1 block w-full pl-4 pr-10 py-3 bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPasswords(prev => ({ ...prev, apiKey: !prev.apiKey }))}
              >
                {showPasswords.apiKey ? (
                  <EyeOff className="h-4 w-4 text-themed-text-secondary" />
                ) : (
                  <Eye className="h-4 w-4 text-themed-text-secondary" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Helper function to check if test connection should be enabled
  const canTestConnection = () => {
    if (!selectedTypeInfo || !formData.name.trim()) {
      return false
    }

    // Check required fields based on datasource type
    if (selectedType === 'sqlserver') {
      // For SQL Server, check server and database fields
      const server = formData.properties['server']?.trim()
      const database = formData.properties['database']?.trim()
      const authType = formData.properties['authType'] || 'Windows'
      
      if (!server || !database) {
        return false
      }
      
      // If using SQL Server authentication, check username/password
      if (authType === 'SqlServer') {
        const username = formData.properties['username']?.trim()
        const password = formData.properties['password']?.trim()
        return !!(username && password)
      }
      
      return true
    } else {
      // For other datasources, check URL field
      if (!formData.url.trim()) {
        return false
      }
    }

    // Check authentication requirements for other datasources
    if (formData.authentication?.type === 'Basic') {
      return !!(formData.authentication.username?.trim() && formData.authentication.password?.trim())
    } else if (formData.authentication?.type === 'Bearer') {
      return !!formData.authentication.token?.trim()
    } else if (formData.authentication?.type === 'ApiKey') {
      return !!formData.authentication.apiKey?.trim()
    }

    return true
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Basic Information</h3>
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-themed-text-primary">
            Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className="mt-1 block w-full px-4 py-3 rounded-md shadow-sm border border-themed-border-primary bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary font-mono text-sm"
            required
          />
        </div>

        <div>
          <label htmlFor="dataSourceType" className="block text-sm font-medium text-themed-text-primary placeholder-themed-text-muted">
            Data Source Type *
          </label>
          <select
            id="dataSourceType"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="mt-1 block w-full px-4 py-3 border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 bg-themed-bg-surface dark:text-white"
            required
            disabled={!!initialData} // Disable type change when editing
          >
            <option value="">Select a data source type</option>
            {dataSourceTypes.map(type => (
              <option key={type.dataSourceType} value={type.dataSourceType}>
                {type.displayName} - {type.description}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isEnabled"
            checked={formData.isEnabled}
            onChange={(e) => handleFieldChange('isEnabled', e.target.checked)}
            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
          />
          <label htmlFor="isEnabled" className="ml-2 block text-sm bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-themed-interactive-primary focus:border-themed-interactive-primary font-mono">
            Enabled
          </label>
        </div>
      </div>

      {/* Configuration Fields */}
      {selectedTypeInfo && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-themed-text-primary dark:text-white">Configuration</h3>
          <p className="text-sm text-themed-text-tertiary">
            {selectedTypeInfo.description}
          </p>
          
          {selectedTypeInfo.configurationSchema.fields.map(field => {
            const renderedField = renderField(field)
            
            // Skip rendering if field is conditionally hidden
            if (renderedField === null) {
              return null
            }
            
            return (
              <div key={field.name}>
                <label htmlFor={field.name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {field.label} {field.required && '*'}
                </label>
                {field.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{field.description}</p>
                )}
                {renderedField}
              </div>
            )
          })}
        </div>
      )}

      {/* Authentication */}
      {selectedTypeInfo && renderAuthenticationFields()}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Validation Errors
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <ul className="list-disc pl-5 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Connection */}
      {selectedTypeInfo && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-themed-text-primary">Test Connection</h3>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !canTestConnection()}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="h-4 w-4 mr-2" />
              )}
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {testResult && (
            <div className={`border rounded-md p-4 ${
              testResult.isSuccess 
                ? 'bg-themed-alert-success border-themed-alert-success' 
                : 'bg-themed-alert-error border-themed-alert-error'
            }`}>
              <div className="flex">
                {testResult.isSuccess ? (
                  <CheckCircle className="text-themed-alert-success h-5 w-5" />
                ) : (
                  <XCircle className="text-themed-alert-success h-5 w-5" />
                )}
                <div className="ml-3">
                  <h3 className={`text-sm font-medium ${
                    testResult.isSuccess 
                      ? 'text-themed-alert-success' 
                      : 'text-themed-alert-error'
                  }`}>
                    {testResult.isSuccess ? 'Connection Successful' : 'Connection Failed'}
                  </h3>
                  <div className={`mt-2 text-sm ${
                    testResult.isSuccess 
                      ? 'text-themed-alert-success' 
                      : 'text-themed-alert-error'
                  }`}>
                    <p>{testResult.errorMessage}</p>
                    {testResult.responseTimeMs > 0 && (
                      <p>Response time: {testResult.responseTimeMs}ms</p>
                    )}
                    {testResult.details && (
                      <p className="mt-1 text-xs">{testResult.details}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading || !selectedType || !formData.name || (selectedType !== 'sqlserver' && !formData.url)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {initialData ? 'Update' : 'Create'} Data Source
        </button>
      </div>
    </form>
  )
} 