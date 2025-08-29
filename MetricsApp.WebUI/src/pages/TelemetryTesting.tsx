import { useState, useEffect } from 'react'
import { 
  Play, 
  RefreshCw, 
  Send, 
  Database, 
  Activity, 
  FileText, 
  BarChart3,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Download,
  Eye,
  EyeOff
} from 'lucide-react'
import TelemetryApi from '../lib/telemetry-api'

interface TestResult {
  id: string
  endpoint: string
  method: string
  status: 'success' | 'error' | 'pending'
  statusCode?: number
  responseTime?: number
  response?: any
  error?: string
}

const TelemetryTesting = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'send' | 'query' | 'health'>('send')
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())

  // Sample OTLP data states
  const [metricsData, setMetricsData] = useState('')
  const [tracesData, setTracesData] = useState('')
  const [logsData, setLogsData] = useState('')

  // Query parameters
  const [queryParams, setQueryParams] = useState({
    startTime: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
    limit: 100,
    metricNames: ['cpu_usage_percent', 'memory_usage_bytes']
  })

  useEffect(() => {
    // Initialize with sample OTLP data
    setMetricsData(JSON.stringify(sampleMetricsData, null, 2))
    setTracesData(JSON.stringify(sampleTracesData, null, 2))
    setLogsData(JSON.stringify(sampleLogsData, null, 2))
  }, [])

  const addTestResult = (result: Omit<TestResult, 'id'>) => {
    const testResult: TestResult = {
      ...result,
      id: Date.now().toString()
    }
    setTestResults(prev => [testResult, ...prev])
    return testResult
  }

  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(result => 
      result.id === id ? { ...result, ...updates } : result
    ))
  }

  const sendOtlpData = async (endpoint: string, data: string, dataType: string) => {
    const testResult = addTestResult({
      endpoint: `/v1/${endpoint}`,
      method: 'POST',
      status: 'pending'
    })

    const startTime = performance.now()

    try {
      const response = await fetch(`/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: data
      })

      const responseTime = performance.now() - startTime
      const responseData = await response.json().catch(() => ({}))

      updateTestResult(testResult.id, {
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        responseTime,
        response: responseData,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      })
    } catch (error) {
      const responseTime = performance.now() - startTime
      updateTestResult(testResult.id, {
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const testQueryEndpoint = async (endpoint: string, params: any = {}) => {
    const testResult = addTestResult({
      endpoint: `/api/v1/telemetry/${endpoint}`,
      method: 'GET',
      status: 'pending'
    })

    const startTime = performance.now()

    try {
      let url = `/api/v1/telemetry/${endpoint}`
      const queryString = new URLSearchParams()
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => queryString.append(key, v.toString()))
          } else {
            queryString.append(key, value.toString())
          }
        }
      })

      if (queryString.toString()) {
        url += `?${queryString}`
      }

      const response = await fetch(url)
      const responseTime = performance.now() - startTime
      const responseData = await response.json()

      updateTestResult(testResult.id, {
        status: response.ok ? 'success' : 'error',
        statusCode: response.status,
        responseTime,
        response: responseData,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      })
    } catch (error) {
      const responseTime = performance.now() - startTime
      updateTestResult(testResult.id, {
        status: 'error',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const runHealthChecks = async () => {
    setIsRunningTests(true)
    
    // Test OTLP health
    await testQueryEndpoint('health', {})
    
    // Test telemetry health
    await testQueryEndpoint('health', {})

    // Test telemetry health
    await testQueryEndpoint('logs', {})
    
    // Test telemetry stats
    await testQueryEndpoint('stats', {})
    
    setIsRunningTests(false)
  }

  const runAllTests = async () => {
    setIsRunningTests(true)
    
    // Send sample data
    await sendOtlpData('metrics', metricsData, 'metrics')
    await sendOtlpData('traces', tracesData, 'traces')
    await sendOtlpData('logs', logsData, 'logs')
    
    // Wait a moment for data to be processed
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Query the data back
    await testQueryEndpoint('metrics', {
      startTime: new Date(queryParams.startTime).toISOString(),
      endTime: new Date(queryParams.endTime).toISOString(),
      limit: queryParams.limit
    })
    
    await testQueryEndpoint('metrics/metadata', {})
    await testQueryEndpoint('logs', {
      startTime: new Date(queryParams.startTime).toISOString(),
      endTime: new Date(queryParams.endTime).toISOString(),
      limit: 50
    })
    
    // Run health checks
    await runHealthChecks()
    
    setIsRunningTests(false)
  }

  const toggleResultExpansion = (id: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadResults = () => {
    const data = {
      timestamp: new Date().toISOString(),
      testResults: testResults
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `telemetry-test-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearResults = () => {
    setTestResults([])
    setExpandedResults(new Set())
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-themed-border-primary bg-themed-bg-primary p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="h-6 w-6 text-themed-interactive-primary mr-2" />
            <h1 className="text-2xl font-bold text-themed-text-primary">Telemetry API Testing</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={runAllTests}
              disabled={isRunningTests}
              className="px-4 py-2 bg-themed-interactive-primary text-themed-text-inverse rounded-lg hover:bg-themed-interactive-primary-hover transition-colors disabled:opacity-50"
            >
              {isRunningTests ? (
                <RefreshCw className="h-4 w-4 mr-2 inline animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2 inline" />
              )}
              Run All Tests
            </button>
            <button
              onClick={runHealthChecks}
              disabled={isRunningTests}
              className="px-4 py-2 bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary rounded-lg hover:bg-themed-interactive-secondary-hover transition-colors"
            >
              <CheckCircle className="h-4 w-4 mr-2 inline" />
              Health Check
            </button>
            <button
              onClick={downloadResults}
              className="px-4 py-2 bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary rounded-lg hover:bg-themed-interactive-secondary-hover transition-colors"
            >
              <Download className="h-4 w-4 mr-2 inline" />
              Export
            </button>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary rounded-lg hover:bg-themed-interactive-secondary-hover transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel - Test Configuration */}
        <div className="w-1/2 border-r border-themed-border-primary bg-themed-bg-secondary">
          {/* Tabs */}
          <div className="border-b border-themed-border-primary">
            <div className="flex">
              {[
                { key: 'send', label: 'Send Data', icon: Send },
                { key: 'query', label: 'Query Data', icon: Database },
                { key: 'health', label: 'Health Check', icon: CheckCircle }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setSelectedTab(key as any)}
                  className={`px-4 py-3 flex items-center space-x-2 border-b-2 transition-colors ${
                    selectedTab === key
                      ? 'border-themed-interactive-primary text-themed-interactive-primary bg-themed-bg-primary'
                      : 'border-transparent text-themed-text-secondary hover:text-themed-text-primary hover:bg-themed-bg-primary'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 h-full overflow-y-auto">
            {selectedTab === 'send' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-themed-text-primary mb-4">Send OTLP Data</h3>
                  
                  {/* Metrics Data */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-themed-text-primary">
                        Metrics Data (JSON)
                      </label>
                      <button
                        onClick={() => sendOtlpData('metrics', metricsData, 'metrics')}
                        className="px-3 py-1 text-sm bg-themed-interactive-primary text-themed-text-inverse rounded hover:bg-themed-interactive-primary-hover"
                      >
                        <Send className="h-3 w-3 mr-1 inline" />
                        Send
                      </button>
                    </div>
                    <textarea
                      value={metricsData}
                      onChange={(e) => setMetricsData(e.target.value)}
                      className="w-full h-32 px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary font-mono text-xs"
                      placeholder="Enter OTLP metrics JSON..."
                    />
                  </div>

                  {/* Traces Data */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-themed-text-primary">
                        Traces Data (JSON)
                      </label>
                      <button
                        onClick={() => sendOtlpData('traces', tracesData, 'traces')}
                        className="px-3 py-1 text-sm bg-themed-interactive-primary text-themed-text-inverse rounded hover:bg-themed-interactive-primary-hover"
                      >
                        <Send className="h-3 w-3 mr-1 inline" />
                        Send
                      </button>
                    </div>
                    <textarea
                      value={tracesData}
                      onChange={(e) => setTracesData(e.target.value)}
                      className="w-full h-32 px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary font-mono text-xs"
                      placeholder="Enter OTLP traces JSON..."
                    />
                  </div>

                  {/* Logs Data */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-themed-text-primary">
                        Logs Data (JSON)
                      </label>
                      <button
                        onClick={() => sendOtlpData('logs', logsData, 'logs')}
                        className="px-3 py-1 text-sm bg-themed-interactive-primary text-themed-text-inverse rounded hover:bg-themed-interactive-primary-hover"
                      >
                        <Send className="h-3 w-3 mr-1 inline" />
                        Send
                      </button>
                    </div>
                    <textarea
                      value={logsData}
                      onChange={(e) => setLogsData(e.target.value)}
                      className="w-full h-32 px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary font-mono text-xs"
                      placeholder="Enter OTLP logs JSON..."
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'query' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-themed-text-primary">Query Configuration</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-themed-text-primary mb-2">
                      Start Time
                    </label>
                    <input
                      type="datetime-local"
                      value={queryParams.startTime}
                      onChange={(e) => setQueryParams(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-themed-text-primary mb-2">
                      End Time
                    </label>
                    <input
                      type="datetime-local"
                      value={queryParams.endTime}
                      onChange={(e) => setQueryParams(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-themed-text-primary mb-2">
                    Limit
                  </label>
                  <input
                    type="number"
                    value={queryParams.limit}
                    onChange={(e) => setQueryParams(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary"
                  />
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => testQueryEndpoint('metrics', {
                      startTime: new Date(queryParams.startTime).toISOString(),
                      endTime: new Date(queryParams.endTime).toISOString(),
                      limit: queryParams.limit
                    })}
                    className="w-full px-4 py-2 bg-themed-interactive-primary text-themed-text-inverse rounded-lg hover:bg-themed-interactive-primary-hover"
                  >
                    <Database className="h-4 w-4 mr-2 inline" />
                    Query Metrics
                  </button>
                  
                  <button
                    onClick={() => testQueryEndpoint('metrics/metadata')}
                    className="w-full px-4 py-2 bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary rounded-lg hover:bg-themed-interactive-secondary-hover"
                  >
                    <BarChart3 className="h-4 w-4 mr-2 inline" />
                    Get Metrics Metadata
                  </button>
                  
                  <button
                    onClick={() => testQueryEndpoint('logs', {
                      startTime: new Date(queryParams.startTime).toISOString(),
                      endTime: new Date(queryParams.endTime).toISOString(),
                      limit: 50
                    })}
                    className="w-full px-4 py-2 bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary rounded-lg hover:bg-themed-interactive-secondary-hover"
                  >
                    <FileText className="h-4 w-4 mr-2 inline" />
                    Query Logs
                  </button>
                </div>
              </div>
            )}

            {selectedTab === 'health' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-themed-text-primary">Health Checks</h3>
                
                <div className="space-y-2">
                  <button
                    onClick={() => testQueryEndpoint('health')}
                    className="w-full px-4 py-2 bg-themed-interactive-primary text-themed-text-inverse rounded-lg hover:bg-themed-interactive-primary-hover"
                  >
                    <CheckCircle className="h-4 w-4 mr-2 inline" />
                    Check OTLP Health (/v1/health)
                  </button>
                  
                  <button
                    onClick={() => testQueryEndpoint('health')}
                    className="w-full px-4 py-2 bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary rounded-lg hover:bg-themed-interactive-secondary-hover"
                  >
                    <Activity className="h-4 w-4 mr-2 inline" />
                    Check Telemetry Health
                  </button>

                  <button
                    onClick={() => testQueryEndpoint('logs')}
                    className="w-full px-4 py-2 bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary rounded-lg hover:bg-themed-interactive-secondary-hover"
                  >
                    <Activity className="h-4 w-4 mr-2 inline" />
                    Check Logs Health
                  </button>
                  
                  <button
                    onClick={() => testQueryEndpoint('stats')}
                    className="w-full px-4 py-2 bg-themed-bg-surface text-themed-text-primary border border-themed-border-primary rounded-lg hover:bg-themed-interactive-secondary-hover"
                  >
                    <BarChart3 className="h-4 w-4 mr-2 inline" />
                    Get Telemetry Stats
                  </button>


                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Test Results */}
        <div className="w-1/2 bg-themed-bg-primary">
          <div className="border-b border-themed-border-primary p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-themed-text-primary">Test Results</h3>
              <span className="text-sm text-themed-text-secondary">
                {testResults.length} tests
              </span>
            </div>
          </div>

          <div className="p-4 h-full overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-themed-text-secondary">
                <Activity className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-center">No test results yet. Run some tests to see results here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {testResults.map((result) => (
                  <div
                    key={result.id}
                    className="border border-themed-border-primary rounded-lg bg-themed-bg-surface p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {result.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                        {result.status === 'pending' && <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />}
                        
                        <div>
                          <div className="font-medium text-themed-text-primary">
                            {result.method} {result.endpoint}
                          </div>
                          {result.statusCode && (
                            <div className="text-sm text-themed-text-secondary">
                              Status: {result.statusCode} • {result.responseTime?.toFixed(0)}ms
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
                          className="p-1 text-themed-text-secondary hover:text-themed-text-primary"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleResultExpansion(result.id)}
                          className="p-1 text-themed-text-secondary hover:text-themed-text-primary"
                        >
                          {expandedResults.has(result.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {result.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        {result.error}
                      </div>
                    )}

                    {expandedResults.has(result.id) && result.response && (
                      <div className="mt-3">
                        <div className="text-sm font-medium text-themed-text-primary mb-2">Response:</div>
                        <pre className="bg-themed-bg-tertiary p-3 rounded text-xs overflow-x-auto text-themed-text-primary">
                          {JSON.stringify(result.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Sample OTLP data
const sampleMetricsData = {
  resourceMetrics: [
    {
      resource: {
        attributes: [
          { key: "service.name", value: { stringValue: "web-service" } },
          { key: "host.name", value: { stringValue: "localhost" } }
        ]
      },
      scopeMetrics: [
        {
          scope: { name: "test-meter", version: "1.0.0" },
          metrics: [
            {
              name: "cpu_usage_percent",
              description: "CPU usage percentage",
              unit: "percent",
              gauge: {
                dataPoints: [
                  {
                    timeUnixNano: (Date.now() * 1000000).toString(),
                    asDouble: 75.5,
                    attributes: [
                      { key: "core", value: { stringValue: "0" } }
                    ]
                  }
                ]
              }
            },
            {
              name: "memory_usage_bytes",
              description: "Memory usage in bytes",
              unit: "bytes",
              gauge: {
                dataPoints: [
                  {
                    timeUnixNano: (Date.now() * 1000000).toString(),
                    asInt: "1073741824"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}

const sampleTracesData = {
  resourceSpans: [
    {
      resource: {
        attributes: [
          { key: "service.name", value: { stringValue: "web-service" } }
        ]
      },
      scopeSpans: [
        {
          scope: { name: "test-tracer", version: "1.0.0" },
          spans: [
            {
              traceId: "12345678901234567890123456789012",
              spanId: "1234567890123456",
              name: "HTTP GET /api/test",
              kind: "SPAN_KIND_SERVER",
              startTimeUnixNano: ((Date.now() - 1000) * 1000000).toString(),
              endTimeUnixNano: (Date.now() * 1000000).toString(),
              attributes: [
                { key: "http.method", value: { stringValue: "GET" } },
                { key: "http.status_code", value: { intValue: 200 } }
              ]
            }
          ]
        }
      ]
    }
  ]
}

const sampleLogsData = {
  resourceLogs: [
    {
      resource: {
        attributes: [
          { key: "service.name", value: { stringValue: "web-service" } }
        ]
      },
      scopeLogs: [
        {
          scope: { name: "test-logger", version: "1.0.0" },
          logRecords: [
            {
              timeUnixNano: (Date.now() * 1000000).toString(),
              severityNumber: 9,
              severityText: "INFO",
              body: { stringValue: "Test log message from WebUI" },
              attributes: [
                { key: "component", value: { stringValue: "webui-test" } }
              ]
            }
          ]
        }
      ]
    }
  ]
}

export default TelemetryTesting
