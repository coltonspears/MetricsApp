import { traceApiCall, tracedFetch } from './telemetry'

export const tracedApi = {
  async get(url: string, options?: Omit<RequestInit, 'method'>) {
    return traceApiCall(url, 'GET', () => fetch(url, { ...options, method: 'GET' }))
  },

  async post(url: string, data?: unknown, options?: Omit<RequestInit, 'method' | 'body'>) {
    const requestInit: RequestInit = {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }

    return traceApiCall(url, 'POST', () => fetch(url, requestInit))
  },

  async put(url: string, data?: unknown, options?: Omit<RequestInit, 'method' | 'body'>) {
    const requestInit: RequestInit = {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }

    return traceApiCall(url, 'PUT', () => fetch(url, requestInit))
  },

  async delete(url: string, options?: Omit<RequestInit, 'method'>) {
    return traceApiCall(url, 'DELETE', () => fetch(url, { ...options, method: 'DELETE' }))
  },
}

export { tracedFetch }
