import { useState } from 'react'
import { Play, Database, Clock, HelpCircle } from 'lucide-react'
import { DataSourceConfiguration } from '../lib/datasource-api'

interface QueryBuilderProps {
  datasources: DataSourceConfiguration[]
  selectedDatasourceId: string
  query: string
  onDatasourceChange: (datasourceId: string) => void
  onQueryChange: (query: string) => void
  onExecute: () => void
  isRunning: boolean
}

const QueryBuilder = ({
  datasources,
  selectedDatasourceId,
  query,
  onDatasourceChange,
  onQueryChange,
  onExecute,
  isRunning
}: QueryBuilderProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false)

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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-slate-900 dark:text-white">Query</h2>
        <div className="flex items-center space-x-3">
          {/* Datasource Selector */}
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <select
              value={selectedDatasourceId}
              onChange={(e) => onDatasourceChange(e.target.value)}
              className="block w-48 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 dark:bg-slate-700 dark:text-white text-sm"
            >
              {datasources.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.dataSourceType})
                </option>
              ))}
            </select>
          </div>

          {/* Execute Button */}
          <button
            onClick={onExecute}
            disabled={isRunning || !query.trim()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className={`h-4 w-4 mr-2 ${isRunning ? 'animate-pulse' : ''}`} />
            {isRunning ? 'Running...' : 'Run Query'}
          </button>
        </div>
      </div>

      {/* Query Input */}
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
              Example queries for {selectedDatasource.dataSourceType}:
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
          </div>
        )}

        {/* Help Text */}
        <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
          <Clock className="h-4 w-4" />
          <span>Press Ctrl+Enter (Cmd+Enter on Mac) to execute query</span>
        </div>
      </div>
    </div>
  )
}

export default QueryBuilder 