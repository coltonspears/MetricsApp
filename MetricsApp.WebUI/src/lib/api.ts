const API_BASE_URL = '/api/v1'

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
        throw new ApiError(0, 'Network error: Unable to connect to the metrics API. Please ensure the service is running on localhost:7201.')
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

    const endpoint = `/metrics/Query${queryParams.toString() ? `?${queryParams}` : ''}`
    
    try {
      const data = await this.request<any>(endpoint)
      console.log('API Response:', data) // Debug log
      
      // Handle different possible response structures
      let metricsArray: any[] = []
      
      if (data && data.status === 'success' && data.data && Array.isArray(data.data.result)) {
        // Handle the specific MetricsApp API format
        const results = data.data.result
        
        // Flatten the time-series data into individual metric records
        metricsArray = []
        results.forEach((metric: any, metricIndex: number) => {
          const metricInfo = metric.metricInfo || {}
          const metricName = metricInfo.name || 'unknown'
          const hostName = metricInfo.resource?.['host.name'] || 'unknown'
          const values = metric.values || []
          
          // Create a record for each time-value pair
          values.forEach((valuePoint: any, valueIndex: number) => {
            const timestamp = valuePoint.item1 ? new Date(valuePoint.item1 * 1000).toISOString() : new Date().toISOString()
            const value = valuePoint.item2 || '0'
            
            metricsArray.push({
              id: `${metricIndex}-${valueIndex}`,
              timestamp: timestamp,
              metricName: metricName,
              value: value,
              source: hostName,
              environment: 'Production' // Default since not in the response
            })
          })
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
      const data = await this.request<any>('/metrics/summary')
      return {
        totalMetrics: data.totalMetrics || 0,
        uniqueServers: data.uniqueServers || 0,
        uniqueMetricTypes: data.uniqueMetricTypes || 0,
        lastMetricTime: data.lastMetricTime || 'Never'
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