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
  isSearchable?: boolean
  isAggregatable?: boolean
}

interface AvailableField {
  name: string
  type: string
  description?: string
  isSearchable: boolean
  isAggregatable: boolean
}

interface AvailableTag {
  name: string
  values: string[]
  description?: string
}

interface QueryBuilderProps {
  datasources: DataSource[]
  selectedDatasourceId: string
  query: string
  queryMode: 'builder' | 'code'
  availableMetrics: AvailableMetric[]
  loadingMetrics: boolean
  availableFields: AvailableField[]
  loadingFields: boolean
  availableTags: AvailableTag[]
  loadingTags: boolean
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
  availableFields,
  loadingFields,
  availableTags,
  loadingTags,
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
    setBuilderState((prev: { selectedMetric: string; filters: Array<{ field: string; operator: string; value: string }> }) => ({
      ...prev,
      filters: [...prev.filters, { field: '', operator: '=', value: '' }]
    }))
  }

  const updateFilter = (index: number, field: string, operator: string, value: string) => {
    setBuilderState((prev: { selectedMetric: string; filters: Array<{ field: string; operator: string; value: string }> }) => ({
      ...prev,
      filters: prev.filters.map((filter, i) => 
        i === index ? { field, operator, value } : filter
      )
    }))
  }

  const removeFilter = (index: number) => {
    setBuilderState((prev: { selectedMetric: string; filters: Array<{ field: string; operator: string; value: string }> }) => ({
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
              setBuilderState((prev: any) => ({ ...prev, selectedMetric: e.target.value }))
            }}
            className="block w-full px-3 py-2 border border-themed-border-tertiary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-tertiary focus:border-themed-interactive-tertiary bg-themed-bg-surface text-themed-text-primary text-sm"
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
              <label className="block text-sm font-medium text-themed-text-primary">
                Filters
              </label>
              <button
                onClick={addFilter}
                className="text-sm text-themed-text-primary hover:text-themed-text-primary"
              >
                + Add Filter
              </button>
            </div>
            
            {builderState.filters.map((filter, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <select
                  value={filter.field}
                  onChange={(e) => updateFilter(index, e.target.value, filter.operator, filter.value)}
                  className="flex-1 px-3 py-2 border border-themed-border-tertiary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-tertiary focus:border-themed-interactive-tertiary bg-themed-bg-surface text-themed-text-primary text-sm"
                >
                  <option value="">Field</option>
                  {loadingFields ? (
                    <option value="" disabled>Loading fields...</option>
                  ) : (
                    availableFields.filter(f => f.isSearchable).map(field => (
                      <option key={field.name} value={field.name}>{field.name}</option>
                    ))
                  )}
                </select>
                
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(index, filter.field, e.target.value, filter.value)}
                  className="w-20 px-3 py-2 border border-themed-border-tertiary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-tertiary focus:border-themed-interactive-tertiary bg-themed-bg-surface text-themed-text-primary text-sm"
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
                  className="flex-1 px-3 py-2 border border-themed-border-tertiary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-tertiary focus:border-themed-interactive-tertiary bg-themed-bg-surface text-themed-text-primary text-sm"
                />
                
                <button
                  onClick={() => removeFilter(index)}
                  className="text-themed-text-primary hover:text-themed-text-primary text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Tags for ingested data */}
        {selectedDatasource.category === 'ingested' && availableTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-themed-text-primary mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {loadingTags ? (
                <span className="text-sm text-themed-text-secondary">Loading tags...</span>
              ) : (
                availableTags.map(tag => (
                  <button
                    key={tag.name}
                                        onClick={() => onQueryChange(`${query} ${tag.name}=''`)}
                    className="px-3 py-1 border border-themed-border-tertiary rounded-full text-xs text-themed-text-primary bg-themed-bg-surface hover:bg-themed-bg-surface-hover"
                  >
                    {tag.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Apply button for builder */}
        <div className="flex justify-end">
          <button
            onClick={applyBuilderQuery}
              className="inline-flex items-center px-3 py-2 border border-themed-border-tertiary rounded-sm shadow-sm text-sm font-medium text-themed-text-primary bg-themed-bg-surface hover:bg-themed-bg-surface-hover dark:hover:bg-themed-bg-surface-hover"
          >
            Apply to Query
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-themed-bg-surface border-themed-border-primary  p-6">
      {/* Header with datasource selector and controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* Data Source Selector */}
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-themed-text-tertiary" />
            <select
              value={selectedDatasourceId}
              onChange={(e) => onDatasourceChange(e.target.value)}
              className="block w-64 px-3 py-2 border border-themed-border-tertiary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-tertiary focus:border-themed-interactive-tertiary bg-themed-bg-surface text-themed-text-primary sm:text-sm"
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
              className="inline-flex items-center px-3 py-2 border border-themed-border-tertiary rounded-sm shadow-sm text-sm font-medium text-themed-text-primary bg-themed-bg-surface hover:bg-themed-bg-surface-hover dark:hover:bg-themed-bg-surface-hover"
            >
              <Clock className="h-4 w-4 mr-2" />
              Time Range
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            {showTimeRangeDropdown && (
              <div className="absolute right-0 mt-1 w-96 bg-themed-bg-surface border border-themed-border-tertiary rounded-md shadow-lg z-10">
                <div className="p-4 space-y-4">
                  {/* Manual Time Range */}
                  <div>
                    <label className="block text-sm font-medium text-themed-text-primary mb-2">
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
                          className="block w-full pl-10 pr-3 py-2 border border-themed-border-tertiary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-tertiary focus:border-themed-interactive-tertiary bg-themed-bg-surface text-themed-text-primary sm:text-sm"
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
                          className="block w-full pl-10 pr-3 py-2 border border-themed-border-tertiary rounded-sm shadow-sm focus:outline-none focus:ring-themed-interactive-tertiary focus:border-themed-interactive-tertiary bg-themed-bg-surface text-themed-text-primary sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Ranges */}
                  <div>
                    <label className="block text-sm font-medium text-themed-text-primary mb-2">
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
                          className="inline-flex items-center justify-center px-3 py-2 border border-themed-border-tertiary text-xs font-medium rounded-sm text-themed-text-primary bg-themed-bg-surface hover:bg-themed-bg-surface-hover dark:hover:bg-themed-bg-surface-hover"
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
            className="inline-flex items-center px-4 py-2 border border-themed-border-tertiary text-sm font-medium text-themed-text-primary bg-themed-bg-surface hover:bg-themed-bg-surface-hover dark:hover:bg-themed-bg-surface-hover"
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
            <h2 className="text-lg font-medium text-themed-text-primary">Query</h2>
            {selectedDatasource && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-themed-bg-surface">
                <DataSourceIcon dataSourceType={selectedDatasource.dataSourceType} className="h-4 w-4 text-themed-text-primary" />
                <span className="text-sm text-themed-text-primary">
                  {selectedDatasource.name}
                  {selectedDatasource.category === 'ingested' && (
                    <span className="ml-1 text-xs bg-themed-bg-surface text-themed-text-primary px-1 rounded">
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
                  ? 'bg-themed-bg-surface text-themed-text-primary shadow-sm'
                  : 'text-themed-text-tertiary'
              }`}
            >
              <Settings className="h-4 w-4 mr-1" />
              Builder
            </button>
            <button
              onClick={() => onQueryModeChange('code')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                queryMode === 'code'
                  ? 'bg-themed-bg-surface text-themed-text-primary shadow-sm'
                  : 'text-themed-text-tertiary'
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
                className="block w-full h-32 px-3 py-2 border border-themed-border-tertiary rounded-sm shadow-sm placeholder-themed-text-tertiary focus:outline-none focus:ring-themed-interactive-tertiary focus:border-themed-interactive-tertiary bg-themed-bg-surface text-themed-text-primary font-mono text-sm resize-none"
                disabled={!selectedDatasource}
              />
              
              {/* Query Suggestions Button */}
              {selectedDatasource && (
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="absolute top-2 right-2 p-1 text-themed-text-tertiary hover:text-themed-text-primary"
                  title="Show query examples"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Query Suggestions */}
            {showSuggestions && selectedDatasource && (
              <div className="bg-themed-bg-surface border border-themed-border-tertiary rounded-md p-4">
                <h4 className="text-sm font-medium text-themed-text-primary mb-3">
                  Example queries for {selectedDatasource.dataSourceType}
                  {selectedDatasource.category === 'ingested' && ' (ingested data)'}:
                </h4>
                <div className="space-y-2">
                  {getQuerySuggestions(selectedDatasource.dataSourceType).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => insertSuggestion(suggestion)}
                      className="block w-full text-left px-3 py-2 text-sm font-mono text-themed-text-primary bg-themed-bg-surface border border-themed-border-tertiary rounded hover:bg-themed-bg-surface-hover dark:hover:bg-themed-bg-surface-hover"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                
                {selectedDatasource.dataSourceType === 'ingested' && (
                  <div className="mt-3 p-3 bg-themed-bg-surface">
                    <p className="text-xs text-themed-text-primary">
                      <strong>Note:</strong> For ingested data, the time range is controlled above. 
                      Leave query empty to get all metrics, or use filters like metricName, source, or environment.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Help Text */}
            <div className="flex items-center space-x-2 text-sm text-themed-text-tertiary">
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