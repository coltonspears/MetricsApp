// Resolve the API base URL once. Order of precedence:
//  1. VITE_API_BASE_URL env var (injected at build time or via Aspire)
//  2. services__metricsapp-api__https__0 / __http__0 (Aspire-injected)
//  3. Same-origin /api/v1 (production reverse-proxy / Docker Compose)
function resolveApiBaseUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>
  const explicit = env.VITE_API_BASE_URL
  if (explicit) {
    return explicit.replace(/\/$/, '')
  }

  const aspireHttps = env['services__metricsapp-api__https__0']
  const aspireHttp = env['services__metricsapp-api__http__0']
  const aspire = aspireHttps ?? aspireHttp
  if (aspire) {
    return `${aspire.replace(/\/$/, '')}/api/v1`
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/v1`
  }

  return '/api/v1'
}

export const API_BASE_URL = resolveApiBaseUrl()

export interface MetricQueryParams {
  query?: string
  startTime?: string
  endTime?: string
  limit?: number
}

export interface MetricResult {
  id: string
  timestamp: string
  metricName: string
  value: string
  source: string
  environment: string
}

export interface ApiResponse<T> {
  data: T
  success: boolean
  error?: string
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export class MetricsApi {
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
        throw new ApiError(response.status, `HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(0, `Network error: Unable to reach the metrics API at ${API_BASE_URL}. Please ensure the service is running.`)
      }
      
      throw new ApiError(500, error instanceof Error ? error.message : 'Unknown error occurred')
    }
  }

  static async queryMetrics(params: MetricQueryParams): Promise<MetricResult[]> {
    const queryParams = new URLSearchParams()

    if (params.query) queryParams.append('query', params.query)
    if (params.startTime) queryParams.append('startTime', params.startTime)
    if (params.endTime) queryParams.append('endTime', params.endTime)
    if (params.limit) queryParams.append('limit', params.limit.toString())

    const endpoint = `/telemetry/metrics${queryParams.toString() ? `?${queryParams}` : ''}`

    try {
      const data = await this.request<any>(endpoint)

      // Handle different possible response structures
      let metricsArray: any[] = []

      // Primary format: TelemetryController returns { status: 'success', data: { metrics: [...], timeRange: {...} } }
      if (data && data.status === 'success' && data.data && Array.isArray(data.data.metrics)) {
        const metrics = data.data.metrics

        // Flatten metrics with samples into individual metric records
        metricsArray = []
        metrics.forEach((metric: any, metricIndex: number) => {
          const metricName = metric.name || 'unknown'
          const samples = metric.samples || []

          if (samples.length === 0) {
            // Metric with no samples - still include it
            metricsArray.push({
              id: `${metricIndex}-0`,
              timestamp: new Date().toISOString(),
              metricName: metricName,
              value: '0',
              source: 'unknown',
              environment: 'Production'
            })
          } else {
            // Create a record for each sample
            samples.forEach((sample: any, sampleIndex: number) => {
              const timestamp = sample.timestamp
                ? new Date(sample.timestamp * 1000).toISOString()
                : new Date().toISOString()
              const labels = sample.labels || {}

              metricsArray.push({
                id: `${metricIndex}-${sampleIndex}`,
                timestamp: timestamp,
                metricName: metricName,
                value: (sample.value ?? 0).toString(),
                source: labels['resource.host.name'] || labels['host'] || 'unknown',
                environment: labels['environment'] || labels['env'] || 'Production'
              })
            })
          }
        })
      } else if (Array.isArray(data)) {
        // Direct array response (fallback)
        metricsArray = data
      } else if (data && Array.isArray(data.data)) {
        // Wrapped in data property (fallback)
        metricsArray = data.data
      } else if (data && Array.isArray(data.results)) {
        // Wrapped in results property (fallback)
        metricsArray = data.results
      } else if (data && Array.isArray(data.metrics)) {
        // Wrapped in metrics property (fallback)
        metricsArray = data.metrics
      } else if (data && typeof data === 'object') {
        // Single object response - wrap in array (fallback)
        metricsArray = [data]
      } else {
        // Unexpected response format
        console.warn('Unexpected API response format:', data)
        metricsArray = []
      }

      // Transform the API response to match our interface
      return metricsArray.map((item: any, index: number) => ({
        id: item.id || item.Id || index.toString(),
        timestamp: item.timestamp || item.Timestamp || item.time || new Date().toISOString(),
        metricName: item.metricName || item.MetricName || item.name || item.Name || 'unknown',
        value: (item.value || item.Value || item.val || '0').toString(),
        source: item.source || item.Source || item.host || item.Host || 'unknown',
        environment: item.environment || item.Environment || item.env || item.Env || 'unknown'
      }))
    } catch (error) {
      console.error('Metrics query failed:', error)
      throw error
    }
  }

  static async getMetricsSummary(): Promise<{
    totalMetrics: number
    uniqueServers: number
    uniqueMetricTypes: number
    lastMetricTime: string
  }> {
    try {
      const data = await this.request<any>('/telemetry/stats')

      // TelemetryStatsResponse format: { metrics: { count, lastReceived }, logs: {...}, traces: {...}, timestamp }
      const metricsCount = data?.metrics?.count ?? 0
      const logsCount = data?.logs?.count ?? 0
      const tracesCount = data?.traces?.count ?? 0
      const lastReceived = data?.metrics?.lastReceived || data?.logs?.lastReceived || data?.traces?.lastReceived

      return {
        totalMetrics: metricsCount + logsCount + tracesCount,
        uniqueServers: 0, // Not available from stats endpoint
        uniqueMetricTypes: 0, // Not available from stats endpoint
        lastMetricTime: lastReceived ? new Date(lastReceived).toLocaleString() : 'Never'
      }
    } catch (error) {
      console.error('Failed to fetch metrics summary:', error)
      // Return default values if API fails
      return {
        totalMetrics: 0,
        uniqueServers: 0,
        uniqueMetricTypes: 0,
        lastMetricTime: 'API Unavailable'
      }
    }
  }
} 
