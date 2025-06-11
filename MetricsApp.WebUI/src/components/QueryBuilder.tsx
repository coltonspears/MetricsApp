import { useState } from 'react'
import { Clock, HelpCircle, Database, ChevronDown, Play, Code, Settings, Calendar } from 'lucide-react'
import { DataSourceConfiguration } from '../lib/datasource-api'
import DataSourceIcon from './DataSourceIcon'

interface DataSource extends DataSourceConfiguration {
  category: 'datasource' | 'ingested'
}

interface AvailableMetric {
  name: string
  type: string
  description?: string
}

interface QueryBuilderProps {
  datasources: DataSource[]
  selectedDatasourceId: string
  query: string
  queryMode: 'builder' | 'code'
  availableMetrics: AvailableMetric[]
  loadingMetrics: boolean
  timeRange: {
    startTime: string
    endTime: string
  }
  onQueryChange: (query: string) => void
  onQueryModeChange: (mode: 'builder' | 'code') => void
  onDatasourceChange: (datasourceId: string) => void
  onTimeRangeChange: (timeRange: { startTime: string; endTime: string }) => void
  onQuickTimeRange: (hours: number) => void
  onExecute: () => void
  isRunning: boolean
}

const QueryBuilder = ({
  datasources,
  selectedDatasourceId,
  query,
  queryMode,
  availableMetrics,
  loadingMetrics,
  timeRange,
  onQueryChange,
  onQueryModeChange,
  onDatasourceChange,
  onTimeRangeChange,
  onQuickTimeRange,
  onExecute,
  isRunning
}: QueryBuilderProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = useState(false)
  const [builderState, setBuilderState] = useState({
    selectedMetric: '',
    filters: [] as Array<{ field: string; operator: string; value: string }>
  })

  const selectedDatasource = datasources.find(ds => ds.id === selectedDatasourceId)

  const getQuerySuggestions = (datasourceType: string): string[] => {
    switch (datasourceType) {
      case 'prometheus':
        return [
          'up',
          'rate(http_requests_total[5m])',
          'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
          'increase(counter_total[1h])',
          'avg(cpu_usage) by (instance)'
        ]
      case 'sqlserver':
        return [
          'SELECT TOP 100 * FROM Logs WHERE timestamp >= DATEADD(hour, -1, GETDATE())',
          'SELECT COUNT(*) FROM Logs WHERE level = \'ERROR\' AND timestamp >= DATEADD(day, -1, GETDATE())',
          'SELECT source, COUNT(*) as count FROM Logs GROUP BY source ORDER BY count DESC',
          'SELECT * FROM Metrics WHERE timestamp >= DATEADD(hour, -6, GETDATE()) ORDER BY timestamp DESC',
          'SELECT AVG(CAST(value AS FLOAT)) as avg_value FROM Metrics WHERE timestamp >= DATEADD(hour, -1, GETDATE())'
        ]
      case 'ingested':
        return [
          'metricName=cpu.usage',
          'metricName=memory.usage AND source=PROD-WEB-01',
          'environment=Production',
          'source=PROD-DB-01 OR source=PROD-WEB-01',
          'metricName=MSMQ AND environment=Production'
        ]
      default:
        return []
    }
  }

  const getQueryHelp = (datasourceType: string): string => {
    switch (datasourceType) {
      case 'prometheus':
        return 'Enter a PromQL query. Examples: up, rate(http_requests_total[5m]), histogram_quantile(0.95, ...)'
      case 'sqlserver':
        return 'Enter a SQL query. Use table names like "Logs" or "Metrics". Include WHERE clauses for time filtering.'
      case 'ingested':
        return 'Filter ingested metrics. Examples: metricName=cpu.usage, environment=Production, source=PROD-WEB-01'
      default:
        return 'Enter a query for this datasource type'
    }
  }

  const insertSuggestion = (suggestion: string) => {
    onQueryChange(suggestion)
    setShowSuggestions(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      onExecute()
    }
  }

  const addFilter = () => {
    setBuilderState(prev => ({
      ...prev,
      filters: [...prev.filters, { field: '', operator: '=', value: '' }]
    }))
  }

  const updateFilter = (index: number, field: string, operator: string, value: string) => {
    setBuilderState(prev => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { field, operator, value } : filter
      )
    }))
  }

  const removeFilter = (index: number) => {
    setBuilderState(prev => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index)
    }))
  }

  const generateQueryFromBuilder = () => {
    if (!selectedDatasource) return ''

    if (selectedDatasource.category === 'ingested') {
      // Generate filter query for ingested data
      const filters = builderState.filters
        .filter(f => f.field && f.value)
        .map(f => `${f.field}${f.operator}${f.value}`)
      
      if (builderState.selectedMetric) {
        filters.unshift(`metricName=${builderState.selectedMetric}`)
      }
      
      return filters.join(' AND ')
    } else if (selectedDatasource.dataSourceType === 'prometheus') {
      return builderState.selectedMetric || 'up'
    } else if (selectedDatasource.dataSourceType === 'sqlserver') {
      const table = builderState.selectedMetric || 'Logs'
      return `SELECT TOP 100 * FROM ${table} WHERE timestamp >= DATEADD(hour, -1, GETDATE())`
    }
    
    return ''
  }

  const applyBuilderQuery = () => {
    const generatedQuery = generateQueryFromBuilder()
    onQueryChange(generatedQuery)
  }

  const formatTimeForInput = (isoString: string) => {
    return isoString.slice(0, 16)
  }

  const renderBuilderInterface = () => {
    if (!selectedDatasource) return null

    return (
      <div className="space-y-4">
        {/* Metric/Table Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {selectedDatasource.category === 'ingested' ? 'Metric' : 
             selectedDatasource.dataSourceType === 'sqlserver' ? 'Table' : 'Metric'}
          </label>
          <select
            value={builderState.selectedMetric}
            onChange={(e) => {
              setBuilderState(prev => ({ ...prev, selectedMetric: e.target.value }))
            }}
            className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white text-sm"
            disabled={loadingMetrics}
          >
            <option value="">
              {loadingMetrics ? 'Loading...' : 'Select a metric/table'}
            </option>
            {availableMetrics.map((metric) => (
              <option key={metric.name} value={metric.name}>
                {metric.name} ({metric.type}) {metric.description && `- ${metric.description}`}
              </option>
            ))}
          </select>
        </div>

        {/* Filters for ingested data */}
        {selectedDatasource.category === 'ingested' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Filters
              </label>
              <button
                onClick={addFilter}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200"
              >
                + Add Filter
              </button>
            </div>
            
            {builderState.filters.map((filter, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <select
                  value={filter.field}
                  onChange={(e) => updateFilter(index, e.target.value, filter.operator, filter.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white text-sm"
                >
                  <option value="">Field</option>
                  <option value="source">Source</option>
                  <option value="environment">Environment</option>
                  <option value="metricName">Metric Name</option>
                </select>
                
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(index, filter.field, e.target.value, filter.value)}
                  className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white text-sm"
                >
                  <option value="=">=</option>
                  <option value="!=">!=</option>
                  <option value="LIKE">LIKE</option>
                </select>
                
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilter(index, filter.field, filter.operator, e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white text-sm"
                />
                
                <button
                  onClick={() => removeFilter(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Apply button for builder */}
        <div className="flex justify-end">
          <button
            onClick={applyBuilderQuery}
            className="inline-flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
          >
            Apply to Query
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      {/* Header with datasource selector and controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* Data Source Selector */}
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <select
              value={selectedDatasourceId}
              onChange={(e) => onDatasourceChange(e.target.value)}
              className="block w-64 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white text-sm"
            >
              <optgroup label="Configured Data Sources">
                {datasources.filter(ds => ds.category === 'datasource').map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.dataSourceType})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Ingested Data">
                {datasources.filter(ds => ds.category === 'ingested').map((ds) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Time Range Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
              className="inline-flex items-center px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
            >
              <Clock className="h-4 w-4 mr-2" />
              Time Range
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            {showTimeRangeDropdown && (
              <div className="absolute right-0 mt-1 w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-10">
                <div className="p-4 space-y-4">
                  {/* Manual Time Range */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Custom Time Range
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="datetime-local"
                          value={formatTimeForInput(timeRange.startTime)}
                          onChange={(e) => onTimeRangeChange({ 
                            ...timeRange, 
                            startTime: new Date(e.target.value).toISOString() 
                          })}
                          className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white text-sm"
                        />
                      </div>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="datetime-local"
                          value={formatTimeForInput(timeRange.endTime)}
                          onChange={(e) => onTimeRangeChange({ 
                            ...timeRange, 
                            endTime: new Date(e.target.value).toISOString() 
                          })}
                          className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Ranges */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Quick Ranges
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Last 1h', hours: 1 },
                        { label: 'Last 4h', hours: 4 },
                        { label: 'Last 24h', hours: 24 },
                        { label: 'Last 7d', hours: 168 }
                      ].map((range) => (
                        <button
                          key={range.hours}
                          onClick={() => {
                            onQuickTimeRange(range.hours)
                            setShowTimeRangeDropdown(false)
                          }}
                          className="inline-flex items-center justify-center px-3 py-2 border border-slate-300 dark:border-slate-600 text-xs font-medium rounded-md text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {range.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Execute Button */}
          <button
            onClick={onExecute}
            disabled={isRunning}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className={`h-4 w-4 mr-2 ${isRunning ? 'animate-pulse' : ''}`} />
            {isRunning ? 'Running...' : 'Run Query'}
          </button>
        </div>
      </div>

      {/* Query Mode Toggle and Query Interface */}
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-medium text-slate-900 dark:text-white">Query</h2>
            {selectedDatasource && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-md">
                <DataSourceIcon dataSourceType={selectedDatasource.dataSourceType} className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {selectedDatasource.name}
                  {selectedDatasource.category === 'ingested' && (
                    <span className="ml-1 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1 rounded">
                      Ingested
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Builder/Code Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => onQueryModeChange('builder')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                queryMode === 'builder'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Settings className="h-4 w-4 mr-1" />
              Builder
            </button>
            <button
              onClick={() => onQueryModeChange('code')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                queryMode === 'code'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Code className="h-4 w-4 mr-1" />
              Code
            </button>
          </div>
        </div>

        {/* Query Interface based on mode */}
        {queryMode === 'builder' ? renderBuilderInterface() : (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={selectedDatasource ? getQueryHelp(selectedDatasource.dataSourceType) : 'Select a datasource to start querying'}
                className="block w-full h-32 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white font-mono text-sm resize-none"
                disabled={!selectedDatasource}
              />
              
              {/* Query Suggestions Button */}
              {selectedDatasource && (
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  title="Show query examples"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Query Suggestions */}
            {showSuggestions && selectedDatasource && (
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-4">
                <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">
                  Example queries for {selectedDatasource.dataSourceType}
                  {selectedDatasource.category === 'ingested' && ' (ingested data)'}:
                </h4>
                <div className="space-y-2">
                  {getQuerySuggestions(selectedDatasource.dataSourceType).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => insertSuggestion(suggestion)}
                      className="block w-full text-left px-3 py-2 text-sm font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                
                {selectedDatasource.dataSourceType === 'ingested' && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> For ingested data, the time range is controlled above. 
                      Leave query empty to get all metrics, or use filters like metricName, source, or environment.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Help Text */}
            <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4" />
              <span>Press Ctrl+Enter (Cmd+Enter on Mac) to execute query</span>
            </div>
          </div>
        )}
      </div>

      {/* Click outside handler for time range dropdown */}
      {showTimeRangeDropdown && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowTimeRangeDropdown(false)}
        />
      )}
    </div>
  )
}

export default QueryBuilder 