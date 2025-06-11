import { useState } from 'react'
import { Search as SearchIcon, Calendar, Download, Play, AlertCircle, Clock } from 'lucide-react'

interface SearchFilters {
  query: string
  startTime: string
  endTime: string
  limit: number
}

interface MetricResult {
  id: string
  timestamp: string
  metricName: string
  value: string
  source: string
  environment: string
}

// Helper function to get default time range (last 24 hours)
const getDefaultTimeRange = () => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  return {
    startTime: yesterday.toISOString().slice(0, 16),
    endTime: now.toISOString().slice(0, 16)
  }
}

const Search = () => {
  const defaultTimeRange = getDefaultTimeRange()
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    startTime: defaultTimeRange.startTime,
    endTime: defaultTimeRange.endTime,
    limit: 100
  })
  
  const [results, setResults] = useState<MetricResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    setLoading(true)
    setSearched(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams()
      if (filters.query) queryParams.append('query', filters.query)
      if (filters.startTime) queryParams.append('startTime', filters.startTime)
      if (filters.endTime) queryParams.append('endTime', filters.endTime)
      queryParams.append('limit', filters.limit.toString())

      const response = await fetch(`/api/v1/metrics/Query?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('API Response:', data) // Debug log to see the actual response structure
      
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
      const transformedResults: MetricResult[] = metricsArray.map((item: any, index: number) => ({
        id: item.id || item.Id || index.toString(),
        timestamp: item.timestamp || item.Timestamp || item.time || new Date().toISOString(),
        metricName: item.metricName || item.MetricName || item.name || item.Name || 'unknown',
        value: (item.value || item.Value || item.val || '0').toString(),
        source: item.source || item.Source || item.host || item.Host || 'unknown',
        environment: item.environment || item.Environment || item.env || item.Env || 'unknown'
      }))
      
      setResults(transformedResults)
    } catch (err) {
      console.error('Search error:', err)
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Network error: Unable to connect to the API. Please ensure the MetricsApp service is running on localhost:7201.')
        
        // Show mock data for testing when API is not available
        const mockResults: MetricResult[] = [
          {
            id: '1',
            timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
            metricName: 'cpu.usage',
            value: '85.2',
            source: 'PROD-WEB-01',
            environment: 'Production'
          },
          {
            id: '2',
            timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
            metricName: 'memory.usage',
            value: '72.8',
            source: 'PROD-DB-01',
            environment: 'Production'
          },
          {
            id: '3',
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
            metricName: 'disk.free',
            value: '15.3',
            source: 'STAGE-API-01',
            environment: 'Staging'
          },
          {
            id: '4',
            timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 minutes ago
            metricName: 'response.time',
            value: '245',
            source: 'DEV-WEB-01',
            environment: 'Development'
          }
        ]
        setResults(mockResults)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
        setResults([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Metric Name', 'Value', 'Source', 'Environment'],
      ...results.map((r: MetricResult) => [r.timestamp, r.metricName, r.value, r.source, r.environment])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'metrics-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const setQuickTimeRange = (hours: number) => {
    const now = new Date()
    const start = new Date(now.getTime() - hours * 60 * 60 * 1000)
    
    setFilters({
      ...filters,
      startTime: start.toISOString().slice(0, 16),
      endTime: now.toISOString().slice(0, 16)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-themed-border-primary pb-4">
        <h1 className="text-3xl font-bold text-themed-text-primary">Search & Reporting</h1>
        <p className="mt-2 text-themed-text-secondary">Query and analyze your metrics data in real-time</p>
      </div>

      {/* Search Form */}
      <div className="bg-themed-bg-tertiary shadow-lg rounded-lg border border-themed-border-primary">
        <div className="px-6 py-4 border-b border-themed-border-primary">
          <h2 className="text-lg font-semibold text-themed-text-primary">Search Criteria</h2>
        </div>
        <form onSubmit={handleSearch} className="p-6 space-y-6">
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-themed-text-primary mb-2">
              Query
            </label>
            <div className="relative">
              <input
                type="text"
                id="query"
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                className="block w-full pl-10 pr-3 py-3 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary placeholder-themed-text-muted focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary font-mono text-sm"
                placeholder="Enter your search query..."
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-themed-text-muted" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-themed-text-primary mb-2">
                Start Time
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  id="startTime"
                  value={filters.startTime}
                  onChange={(e) => setFilters({ ...filters, startTime: e.target.value })}
                  className="block w-full pl-10 pr-3 py-3 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-themed-text-muted" />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-themed-text-primary mb-2">
                End Time  
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  id="endTime"
                  value={filters.endTime}
                  onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
                  className="block w-full pl-10 pr-3 py-3 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Calendar className="h-5 w-5 text-themed-text-muted" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="limit" className="block text-sm font-medium text-themed-text-primary mb-2">
              Result Limit
            </label>
            <select
              id="limit"
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
              className="block w-full px-3 py-3 border border-themed-border-primary rounded-lg bg-themed-bg-surface text-themed-text-primary focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary focus:border-themed-interactive-primary"
            >
              <option value={10}>10 results</option>
              <option value={25}>25 results</option>
              <option value={50}>50 results</option>
              <option value={100}>100 results</option>
              <option value={500}>500 results</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-themed-text-primary mb-2">
              Export Options
            </label>
            <div className="flex flex-wrap gap-3">
              {['JSON', 'CSV', 'Excel'].map((format) => (
                <label key={format} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => {}}
                    className="rounded border-themed-border-primary text-themed-interactive-primary focus:ring-themed-interactive-primary"
                  />
                  <span className="ml-2 text-sm text-themed-text-secondary">{format}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setFilters({
                  query: '',
                  startTime: defaultTimeRange.startTime,
                  endTime: defaultTimeRange.endTime,
                  limit: 100
                })
                setResults([])
                setError(null)
              }}
              className="inline-flex items-center px-3 py-2 border border-themed-border-primary text-sm font-medium rounded-lg text-themed-text-primary bg-themed-bg-surface hover:bg-themed-interactive-secondary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary transition-colors"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading || !filters.query}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-themed-text-inverse bg-themed-interactive-primary hover:bg-themed-interactive-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-themed-interactive-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <SearchIcon className="h-4 w-4 mr-2" />
              )}
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Debug Section - Remove this in production */}
      {import.meta.env.DEV && error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Debug Information</h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                Check the browser console (F12) for the actual API response structure. 
                The application will try to handle different response formats automatically.
              </p>
              <details className="mt-2">
                <summary className="text-sm font-medium text-yellow-800 dark:text-yellow-200 cursor-pointer">
                  Expected API Response Formats
                </summary>
                <pre className="mt-2 text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded overflow-x-auto">
{`// Direct array:
[{id: "1", timestamp: "...", metricName: "...", value: "...", source: "...", environment: "..."}]

// Wrapped in data property:
{data: [{id: "1", ...}]}

// Wrapped in results property:
{results: [{id: "1", ...}]}

// Single object:
{id: "1", timestamp: "...", metricName: "...", value: "...", source: "...", environment: "..."}`}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-themed-status-error bg-opacity-10 border border-themed-status-error rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-themed-status-error mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-themed-status-error">Search Error</h3>
              <p className="mt-1 text-sm text-themed-text-secondary">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {searched && (
        <div className="bg-themed-bg-tertiary shadow-lg rounded-lg border border-themed-border-primary">
          <div className="px-6 py-4 border-b border-themed-border-primary">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-themed-text-primary">
                Search Results 
                <span className="ml-2 text-sm font-normal text-themed-text-secondary">
                  ({results.length} events)
                </span>
              </h3>
              {results.length > 0 && (
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-4 py-2 border border-themed-border-primary text-sm font-medium rounded-lg text-themed-text-primary bg-themed-bg-surface hover:bg-themed-interactive-secondary-hover focus:outline-none focus:ring-2 focus:ring-themed-interactive-primary transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-themed-interactive-primary"></div>
              <span className="ml-3 text-themed-text-secondary">Searching metrics...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-themed-border-primary">
                <thead className="bg-themed-bg-surface">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-primary uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-primary uppercase tracking-wider">
                      Metric Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-primary uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-primary uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-themed-text-primary uppercase tracking-wider">
                      Environment
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-themed-bg-surface divide-y divide-themed-border-primary">
                  {results.map((result) => (
                    <tr key={result.id} className="hover:bg-themed-interactive-secondary-hover transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-themed-text-primary font-mono">
                        {new Date(result.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-themed-text-primary font-mono">
                        {result.metricName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-themed-text-primary font-mono">
                        {result.value}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-themed-text-primary">
                        {result.source}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.environment === 'Production' 
                            ? 'bg-themed-status-error bg-opacity-10 text-themed-status-error'
                            : result.environment === 'Staging'
                            ? 'bg-themed-status-warning bg-opacity-10 text-themed-status-warning'
                            : 'bg-themed-status-success bg-opacity-10 text-themed-status-success'
                        }`}>
                          {result.environment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <SearchIcon className="mx-auto h-12 w-12 text-themed-text-muted" />
              <h3 className="mt-2 text-sm font-medium text-themed-text-primary">No results found</h3>
              <p className="mt-1 text-sm text-themed-text-secondary">
                Try adjusting your search criteria or time range.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Search 