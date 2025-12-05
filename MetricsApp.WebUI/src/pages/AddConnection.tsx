import { useState, useEffect } from 'react'
import { ArrowLeft, Database, Server, Cloud, CheckCircle, AlertCircle, ChevronRight, TestTube, Loader2, Eye, EyeOff, Info, Shield, Globe } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DataSourceTypeInfo, DataSourceApi, ApiError, DataSourceTestResult } from '../lib/datasource-api'
import PageHeader from '../components/PageHeader'

// Data source type icons/categories
const DATA_SOURCE_CATEGORIES = {
  monitoring: { label: 'Monitoring', icon: Server, color: 'var(--status-info)' },
  database: { label: 'Database', icon: Database, color: 'var(--status-success)' },
  cloud: { label: 'Cloud', icon: Cloud, color: 'var(--status-warning)' },
  other: { label: 'Other', icon: Globe, color: 'var(--text-muted)' }
}

const getDataSourceCategory = (type: string): keyof typeof DATA_SOURCE_CATEGORIES => {
  const t = type.toLowerCase()
  if (['prometheus', 'grafana', 'datadog', 'newrelic'].includes(t)) return 'monitoring'
  if (['postgresql', 'mysql', 'sqlserver', 'elasticsearch', 'mongodb', 'redis', 'influxdb'].includes(t)) return 'database'
  if (['aws', 'azure', 'gcp', 'cloudwatch'].includes(t)) return 'cloud'
  return 'other'
}

type WizardStep = 'select-type' | 'configure' | 'test'

export default function AddConnection() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [dataSourceTypes, setDataSourceTypes] = useState<DataSourceTypeInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<WizardStep>('select-type')
  
  // Form state
  const [formData, setFormData] = useState<{
    name: string
    url: string
    isEnabled: boolean
    properties: Record<string, any>
    authentication: Record<string, any>
  }>({
    name: '',
    url: '',
    isEnabled: true,
    properties: {},
    authentication: { type: 'None' }
  })
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [testResult, setTestResult] = useState<DataSourceTestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    loadDataSourceTypes()
  }, [])

  useEffect(() => {
    const typeParam = searchParams.get('type')
    if (typeParam && dataSourceTypes.length > 0) {
      const found = dataSourceTypes.find(t => t.dataSourceType === typeParam)
      if (found) {
        setSelectedType(typeParam)
        setCurrentStep('configure')
      }
    }
  }, [searchParams, dataSourceTypes])

  const loadDataSourceTypes = async () => {
    setIsLoading(true)
    try {
      const types = await DataSourceApi.getDataSourceTypes()
      setDataSourceTypes(types)
    } catch (err) {
      console.error('Failed to load datasource types:', err)
      setError(err instanceof ApiError ? err.message : 'Failed to load datasource types')
    } finally {
      setIsLoading(false)
    }
  }

  const selectedTypeInfo = selectedType ? dataSourceTypes.find(t => t.dataSourceType === selectedType) : null

  const handleSelectType = (type: string) => {
    setSelectedType(type)
    setCurrentStep('configure')
    setFormData({
      name: '',
      url: '',
      isEnabled: true,
      properties: {},
      authentication: { type: 'None' }
    })
    setTestResult(null)
    setError(null)
  }

  const handleBack = () => {
    if (currentStep === 'configure') {
      setSelectedType(null)
      setCurrentStep('select-type')
    } else if (currentStep === 'test') {
      setCurrentStep('configure')
    }
  }

  const handleFieldChange = (name: string, value: any) => {
    if (name === 'name' || name === 'url' || name === 'isEnabled') {
      setFormData(prev => ({ ...prev, [name]: value }))
    } else {
      setFormData(prev => ({
        ...prev,
        properties: { ...prev.properties, [name]: value }
      }))
    }
    setTestResult(null)
  }

  const handleAuthChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      authentication: { ...prev.authentication, [field]: value }
    }))
    setTestResult(null)
  }

  const handleTestConnection = async () => {
    if (!selectedTypeInfo) return
    setIsTesting(true)
    setTestResult(null)

    try {
      const authType = formData.authentication.type === 'None' ? 0 :
                       formData.authentication.type === 'Basic' ? 1 :
                       formData.authentication.type === 'Bearer' ? 2 :
                       formData.authentication.type === 'ApiKey' ? 3 : 0

      const testConfig = {
        name: formData.name,
        dataSourceType: selectedType!,
        url: formData.url,
        properties: formData.properties,
        authentication: formData.authentication.type === 'None' ? undefined : {
          ...formData.authentication,
          type: authType
        },
        isEnabled: formData.isEnabled
      }

      const result = await DataSourceApi.testDataSource(testConfig as any)
      setTestResult(result)
      
      if (result.isSuccess) {
        setCurrentStep('test')
      }
    } catch (err) {
      setTestResult({
        isSuccess: false,
        responseTimeMs: 0,
        errorMessage: err instanceof Error ? err.message : 'Test failed',
        details: 'Unable to test connection'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedTypeInfo) return
    setIsSubmitting(true)
    setError(null)

    try {
      const authType = formData.authentication.type === 'None' ? 0 :
                       formData.authentication.type === 'Basic' ? 1 :
                       formData.authentication.type === 'Bearer' ? 2 :
                       formData.authentication.type === 'ApiKey' ? 3 : 0

      const submitData = {
        name: formData.name,
        dataSourceType: selectedType!,
        url: formData.url,
        properties: formData.properties,
        authentication: formData.authentication.type === 'None' ? undefined : {
          ...formData.authentication,
          type: authType
        },
        isEnabled: formData.isEnabled
      }

      const newDataSource = await DataSourceApi.createDataSource(submitData as any)
      navigate('/datasources', {
        state: { message: `Data source "${newDataSource.name}" created successfully!` }
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create data source')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedToTest = () => {
    if (!formData.name.trim()) return false
    
    if (selectedType === 'sqlserver') {
      const server = formData.properties['server']?.trim()
      const database = formData.properties['database']?.trim()
      if (!server || !database) return false
      
      const authType = formData.properties['authType'] || 'Windows'
      if (authType === 'SqlServer') {
        if (!formData.properties['username']?.trim() || !formData.properties['password']?.trim()) {
          return false
        }
      }
    } else {
      if (!formData.url.trim()) return false
    }

    if (formData.authentication.type === 'Basic') {
      if (!formData.authentication.username?.trim() || !formData.authentication.password?.trim()) {
        return false
      }
    } else if (formData.authentication.type === 'Bearer') {
      if (!formData.authentication.token?.trim()) return false
    } else if (formData.authentication.type === 'ApiKey') {
      if (!formData.authentication.apiKey?.trim()) return false
    }

    return true
  }

  if (isLoading) {
    return (
      <div className="page-shell">
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3">
            <div 
              className="animate-spin rounded-full h-8 w-8 border-2 border-b-transparent"
              style={{ borderColor: 'var(--interactive-primary)', borderBottomColor: 'transparent' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Add Connection"
        description={selectedTypeInfo ? `Configure ${selectedTypeInfo.displayName} connection` : 'Connect to external data sources'}
        meta={
          currentStep !== 'select-type' && (
            <button 
              onClick={handleBack}
              className="badge-muted"
              style={{ cursor: 'pointer' }}
            >
              <ArrowLeft className="h-3 w-3" />
              Back
            </button>
          )
        }
      />

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-6">
        {['select-type', 'configure', 'test'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div 
              className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium"
              style={{
                backgroundColor: currentStep === step ? 'var(--interactive-primary)' : 
                               ['configure', 'test'].indexOf(currentStep) > ['select-type', 'configure', 'test'].indexOf(step) 
                               ? 'var(--status-success)' : 'var(--bg-tertiary)',
                color: currentStep === step || ['configure', 'test'].indexOf(currentStep) > ['select-type', 'configure', 'test'].indexOf(step)
                       ? 'var(--text-inverse)' : 'var(--text-muted)'
              }}
            >
              {['configure', 'test'].indexOf(currentStep) > ['select-type', 'configure', 'test'].indexOf(step) ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span 
              className="ml-2 text-xs font-medium"
              style={{ 
                color: currentStep === step ? 'var(--text-primary)' : 'var(--text-muted)'
              }}
            >
              {step === 'select-type' ? 'Select Type' : step === 'configure' ? 'Configure' : 'Test & Save'}
            </span>
            {index < 2 && (
              <ChevronRight className="h-4 w-4 mx-3" style={{ color: 'var(--text-muted)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div 
          className="p-3 mb-4 flex items-center gap-2 text-sm"
          style={{ 
            backgroundColor: 'var(--alert-error-bg)', 
            color: 'var(--alert-error-text)',
            borderLeft: '3px solid var(--status-error)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Select Type */}
      {currentStep === 'select-type' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataSourceTypes.map(type => {
            const category = getDataSourceCategory(type.dataSourceType)
            const CategoryIcon = DATA_SOURCE_CATEGORIES[category].icon
            
            return (
              <button
                key={type.dataSourceType}
                onClick={() => handleSelectType(type.dataSourceType)}
                className="panel text-left group"
                style={{ cursor: 'pointer' }}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                    style={{ 
                      backgroundColor: 'var(--bg-tertiary)', 
                      borderRadius: 'var(--radius-sm)' 
                    }}
                  >
                    <CategoryIcon 
                      className="h-5 w-5" 
                      style={{ color: DATA_SOURCE_CATEGORIES[category].color }} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="text-sm font-semibold group-hover:underline"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {type.displayName}
                    </h3>
                    <span 
                      className="text-xs"
                      style={{ color: DATA_SOURCE_CATEGORIES[category].color }}
                    >
                      {DATA_SOURCE_CATEGORIES[category].label}
                    </span>
                  </div>
                  <ChevronRight 
                    className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" 
                    style={{ color: 'var(--text-muted)' }}
                  />
                </div>
                <p 
                  className="mt-2 text-xs line-clamp-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {type.description}
                </p>
                <div className="mt-2">
                  <span className="badge-muted text-xs">v{type.version}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Step 2: Configure */}
      {currentStep === 'configure' && selectedTypeInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic info */}
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">Basic Information</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label 
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Connection Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleFieldChange('name', e.target.value)}
                    placeholder="My Prometheus Server"
                    className="input-themed w-full"
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    A descriptive name to identify this connection
                  </p>
                </div>

                {selectedType !== 'sqlserver' && (
                  <div>
                    <label 
                      className="block text-xs font-medium mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      URL *
                    </label>
                    <input
                      type="url"
                      value={formData.url}
                      onChange={e => handleFieldChange('url', e.target.value)}
                      placeholder="http://localhost:9090"
                      className="input-themed w-full font-mono text-sm"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={e => handleFieldChange('isEnabled', e.target.checked)}
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--interactive-primary)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    Enable this connection
                  </span>
                </label>
              </div>
            </div>

            {/* Type-specific configuration */}
            {selectedTypeInfo.configurationSchema.fields.length > 0 && (
              <div className="panel">
                <div className="panel-header">
                  <h3 className="panel-title">Configuration</h3>
                </div>
                
                <div className="space-y-4">
                  {selectedTypeInfo.configurationSchema.fields.map(field => {
                    // Handle conditional visibility for SQL Server auth fields
                    if (selectedType === 'sqlserver') {
                      const authType = formData.properties['authType'] || 'Windows'
                      if ((field.name === 'username' || field.name === 'password') && authType === 'Windows') {
                        return null
                      }
                    }

                    const value = field.name === 'url' ? formData.url : formData.properties[field.name] || ''

                    return (
                      <div key={field.name}>
                        <label 
                          className="block text-xs font-medium mb-1"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {field.label} {field.required && '*'}
                        </label>
                        
                        {field.description && (
                          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                            {field.description}
                          </p>
                        )}

                        {field.type === 'Boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={value || false}
                              onChange={e => handleFieldChange(field.name, e.target.checked)}
                              className="w-4 h-4"
                              style={{ accentColor: 'var(--interactive-primary)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                              {field.label}
                            </span>
                          </label>
                        ) : field.type === 'Select' ? (
                          <select
                            value={value}
                            onChange={e => handleFieldChange(field.name, e.target.value)}
                            className="input-themed w-full"
                          >
                            <option value="">Select {field.label}</option>
                            {field.options?.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : field.type === 'Password' ? (
                          <div className="relative">
                            <input
                              type={showPasswords[field.name] ? 'text' : 'password'}
                              value={value}
                              onChange={e => handleFieldChange(field.name, e.target.value)}
                              placeholder={field.placeholder}
                              className="input-themed w-full pr-10 font-mono text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(p => ({ ...p, [field.name]: !p[field.name] }))}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {showPasswords[field.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        ) : field.type === 'Number' ? (
                          <input
                            type="number"
                            value={value}
                            onChange={e => handleFieldChange(field.name, parseInt(e.target.value) || 0)}
                            placeholder={field.placeholder}
                            className="input-themed w-full"
                          />
                        ) : (
                          <input
                            type={field.type === 'Url' ? 'url' : 'text'}
                            value={value}
                            onChange={e => handleFieldChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            className="input-themed w-full"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Authentication */}
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <Shield className="h-4 w-4 inline mr-1" />
                  Authentication
                </h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label 
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Authentication Type
                  </label>
                  <select
                    value={formData.authentication.type}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      authentication: { type: e.target.value }
                    }))}
                    className="input-themed w-full"
                  >
                    <option value="None">No Authentication</option>
                    <option value="Basic">Username & Password</option>
                    <option value="Bearer">Bearer Token</option>
                    <option value="ApiKey">API Key</option>
                  </select>
                </div>

                {formData.authentication.type === 'Basic' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Username
                      </label>
                      <input
                        type="text"
                        value={formData.authentication.username || ''}
                        onChange={e => handleAuthChange('username', e.target.value)}
                        className="input-themed w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.authPassword ? 'text' : 'password'}
                          value={formData.authentication.password || ''}
                          onChange={e => handleAuthChange('password', e.target.value)}
                          className="input-themed w-full pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(p => ({ ...p, authPassword: !p.authPassword }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {showPasswords.authPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {formData.authentication.type === 'Bearer' && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Bearer Token
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.token ? 'text' : 'password'}
                        value={formData.authentication.token || ''}
                        onChange={e => handleAuthChange('token', e.target.value)}
                        className="input-themed w-full pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(p => ({ ...p, token: !p.token }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {showPasswords.token ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {formData.authentication.type === 'ApiKey' && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.apiKey ? 'text' : 'password'}
                        value={formData.authentication.apiKey || ''}
                        onChange={e => handleAuthChange('apiKey', e.target.value)}
                        className="input-themed w-full pr-10 font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(p => ({ ...p, apiKey: !p.apiKey }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {showPasswords.apiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Test result */}
            {testResult && (
              <div 
                className="p-4"
                style={{ 
                  backgroundColor: testResult.isSuccess ? 'var(--alert-success-bg)' : 'var(--alert-error-bg)',
                  borderLeft: `3px solid ${testResult.isSuccess ? 'var(--status-success)' : 'var(--status-error)'}`,
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div className="flex items-start gap-2">
                  {testResult.isSuccess ? (
                    <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--status-success)' }} />
                  ) : (
                    <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--status-error)' }} />
                  )}
                  <div>
                    <h4 
                      className="text-sm font-medium"
                      style={{ color: testResult.isSuccess ? 'var(--status-success)' : 'var(--status-error)' }}
                    >
                      {testResult.isSuccess ? 'Connection Successful' : 'Connection Failed'}
                    </h4>
                    {testResult.errorMessage && (
                      <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {testResult.errorMessage}
                      </p>
                    )}
                    {testResult.responseTimeMs > 0 && (
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Response time: {testResult.responseTimeMs}ms
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button onClick={handleBack} className="btn-themed-secondary">
                Back
              </button>
              <button
                onClick={handleTestConnection}
                disabled={!canProceedToTest() || isTesting}
                className="btn-themed-secondary"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                Test Connection
              </button>
            </div>
          </div>

          {/* Sidebar help */}
          <div className="space-y-4">
            <div className="panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  <Info className="h-4 w-4 inline mr-1" />
                  {selectedTypeInfo.displayName}
                </h3>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {selectedTypeInfo.description}
              </p>
              <div className="mt-3">
                <span className="badge-muted">v{selectedTypeInfo.version}</span>
              </div>
            </div>

            <div 
              className="p-4 text-sm"
              style={{ 
                backgroundColor: 'var(--alert-info-bg)',
                borderLeft: '3px solid var(--status-info)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)'
              }}
            >
              <h4 className="font-medium mb-2" style={{ color: 'var(--status-info)' }}>Tips</h4>
              <ul className="space-y-1 text-xs">
                <li>• Use a descriptive name to identify this connection</li>
                <li>• Test the connection before saving</li>
                <li>• Store sensitive credentials securely</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Test & Save */}
      {currentStep === 'test' && selectedTypeInfo && testResult?.isSuccess && (
        <div className="max-w-xl mx-auto">
          <div className="panel text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--status-success)' }} />
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Connection Verified!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Your {selectedTypeInfo.displayName} connection "{formData.name}" is ready to be saved.
            </p>

            <div 
              className="text-left p-4 mb-6"
              style={{ 
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <h4 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Connection Summary
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--text-secondary)' }}>Name</dt>
                  <dd style={{ color: 'var(--text-primary)' }}>{formData.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--text-secondary)' }}>Type</dt>
                  <dd style={{ color: 'var(--text-primary)' }}>{selectedTypeInfo.displayName}</dd>
                </div>
                {formData.url && (
                  <div className="flex justify-between">
                    <dt style={{ color: 'var(--text-secondary)' }}>URL</dt>
                    <dd className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{formData.url}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--text-secondary)' }}>Authentication</dt>
                  <dd style={{ color: 'var(--text-primary)' }}>{formData.authentication.type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt style={{ color: 'var(--text-secondary)' }}>Status</dt>
                  <dd style={{ color: 'var(--status-success)' }}>
                    {formData.isEnabled ? 'Enabled' : 'Disabled'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex justify-center gap-3">
              <button onClick={handleBack} className="btn-themed-secondary">
                Back to Edit
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-themed-primary"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Save Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
