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
  Copy,
  Download,
  Eye,
  EyeOff,
  Clock
} from 'lucide-react'
import PageHeader from '../components/PageHeader'

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

  const [metricsData, setMetricsData] = useState('')
  const [tracesData, setTracesData] = useState('')
  const [logsData, setLogsData] = useState('')

  const [queryParams, setQueryParams] = useState({
    startTime: new Date(Date.now() - 3600000).toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
    limit: 100,
    metricNames: ['cpu_usage_percent', 'memory_usage_bytes']
  })

  useEffect(() => {
    setMetricsData(JSON.stringify(sampleMetricsData, null, 2))
    setTracesData(JSON.stringify(sampleTracesData, null, 2))
    setLogsData(JSON.stringify(sampleLogsData, null, 2))
  }, [])

  const addTestResult = (result: Omit<TestResult, 'id'>) => {
    const testResult: TestResult = { ...result, id: Date.now().toString() }
    setTestResults(prev => [testResult, ...prev])
    return testResult
  }

  const updateTestResult = (id: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(result =>
      result.id === id ? { ...result, ...updates } : result
    ))
  }

  const sendOtlpData = async (endpoint: string, data: string) => {
    const testResult = addTestResult({
      endpoint: `/api/v1/ingest/otlp/${endpoint}`,
      method: 'POST',
      status: 'pending'
    })

    const startTime = performance.now()

    try {
      const response = await fetch(`/api/v1/ingest/otlp/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      updateTestResult(testResult.id, {
        status: 'error',
        responseTime: performance.now() - startTime,
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
      updateTestResult(testResult.id, {
        status: 'error',
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  const runHealthChecks = async () => {
    setIsRunningTests(true)
    await testQueryEndpoint('health', {})
    await testQueryEndpoint('logs', {})
    await testQueryEndpoint('stats', {})
    setIsRunningTests(false)
  }

  const runAllTests = async () => {
    setIsRunningTests(true)
    await sendOtlpData('metrics', metricsData)
    await sendOtlpData('traces', tracesData)
    await sendOtlpData('logs', logsData)
    await new Promise(resolve => setTimeout(resolve, 1000))
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
    await runHealthChecks()
    setIsRunningTests(false)
  }

  const toggleResultExpansion = (id: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const downloadResults = () => {
    const data = { timestamp: new Date().toISOString(), testResults }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `telemetry-test-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const successCount = testResults.filter(r => r.status === 'success').length
  const errorCount = testResults.filter(r => r.status === 'error').length

  return (
    <div className="page-shell">
      <PageHeader
        title="Telemetry Testing"
        description="Test OTLP ingestion and query endpoints"
        meta={
          <span className="badge-muted">
            <Activity className="h-3 w-3" />
            API Testing
          </span>
        }
        actions={
          <div className="page-actions">
            <button onClick={downloadResults} className="btn-themed-secondary">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button onClick={() => { setTestResults([]); setExpandedResults(new Set()) }} className="btn-themed-secondary">
              Clear
            </button>
            <button onClick={runHealthChecks} disabled={isRunningTests} className="btn-themed-secondary disabled:opacity-50">
              <CheckCircle className="h-4 w-4 mr-2" />
              Health Check
            </button>
            <button onClick={runAllTests} disabled={isRunningTests} className="btn-themed-primary disabled:opacity-50">
              {isRunningTests ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              {isRunningTests ? 'Running...' : 'Run All Tests'}
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-muted">{testResults.length} tests</span>
          {successCount > 0 && (
            <span className="badge-muted text-themed-status-success">
              <CheckCircle className="h-3 w-3" />
              {successCount} passed
            </span>
          )}
          {errorCount > 0 && (
            <span className="badge-muted text-themed-status-error">
              <XCircle className="h-3 w-3" />
              {errorCount} failed
            </span>
          )}
        </div>
      </PageHeader>

      <div className="page-toolbar">
        <div className="page-toolbar__group text-sm text-themed-text-secondary">
          <Activity className="h-4 w-4 text-themed-text-muted" />
          <span>Base URL: {window.location.origin}</span>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group text-sm text-themed-text-secondary">
          <Clock className="h-4 w-4 text-themed-text-muted" />
          <span>Last run: {testResults.length > 0 ? new Date().toLocaleTimeString() : 'Never'}</span>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="flex-1 panel overflow-hidden flex flex-col">
          <div className="flex border-b border-themed-border-primary">
            {[
              { key: 'send', label: 'Send Data', icon: Send },
              { key: 'query', label: 'Query Data', icon: Database },
              { key: 'health', label: 'Health Check', icon: CheckCircle }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSelectedTab(key as any)}
                className={`px-4 py-3 flex items-center gap-2 border-b-2 transition-colors ${
                  selectedTab === key
                    ? 'border-themed-interactive-primary text-themed-interactive-primary'
                    : 'border-transparent text-themed-text-secondary hover:text-themed-text-primary'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedTab === 'send' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-themed-text-primary">Send OTLP Data</h3>

                {[
                  { label: 'Metrics', data: metricsData, setData: setMetricsData, endpoint: 'metrics' },
                  { label: 'Traces', data: tracesData, setData: setTracesData, endpoint: 'traces' },
                  { label: 'Logs', data: logsData, setData: setLogsData, endpoint: 'logs' }
                ].map(({ label, data, setData, endpoint }) => (
                  <div key={endpoint}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-themed-text-primary">{label} Data (JSON)</label>
                      <button onClick={() => sendOtlpData(endpoint, data)} className="btn-themed-primary text-xs py-1 px-3">
                        <Send className="h-3 w-3 mr-1" />
                        Send
                      </button>
                    </div>
                    <textarea
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      className="input-themed w-full h-32 font-mono text-xs"
                      placeholder={`Enter OTLP ${endpoint} JSON...`}
                    />
                  </div>
                ))}
              </div>
            )}

            {selectedTab === 'query' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-themed-text-primary">Query Configuration</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-themed-text-primary">Start Time</label>
                    <input
                      type="datetime-local"
                      value={queryParams.startTime}
                      onChange={(e) => setQueryParams(prev => ({ ...prev, startTime: e.target.value }))}
                      className="input-themed w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-themed-text-primary">End Time</label>
                    <input
                      type="datetime-local"
                      value={queryParams.endTime}
                      onChange={(e) => setQueryParams(prev => ({ ...prev, endTime: e.target.value }))}
                      className="input-themed w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-themed-text-primary">Limit</label>
                  <input
                    type="number"
                    value={queryParams.limit}
                    onChange={(e) => setQueryParams(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                    className="input-themed w-32"
                  />
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => testQueryEndpoint('metrics', {
                      startTime: new Date(queryParams.startTime).toISOString(),
                      endTime: new Date(queryParams.endTime).toISOString(),
                      limit: queryParams.limit
                    })}
                    className="btn-themed-primary w-full"
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Query Metrics
                  </button>
                  <button onClick={() => testQueryEndpoint('metrics/metadata')} className="btn-themed-secondary w-full">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Get Metrics Metadata
                  </button>
                  <button
                    onClick={() => testQueryEndpoint('logs', {
                      startTime: new Date(queryParams.startTime).toISOString(),
                      endTime: new Date(queryParams.endTime).toISOString(),
                      limit: 50
                    })}
                    className="btn-themed-secondary w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Query Logs
                  </button>
                </div>
              </div>
            )}

            {selectedTab === 'health' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-themed-text-primary">Health Checks</h3>
                <div className="space-y-2">
                  <button onClick={() => testQueryEndpoint('health')} className="btn-themed-primary w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check Telemetry Health
                  </button>
                  <button onClick={() => testQueryEndpoint('logs')} className="btn-themed-secondary w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    Check Logs Endpoint
                  </button>
                  <button onClick={() => testQueryEndpoint('stats')} className="btn-themed-secondary w-full">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Get Telemetry Stats
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-96 flex-shrink-0 panel overflow-hidden flex flex-col">
          <div className="panel-header">
            <h3 className="panel-title">Test Results</h3>
            <span className="badge-muted">{testResults.length}</span>
          </div>

          {testResults.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-themed-text-secondary">
              <Activity className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-center">No test results yet.<br />Run some tests to see results here.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3">
              {testResults.map((result) => (
                <div key={result.id} className="p-4 rounded-lg border border-themed-border-primary">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {result.status === 'success' && <CheckCircle className="h-4 w-4 text-themed-status-success" />}
                      {result.status === 'error' && <XCircle className="h-4 w-4 text-themed-status-error" />}
                      {result.status === 'pending' && <RefreshCw className="h-4 w-4 text-themed-status-warning animate-spin" />}
                      <div>
                        <div className="font-medium text-themed-text-primary text-sm">
                          {result.method} {result.endpoint}
                        </div>
                        {result.statusCode && (
                          <div className="text-xs text-themed-text-secondary">
                            Status: {result.statusCode} • {result.responseTime?.toFixed(0)}ms
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => copyToClipboard(JSON.stringify(result, null, 2))} className="p-1 text-themed-text-muted hover:text-themed-text-primary">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button onClick={() => toggleResultExpansion(result.id)} className="p-1 text-themed-text-muted hover:text-themed-text-primary">
                        {expandedResults.has(result.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {result.error && (
                    <div className="mt-2 p-2 bg-themed-alert-error bg-opacity-10 border border-themed-alert-error rounded text-themed-status-error text-xs">
                      {result.error}
                    </div>
                  )}

                  {expandedResults.has(result.id) && result.response && (
                    <div className="mt-3">
                      <div className="text-xs font-medium text-themed-text-secondary mb-2">Response:</div>
                      <pre className="bg-themed-bg-surface p-3 rounded text-xs overflow-x-auto text-themed-text-primary">
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
  )
}

const sampleMetricsData = {
  resourceMetrics: [{
    resource: {
      attributes: [
        { key: "service.name", value: { stringValue: "web-service" } },
        { key: "host.name", value: { stringValue: "localhost" } }
      ]
    },
    scopeMetrics: [{
      scope: { name: "test-meter", version: "1.0.0" },
      metrics: [
        {
          name: "cpu_usage_percent",
          description: "CPU usage percentage",
          unit: "percent",
          gauge: {
            dataPoints: [{
              timeUnixNano: (Date.now() * 1000000).toString(),
              asDouble: 75.5,
              attributes: [{ key: "core", value: { stringValue: "0" } }]
            }]
          }
        },
        {
          name: "memory_usage_bytes",
          description: "Memory usage in bytes",
          unit: "bytes",
          gauge: {
            dataPoints: [{
              timeUnixNano: (Date.now() * 1000000).toString(),
              asInt: "1073741824"
            }]
          }
        }
      ]
    }]
  }]
}

const sampleTracesData = {
  resourceSpans: [{
    resource: {
      attributes: [{ key: "service.name", value: { stringValue: "web-service" } }]
    },
    scopeSpans: [{
      scope: { name: "test-tracer", version: "1.0.0" },
      spans: [{
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
      }]
    }]
  }]
}

const sampleLogsData = {
  resourceLogs: [{
    resource: {
      attributes: [{ key: "service.name", value: { stringValue: "web-service" } }]
    },
    scopeLogs: [{
      scope: { name: "test-logger", version: "1.0.0" },
      logRecords: [{
        timeUnixNano: (Date.now() * 1000000).toString(),
        severityNumber: 9,
        severityText: "INFO",
        body: { stringValue: "Test log message from WebUI" },
        attributes: [{ key: "component", value: { stringValue: "webui-test" } }]
      }]
    }]
  }]
}

export default TelemetryTesting
