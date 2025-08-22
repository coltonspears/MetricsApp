// Simplified OpenTelemetry setup for manual tracing
// This avoids complex auto-instrumentation and focuses on manual trace creation

interface TraceData {
  traceId: string
  spanId: string
  parentSpanId?: string
  operationName: string
  startTime: number
  endTime?: number
  tags: Record<string, any>
  logs: Array<{ timestamp: number; fields: Record<string, any> }>
}

class SimpleTelemetry {
  private collectorUrl: string
  private serviceName: string
  private serviceVersion: string
  private traces: TraceData[] = []

  constructor() {
    // Use the API proxy instead of direct OTLP collector to avoid CORS
    this.collectorUrl = '/api/v1/otlp/traces'  // This will go through Vite proxy to your API
    this.serviceName = 'metricsapp-webui'
    this.serviceVersion = '1.0.0'
  }

  // Generate unique IDs
  private generateId(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Create a new trace
  createTrace(operationName: string, tags: Record<string, any> = {}): TraceData {
    const trace: TraceData = {
      traceId: this.generateId(),
      spanId: this.generateId(),
      operationName,
      startTime: performance.now(),
      tags: {
        'service.name': this.serviceName,
        'service.version': this.serviceVersion,
        ...tags
      },
      logs: []
    }
    
    return trace
  }

  // Finish a trace
  finishTrace(trace: TraceData, tags: Record<string, any> = {}) {
    trace.endTime = performance.now()
    trace.tags = { ...trace.tags, ...tags }
    
    this.traces.push(trace)
    
    // Send to collector (simplified)
    this.sendTrace(trace)
  }

  // Add log to trace
  addLog(trace: TraceData, message: string, data: Record<string, any> = {}) {
    trace.logs.push({
      timestamp: performance.now(),
      fields: { message, ...data }
    })
  }

  // Send trace to OTLP collector
  private async sendTrace(trace: TraceData) {
    try {
      // Convert to simplified OTLP format
      const otlpData = {
        resourceSpans: [{
          resource: {
            attributes: [
              { key: 'service.name', value: { stringValue: this.serviceName } },
              { key: 'service.version', value: { stringValue: this.serviceVersion } }
            ]
          },
          instrumentationLibrarySpans: [{
            instrumentationLibrary: {
              name: this.serviceName,
              version: this.serviceVersion
            },
            spans: [{
              traceId: trace.traceId,
              spanId: trace.spanId,
              parentSpanId: trace.parentSpanId,
              name: trace.operationName,
              kind: 1, // SPAN_KIND_INTERNAL
              startTimeUnixNano: Math.floor((Date.now() - (performance.now() - trace.startTime)) * 1000000),
              endTimeUnixNano: trace.endTime ? Math.floor((Date.now() - (performance.now() - trace.endTime)) * 1000000) : undefined,
              attributes: Object.entries(trace.tags).map(([key, value]) => ({
                key,
                value: { stringValue: String(value) }
              })),
              events: trace.logs.map(log => ({
                timeUnixNano: Math.floor((Date.now() - (performance.now() - log.timestamp)) * 1000000),
                name: log.fields.message || 'log',
                attributes: Object.entries(log.fields).map(([key, value]) => ({
                  key,
                  value: { stringValue: String(value) }
                }))
              }))
            }]
          }]
        }]
      }

      await fetch(this.collectorUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(otlpData)
      })
    } catch (error) {
      console.warn('Failed to send trace to collector:', error)
    }
  }

  // Trace an async operation
  async traceAsync<T>(operationName: string, operation: () => Promise<T>, tags: Record<string, any> = {}): Promise<T> {
    const trace = this.createTrace(operationName, tags)
    
    try {
      const result = await operation()
      this.finishTrace(trace, { 'success': true })
      return result
    } catch (error) {
      this.addLog(trace, 'error', { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      this.finishTrace(trace, { 'success': false, 'error': true })
      throw error
    }
  }

  // Trace a route change
  traceRouteChange(routeName: string, additionalData: Record<string, any> = {}) {
    const trace = this.createTrace('route.change', {
      'route.name': routeName,
      'navigation.type': 'spa',
      ...additionalData
    })
    
    // Finish immediately for route changes
    setTimeout(() => {
      this.finishTrace(trace)
    }, 100)
  }

  // Trace an API call
  async traceApiCall<T>(url: string, method: string, apiCall: () => Promise<T>): Promise<T> {
    return this.traceAsync(`api.${method.toLowerCase()}`, apiCall, {
      'http.method': method,
      'http.url': url,
      'api.type': 'fetch'
    })
  }
}

// Global instance
const telemetry = new SimpleTelemetry()

// Export convenience functions
export const initializeTelemetry = () => {
  console.log('✅ Simple telemetry initialized')
  
  // Track unhandled errors
  window.addEventListener('error', (event) => {
    const trace = telemetry.createTrace('error.unhandled', {
      'error.type': 'javascript',
      'error.message': event.message,
      'error.filename': event.filename,
      'error.lineno': event.lineno
    })
    telemetry.finishTrace(trace)
  })
  
  window.addEventListener('unhandledrejection', (event) => {
    const trace = telemetry.createTrace('error.unhandled_promise', {
      'error.type': 'promise',
      'error.message': String(event.reason)
    })
    telemetry.finishTrace(trace)
  })
}

export const traceApiCall = telemetry.traceApiCall.bind(telemetry)
export const traceRouteChange = telemetry.traceRouteChange.bind(telemetry)
export const traceAsync = telemetry.traceAsync.bind(telemetry)

// Enhanced fetch wrapper
export const tracedFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const method = options?.method || 'GET'
  
  return telemetry.traceApiCall(url, method, async () => {
    const response = await fetch(url, options)
    return response
  })
} 