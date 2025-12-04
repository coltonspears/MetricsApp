import { useState } from 'react'
import { Search as SearchIcon, Calendar, Download, AlertCircle, Clock, Database, RefreshCw } from 'lucide-react'
import PageHeader from '../components/PageHeader'

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

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)
    setSearched(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      if (filters.query) queryParams.append('query', filters.query)
      if (filters.startTime) queryParams.append('startTime', filters.startTime)
      if (filters.endTime) queryParams.append('endTime', filters.endTime)
      queryParams.append('limit', filters.limit.toString())

      const response = await fetch(`/api/v1/telemetry/metrics?${queryParams}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      let metricsArray: any[] = []

      if (data && data.status === 'success' && data.data && Array.isArray(data.data.metrics)) {
        const metrics = data.data.metrics
        metricsArray = []
        metrics.forEach((metric: any, metricIndex: number) => {
          const metricName = metric.name || 'unknown'
          const samples = metric.samples || []
          if (samples.length === 0) {
            metricsArray.push({
              id: `${metricIndex}-0`,
              timestamp: new Date().toISOString(),
              metricName: metricName,
              value: '0',
              source: 'unknown',
              environment: 'Production'
            })
          } else {
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
        metricsArray = data
      } else if (data && Array.isArray(data.data)) {
        metricsArray = data.data
      } else if (data && Array.isArray(data.results)) {
        metricsArray = data.results
      } else if (data && Array.isArray(data.metrics)) {
        metricsArray = data.metrics
      }

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
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
      setResults([])
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

  const handleClear = () => {
    setFilters({
      query: '',
      startTime: defaultTimeRange.startTime,
      endTime: defaultTimeRange.endTime,
      limit: 100
    })
    setResults([])
    setSearched(false)
    setError(null)
  }

  const formatTimeRange = () => {
    const start = new Date(filters.startTime)
    const end = new Date(filters.endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    if (diffHours < 24) return `${diffHours}h`
    return `${Math.round(diffHours / 24)}d`
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Search"
        description="Query and analyze your metrics data in real-time"
        meta={
          <span className="badge-muted">
            <Database className="h-3 w-3" />
            Telemetry API
          </span>
        }
        actions={
          <div className="page-actions">
            <button
              type="button"
              onClick={handleClear}
              className="btn-themed-secondary"
            >
              Clear
            </button>
            <button
              type="submit"
              form="search-form"
              disabled={loading || !filters.query}
              className="btn-themed-primary disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <SearchIcon className="h-4 w-4 mr-2" />
              )}
              Search
            </button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge-muted">
            <Clock className="h-3 w-3" />
            Range: {formatTimeRange()}
          </span>
          <span className="badge-muted">
            Limit: {filters.limit}
          </span>
          {searched && (
            <span className="badge-muted">
              {results.length} results
            </span>
          )}
        </div>
      </PageHeader>

      <div className="page-toolbar">
        <div className="page-toolbar__group text-sm text-themed-text-secondary">
          <SearchIcon className="h-4 w-4 text-themed-text-muted" />
          <span>{filters.query || 'No query entered'}</span>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group text-sm text-themed-text-secondary">
          <Clock className="h-4 w-4 text-themed-text-muted" />
          <span>{formatTimeRange()} window</span>
        </div>
      </div>

      {error && (
        <div className="panel border-themed-alert-error">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-themed-status-error flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="panel-title text-themed-status-error">Search Error</h3>
              <p className="text-sm text-themed-text-secondary mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <h3 className="panel-title">Search Criteria</h3>
        </div>

        <form id="search-form" onSubmit={handleSearch} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="query" className="block text-sm font-medium text-themed-text-primary">
              Query
            </label>
            <div className="relative">
              <input
                type="text"
                id="query"
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                className="input-themed w-full pl-10 font-mono"
                placeholder="Enter your search query..."
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="startTime" className="block text-sm font-medium text-themed-text-primary">
                Start Time
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  id="startTime"
                  value={filters.startTime}
                  onChange={(e) => setFilters({ ...filters, startTime: e.target.value })}
                  className="input-themed w-full pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="endTime" className="block text-sm font-medium text-themed-text-primary">
                End Time
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  id="endTime"
                  value={filters.endTime}
                  onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
                  className="input-themed w-full pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="limit" className="block text-sm font-medium text-themed-text-primary">
              Result Limit
            </label>
            <select
              id="limit"
              value={filters.limit}
              onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) })}
              className="input-themed w-full md:w-48"
            >
              <option value={10}>10 results</option>
              <option value={25}>25 results</option>
              <option value={50}>50 results</option>
              <option value={100}>100 results</option>
              <option value={500}>500 results</option>
            </select>
          </div>
        </form>
      </div>

      {searched && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Search Results</h3>
              <p className="panel-subtitle">{results.length} events found</p>
            </div>
            {results.length > 0 && (
              <button onClick={handleExport} className="btn-themed-secondary">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-themed-interactive-primary" />
              <span className="ml-3 text-themed-text-secondary">Searching metrics...</span>
            </div>
          ) : results.length > 0 ? (
            <div className="overflow-x-auto -mx-6">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-themed-border-primary">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">
                      Metric Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-themed-text-secondary uppercase tracking-wider">
                      Environment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-themed-border-primary">
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
                        <span className={`badge-muted ${
                          result.environment === 'Production'
                            ? 'border-themed-status-error text-themed-status-error'
                            : result.environment === 'Staging'
                            ? 'border-themed-status-warning text-themed-status-warning'
                            : 'border-themed-status-success text-themed-status-success'
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
