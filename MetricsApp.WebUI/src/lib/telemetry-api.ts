interface OTLPMetricSample {
  timestamp: number
  value: number
  labels: Record<string, string>
}

interface OTLPMetric {
  name: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary'
  description?: string
  unit?: string
  samples: OTLPMetricSample[]
}

interface TelemetryQueryParams {
  dataSource?: string
  startTime: Date
  endTime: Date
  metricNames?: string[]
  labels?: Record<string, string>
  aggregation?: string
  step?: string
  limit?: number
}

interface MetricMetadata {
  name: string
  type: string
  description?: string
  unit?: string
  labels: string[]
  lastSeen: Date
  sampleCount: number
}

interface TraceSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  operationName: string
  startTime: number
  endTime: number
  duration: number
  tags: Record<string, any>
  logs: Array<{
    timestamp: number
    fields: Record<string, any>
  }>
}

interface LogEntry {
  timestamp: number
  level: string
  message: string
  attributes: Record<string, any>
  resource: Record<string, any>
  traceId?: string
  spanId?: string
}

export class TelemetryApi {
  private static baseUrl = '/api/v1'  // Use relative URL to go through Vite proxy

  /**
   * Get available metric metadata from the new telemetry API
   */
  static async getMetricMetadata(dataSource?: string): Promise<MetricMetadata[]> {
    try {
      // Use the new telemetry metadata endpoint
      const response = await fetch(`${this.baseUrl}/telemetry/metrics/metadata`)
      if (response.ok) {
        const result = await response.json()
        if (result.status === 'success' && result.data?.metrics) {
          return result.data.metrics.map((metric: any) => ({
            name: metric.name,
            type: metric.type || 'gauge',
            description: metric.description,
            unit: metric.unit || 'value',
            labels: metric.labels || [],
            lastSeen: new Date(metric.lastSeen),
            sampleCount: metric.sampleCount || 0
          }))
        }
      }

      // Fallback to legacy metrics endpoint for performance counters
      const metricsResponse = await fetch(`${this.baseUrl}/metrics/available-metrics`)
      if (metricsResponse.ok) {
        const data = await metricsResponse.json()
        return data.metrics?.map((metric: any) => ({
          name: metric.counterName || metric.name,
          type: 'gauge', // Default type
          description: metric.displayName,
          unit: metric.unit || 'value',
          labels: metric.instances || [],
          lastSeen: new Date(),
          sampleCount: metric.sampleCount || 0
        })) || []
      }

      // If both fail, return mock data for development
      return this.getMockMetricMetadata()
    } catch (error) {
      console.error('Failed to get metric metadata:', error)
      return this.getMockMetricMetadata()
    }
  }

  /**
   * Query metrics data using the new telemetry API
   */
  static async queryMetrics(params: TelemetryQueryParams): Promise<OTLPMetric[]> {
    try {
      const queryParams = new URLSearchParams({
        startTime: params.startTime.toISOString(),
        endTime: params.endTime.toISOString(),
        limit: (params.limit || 1000).toString()
      })

      if (params.metricNames?.length) {
        params.metricNames.forEach(name => queryParams.append('metricNames', name))
      }

      const response = await fetch(`${this.baseUrl}/telemetry/metrics?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.status === 'success' && result.data?.metrics) {
        return this.parseNewTelemetryResponse(result.data)
      }
      
      throw new Error('Invalid response format')
    } catch (error) {
      console.error('Failed to query metrics:', error)
      // Return mock data for development
      return this.generateMockMetrics(params)
    }
  }

  /**
   * Query performance counter metrics specifically
   */
  static async queryPerformanceCounters(params: {
    minutes?: number
    counterName?: string
    hostName?: string
  }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams()
      if (params.minutes) queryParams.set('minutes', params.minutes.toString())
      if (params.counterName) queryParams.set('counterName', params.counterName)
      if (params.hostName) queryParams.set('hostName', params.hostName)

      const response = await fetch(`${this.baseUrl}/metrics/performance-counters?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Performance counter query failed: ${response.statusText}`)
      }

      const data = await response.json()
      return data.metrics || []
    } catch (error) {
      console.error('Failed to query performance counters:', error)
      return []
    }
  }

  /**
   * Query traces from OTLP endpoint
   */
  static async queryTraces(params: {
    startTime: Date
    endTime: Date
    serviceName?: string
    operationName?: string
    tags?: Record<string, string>
    limit?: number
  }): Promise<TraceSpan[]> {
    try {
      // For now, return mock trace data
      // In a real implementation, this would query your trace storage
      return this.generateMockTraces(params)
    } catch (error) {
      console.error('Failed to query traces:', error)
      return []
    }
  }

  /**
   * Query logs from telemetry API
   */
  static async queryLogs(params: {
    startTime: Date
    endTime: Date
    level?: string
    searchText?: string
    attributes?: Record<string, string>
    limit?: number
  }): Promise<LogEntry[]> {
    try {
      const queryParams = new URLSearchParams({
        startTime: params.startTime.toISOString(),
        endTime: params.endTime.toISOString(),
        limit: (params.limit || 100).toString()
      })

      if (params.level) queryParams.set('level', params.level)
      if (params.searchText) queryParams.set('search', params.searchText)

      const response = await fetch(`${this.baseUrl}/telemetry/logs?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`)
      }

      const result = await response.json()
      if (result.status === 'success' && result.data?.logs) {
        return result.data.logs.map((log: any) => ({
          timestamp: log.timestamp,
          level: log.level,
          message: log.message,
          attributes: log.attributes || {},
          resource: log.resource || {},
          traceId: log.traceId,
          spanId: log.spanId
        }))
      }
      
      // Fallback to mock data
      return this.generateMockLogs(params)
    } catch (error) {
      console.error('Failed to query logs:', error)
      // Return mock data for development
      return this.generateMockLogs(params)
    }
  }

  /**
   * Get OTLP endpoint statistics
   */
  static async getOTLPStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/otlp/debug/stats`)
      if (response.ok) {
        return await response.json()
      }
      return null
    } catch (error) {
      console.error('Failed to get OTLP stats:', error)
      return null
    }
  }

  /**
   * Test OTLP endpoint health
   */
  static async testOTLPHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/telemetry/health`)
      return response.ok
    } catch (error) {
      console.error('OTLP health check failed:', error)
      return false
    }
  }

  // Helper methods
  private static parseMetricMetadata(schema: any): MetricMetadata[] {
    // Parse the schema response to extract metric metadata
    if (schema.metricNames) {
      return schema.metricNames.map((name: string) => ({
        name,
        type: 'gauge',
        description: `Metric: ${name}`,
        unit: 'value',
        labels: schema.attributeKeys || [],
        lastSeen: new Date(),
        sampleCount: 0
      }))
    }
    return []
  }

  private static parseMetricsResponse(data: any): OTLPMetric[] {
    if (!data) return []

    // Handle different response formats
    if (Array.isArray(data)) {
      // Handle MetricTimeSeries format
      return data.map(series => ({
        name: series.metricInfo?.name || 'unknown',
        type: 'gauge' as const,
        description: series.metricInfo?.description,
        unit: series.metricInfo?.unit,
        samples: series.values?.map(([timestamp, value]: [number, string]) => ({
          timestamp,
          value: parseFloat(value),
          labels: series.metricInfo?.attributes || {}
        })) || []
      }))
    }

    return []
  }

  private static parseNewTelemetryResponse(data: any): OTLPMetric[] {
    if (!data?.metrics) return []

    return data.metrics.map((metric: any) => ({
      name: metric.name,
      type: metric.type as 'gauge' | 'counter' | 'histogram',
      description: metric.description,
      unit: metric.unit,
      samples: metric.samples?.map((sample: any) => ({
        timestamp: sample.timestamp,
        value: sample.value,
        labels: sample.labels || {}
      })) || []
    }))
  }

  private static generateMockMetrics(params: TelemetryQueryParams): OTLPMetric[] {
    const metrics: OTLPMetric[] = []
    const metricNames = params.metricNames || [
      'http_requests_total',
      'cpu_usage_percent',
      'memory_usage_bytes',
      'disk_io_bytes_total'
    ]

    const timeRange = params.endTime.getTime() - params.startTime.getTime()
    const interval = Math.max(60000, timeRange / 100) // At least 1 minute intervals
    const numSamples = Math.floor(timeRange / interval)

    metricNames.forEach(name => {
      const samples: OTLPMetricSample[] = []
      
      for (let i = 0; i < numSamples; i++) {
        const timestamp = params.startTime.getTime() + (i * interval)
        const baseValue = name.includes('cpu') ? 50 : 
                         name.includes('memory') ? 1024 * 1024 * 512 : 
                         name.includes('http') ? 1000 : 100
        
        samples.push({
          timestamp: Math.floor(timestamp / 1000),
          value: baseValue + (Math.random() - 0.5) * baseValue * 0.3 + Math.sin(i / 10) * baseValue * 0.2,
          labels: {
            instance: 'server-1',
            environment: 'production',
            service: name.includes('http') ? 'web-service' : 'system'
          }
        })
      }

      metrics.push({
        name,
        type: name.includes('total') ? 'counter' : 'gauge',
        description: `Mock metric: ${name}`,
        unit: name.includes('bytes') ? 'bytes' : name.includes('percent') ? 'percent' : 'count',
        samples
      })
    })

    return metrics
  }

  private static generateMockTraces(params: any): TraceSpan[] {
    const traces: TraceSpan[] = []
    const operations = ['GET /api/users', 'POST /api/orders', 'GET /api/products', 'database_query', 'cache_lookup']
    
    for (let i = 0; i < 50; i++) {
      const startTime = params.startTime.getTime() + Math.random() * (params.endTime.getTime() - params.startTime.getTime())
      const duration = Math.random() * 1000 + 10 // 10ms to 1s
      
      traces.push({
        traceId: `trace_${i}`,
        spanId: `span_${i}`,
        operationName: operations[Math.floor(Math.random() * operations.length)],
        startTime: Math.floor(startTime / 1000),
        endTime: Math.floor((startTime + duration) / 1000),
        duration,
        tags: {
          'http.method': 'GET',
          'http.status_code': Math.random() > 0.9 ? 500 : 200,
          'service.name': 'web-service'
        },
        logs: []
      })
    }

    return traces
  }

  private static generateMockLogs(params: any): LogEntry[] {
    const logs: LogEntry[] = []
    const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG']
    const messages = [
      'Request processed successfully',
      'Database connection established',
      'Cache miss for key: user_123',
      'Slow query detected',
      'Service health check passed'
    ]

    for (let i = 0; i < 100; i++) {
      const timestamp = params.startTime.getTime() + Math.random() * (params.endTime.getTime() - params.startTime.getTime())
      
      logs.push({
        timestamp: Math.floor(timestamp / 1000),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        attributes: {
          'service.name': 'web-service',
          'service.version': '1.0.0'
        },
        resource: {
          'host.name': 'server-1',
          'container.id': 'container_123'
        }
      })
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp)
  }

  private static getMockMetricMetadata(): MetricMetadata[] {
    return [
      {
        name: 'http_requests_total',
        type: 'counter',
        description: 'Total number of HTTP requests',
        unit: 'requests',
        labels: ['method', 'status', 'endpoint'],
        lastSeen: new Date(),
        sampleCount: 1000
      },
      {
        name: 'http_request_duration_seconds',
        type: 'histogram',
        description: 'HTTP request duration in seconds',
        unit: 'seconds',
        labels: ['method', 'endpoint'],
        lastSeen: new Date(),
        sampleCount: 1000
      },
      {
        name: 'cpu_usage_percent',
        type: 'gauge',
        description: 'CPU usage percentage',
        unit: 'percent',
        labels: ['instance', 'cpu'],
        lastSeen: new Date(),
        sampleCount: 500
      },
      {
        name: 'memory_usage_bytes',
        type: 'gauge',
        description: 'Memory usage in bytes',
        unit: 'bytes',
        labels: ['instance'],
        lastSeen: new Date(),
        sampleCount: 500
      },
      {
        name: 'disk_io_bytes_total',
        type: 'counter',
        description: 'Total disk I/O in bytes',
        unit: 'bytes',
        labels: ['device', 'operation'],
        lastSeen: new Date(),
        sampleCount: 800
      },
      {
        name: 'network_bytes_total',
        type: 'counter',
        description: 'Total network bytes transferred',
        unit: 'bytes',
        labels: ['interface', 'direction'],
        lastSeen: new Date(),
        sampleCount: 600
      },
      {
        name: 'database_connections_active',
        type: 'gauge',
        description: 'Number of active database connections',
        unit: 'connections',
        labels: ['database', 'pool'],
        lastSeen: new Date(),
        sampleCount: 300
      },
      {
        name: 'cache_hits_total',
        type: 'counter',
        description: 'Total number of cache hits',
        unit: 'hits',
        labels: ['cache_name', 'key_pattern'],
        lastSeen: new Date(),
        sampleCount: 400
      }
    ]
  }
}

export default TelemetryApi 