import { useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { format } from 'date-fns'

interface DataVisualizationProps {
  data: any[]
  datasourceType: string
  viewMode: 'chart' | 'table'
}

interface SeriesConfig {
  key: string
  name: string
  color: string
}

const DataVisualization = ({ data, datasourceType, viewMode }: DataVisualizationProps) => {
  const { chartData, chartType, seriesConfig } = useMemo((): {
    chartData: any[]
    chartType: 'line' | 'bar' | 'pie' | 'area'
    tableColumns: string[]
    seriesConfig: SeriesConfig[]
  } => {
    if (!data || data.length === 0) {
      return { chartData: [], chartType: 'line', tableColumns: [], seriesConfig: [] }
    }

    // Determine chart type and transform data based on datasource type and data structure
    let transformedData: any[] = []
    let detectedChartType: 'line' | 'bar' | 'pie' | 'area' = 'line'
    let columns: string[] = []
    let series: SeriesConfig[] = []

    if (datasourceType === 'prometheus' || (Array.isArray(data) && data.length > 0 && data[0].values)) {
      // Handle Prometheus metric time-series data
      detectedChartType = 'line'
      
      if (data.length > 0 && data[0].values) {
        // Extract time-series values
        const values = data[0].values || []
        transformedData = values.map((value: any) => {
          const timestamp = value.item1 ? new Date(value.item1 * 1000) : new Date()
          const val = parseFloat(value.item2) || 0
          return {
            timestamp: timestamp.toISOString(),
            time: format(timestamp, 'HH:mm:ss'),
            value: val,
            formattedValue: val.toFixed(2)
          }
        })
        columns = ['time', 'value', 'timestamp']
        series = [{ key: 'value', name: 'Value', color: '#10b981' }]
      }
    } else if (datasourceType === 'ingested' || data.some(item => item.metricName && item.timestamp)) {
      // Handle ingested metric data - group by metric name and create time series
      detectedChartType = 'line'
      
      // Group data by metric name
      const metricGroups = new Map<string, any[]>()
      data.forEach(item => {
        const metricName = item.metricName || 'unknown'
        if (!metricGroups.has(metricName)) {
          metricGroups.set(metricName, [])
        }
        metricGroups.get(metricName)!.push(item)
      })
      
      // Create time-based data points
      const timeMap = new Map<string, any>()
      
      metricGroups.forEach((items, metricName) => {
        items.forEach(item => {
          const timestamp = new Date(item.timestamp)
          const timeKey = timestamp.toISOString()
          const formattedTime = format(timestamp, 'HH:mm:ss')
          
          if (!timeMap.has(timeKey)) {
            timeMap.set(timeKey, { 
              timestamp: timeKey,
              time: formattedTime,
              formattedTime
            })
          }
          
          const dataPoint = timeMap.get(timeKey)!
          dataPoint[metricName] = parseFloat(item.value) || 0
        })
      })
      
      transformedData = Array.from(timeMap.values())
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      // Create series configuration for multiple metrics
      const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316']
      series = Array.from(metricGroups.keys()).map((metricName, index) => ({
        key: metricName,
        name: metricName,
        color: colors[index % colors.length]
      }))
      
      columns = ['time', ...Array.from(metricGroups.keys()), 'timestamp']
    } else if (datasourceType === 'sqlserver' || data.some(item => item.timestamp || item.severityText || item.body)) {
      // Handle SQL Server log data
      detectedChartType = 'bar'
      
      // Group by time intervals for visualization
      const timeGroups = new Map<string, number>()
      
      data.forEach(item => {
        if (item.timestamp) {
          const timestamp = new Date(item.timestamp)
          const timeKey = format(timestamp, 'HH:mm')
          timeGroups.set(timeKey, (timeGroups.get(timeKey) || 0) + 1)
        }
      })
      
      transformedData = Array.from(timeGroups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, count]) => ({ time, count, value: count }))
      
      columns = Object.keys(data[0] || {})
      series = [{ key: 'count', name: 'Log Count', color: '#10b981' }]
    } else {
      // Generic data handling
      detectedChartType = 'bar'
      
      // Try to detect time-based data
      const firstItem = data[0]
      const timeField = Object.keys(firstItem).find(key => 
        key.toLowerCase().includes('time') || 
        key.toLowerCase().includes('date') ||
        key.toLowerCase().includes('timestamp')
      )
      
      const valueField = Object.keys(firstItem).find(key => 
        typeof firstItem[key] === 'number' && 
        !key.toLowerCase().includes('time') &&
        !key.toLowerCase().includes('date')
      )
      
      if (timeField && valueField) {
        // Time-series data
        detectedChartType = 'line'
        transformedData = data.map(item => ({
          time: format(new Date(item[timeField]), 'HH:mm:ss'),
          value: parseFloat(item[valueField]) || 0,
          ...item
        }))
        series = [{ key: 'value', name: valueField, color: '#10b981' }]
      } else {
        // Aggregate categorical data
        const aggregationField = Object.keys(firstItem)[0]
        const countMap = new Map<string, number>()
        
        data.forEach(item => {
          const key = String(item[aggregationField] || 'Unknown')
          countMap.set(key, (countMap.get(key) || 0) + 1)
        })
        
        transformedData = Array.from(countMap.entries())
          .map(([name, value]) => ({ name, value, count: value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 20) // Limit to top 20 for readability
        
        series = [{ key: 'value', name: 'Count', color: '#10b981' }]
      }
      
      columns = Object.keys(firstItem)
    }

    return {
      chartData: transformedData,
      chartType: detectedChartType,
      tableColumns: columns,
      seriesConfig: series
    }
  }, [data, datasourceType])

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316']

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
          No data to display
        </div>
      )
    }

    const commonProps = {
      width: '100%',
      height: 400,
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 }
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis 
                dataKey="time" 
                className="text-slate-600 dark:text-slate-400"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-slate-600 dark:text-slate-400"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgb(30 41 59)', 
                  border: '1px solid rgb(71 85 105)',
                  borderRadius: '6px',
                  color: 'white'
                }}
                labelFormatter={(label) => `Time: ${label}`}
              />
              {seriesConfig.map((series) => (
                <Line 
                  key={series.key}
                  type="monotone" 
                  dataKey={series.key} 
                  stroke={series.color}
                  strokeWidth={2}
                  dot={{ fill: series.color, strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: series.color, strokeWidth: 2 }}
                  name={series.name}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )

      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis 
                dataKey="time" 
                className="text-slate-600 dark:text-slate-400"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-slate-600 dark:text-slate-400"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgb(30 41 59)', 
                  border: '1px solid rgb(71 85 105)',
                  borderRadius: '6px',
                  color: 'white'
                }}
              />
              {seriesConfig.map((series) => (
                <Area 
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  stackId="1"
                  stroke={series.color}
                  fill={series.color}
                  fillOpacity={0.3}
                  name={series.name}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis 
                dataKey="time" 
                className="text-slate-600 dark:text-slate-400"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-slate-600 dark:text-slate-400"
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgb(30 41 59)', 
                  border: '1px solid rgb(71 85 105)',
                  borderRadius: '6px',
                  color: 'white'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgb(30 41 59)', 
                  border: '1px solid rgb(71 85 105)',
                  borderRadius: '6px',
                  color: 'white'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  const renderTable = () => {
    if (data.length === 0) {
      return (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No data to display
        </div>
      )
    }

    // Use original data for table view to show all fields
    const tableData = data.slice(0, 1000) // Limit to 1000 rows for performance
    const columns = tableData.length > 0 ? Object.keys(tableData[0]) : []

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {tableData.map((row, index) => (
              <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                {columns.map((column) => (
                  <td
                    key={column}
                    className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100"
                  >
                    {formatCellValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {data.length > 1000 && (
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Showing first 1,000 of {data.length} rows. Use filters to narrow results.
            </p>
          </div>
        )}
      </div>
    )
  }

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) {
      return ''
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      // Likely an ISO date string
      try {
        return format(new Date(value), 'yyyy-MM-dd HH:mm:ss')
      } catch {
        return value
      }
    }
    
    return String(value)
  }

  if (viewMode === 'table') {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        {renderTable()}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">
          {chartType === 'line' ? 'Time Series' : chartType === 'bar' ? 'Distribution' : 'Chart'}
        </h3>
        {seriesConfig.length > 1 && (
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">Series:</span>
            {seriesConfig.map((series) => (
              <div key={series.key} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: series.color }}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">{series.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {renderChart()}
      {chartData.length > 0 && (
        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Showing {chartData.length} data points
          {seriesConfig.length > 1 && ` across ${seriesConfig.length} series`}
        </div>
      )}
    </div>
  )
}

export default DataVisualization 