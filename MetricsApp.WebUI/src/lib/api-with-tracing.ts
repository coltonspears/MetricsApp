import { tracedFetch as fetchWithTracing } from './simple-telemetry'

// Simplified API wrapper that uses the simple telemetry
export const tracedApi = {
  async get(url: string, options?: Omit<RequestInit, 'method'>) {
    return fetchWithTracing(url, { ...options, method: 'GET' })
  },

  async post(url: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>) {
    return fetchWithTracing(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  async put(url: string, data?: any, options?: Omit<RequestInit, 'method' | 'body'>) {
    return fetchWithTracing(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    })
  },

  async delete(url: string, options?: Omit<RequestInit, 'method'>) {
    return fetchWithTracing(url, { ...options, method: 'DELETE' })
  },
}

// Re-export the traced fetch for direct use
export const tracedFetch = fetchWithTracing

// Example usage in your components:
// import { tracedApi } from './lib/api-with-tracing'
// 
// const response = await tracedApi.get('/api/v1/metrics/query?startTime=...')
// const data = await response.json() 