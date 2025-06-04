import { useMemo } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format } from 'date-fns'

interface DataVisualizationProps {
  data: any[]
  datasourceType: string
  viewMode: 'chart' | 'table'
}

const DataVisualization = ({ data, datasourceType, viewMode }: DataVisualizationProps) => {
  const { chartData, chartType, tableColumns } = useMemo(() => {
    if (!data || data.length === 0) {
      return { chartData: [], chartType: 'line', tableColumns: [] }
    }

    // Determine chart type and transform data based on datasource type and data structure
    let transformedData: any[] = []
    let detectedChartType: 'line' | 'bar' | 'pie' = 'line'
    let columns: string[] = []

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
      }
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
      }
      
      columns = Object.keys(firstItem)
    }

    return {
      chartData: transformedData,
      chartType: detectedChartType,
      tableColumns: columns
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
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
              />
            </LineChart>
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
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
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
        return <div>Unsupported chart type</div>
    }
  }

  const renderTable = () => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
          No data to display
        </div>
      )
    }

    // Use original data for table display
    const displayData = data.slice(0, 100) // Limit to 100 rows for performance
    const columns = tableColumns.length > 0 ? tableColumns : Object.keys(displayData[0] || {})

    return (
      <div className="overflow-auto max-h-96 border border-slate-200 dark:border-slate-700 rounded-lg">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
            {displayData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                {columns.map((column) => (
                  <td
                    key={column}
                    className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100"
                  >
                    {formatCellValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 100 && (
          <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
            Showing 100 of {data.length} rows
          </div>
        )}
      </div>
    )
  }

  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
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
    return renderTable()
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      {renderChart()}
    </div>
  )
}

export default DataVisualization 