import { useState } from 'react'
import { Download, X, FileText, Database, Code } from 'lucide-react'

interface ExportModalProps {
  data: any[]
  filename: string
  onClose: () => void
}

type ExportFormat = 'csv' | 'json' | 'xlsx' | 'sql'

const ExportModal = ({ data, filename, onClose }: ExportModalProps) => {
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [includeHeaders, setIncludeHeaders] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const exportFormats = [
    { value: 'csv', label: 'CSV', icon: FileText, description: 'Comma-separated values' },
    { value: 'json', label: 'JSON', icon: Code, description: 'JavaScript Object Notation' },
    { value: 'xlsx', label: 'Excel', icon: Database, description: 'Microsoft Excel format' },
    { value: 'sql', label: 'SQL', icon: Database, description: 'SQL INSERT statements' }
  ]

  const generateCSV = (): string => {
    if (data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvRows: string[] = []

    if (includeHeaders) {
      csvRows.push(headers.map(header => `"${header}"`).join(','))
    }

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return '""'
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        return `"${String(value).replace(/"/g, '""')}"`
      })
      csvRows.push(values.join(','))
    })

    return csvRows.join('\n')
  }

  const generateJSON = (): string => {
    return JSON.stringify(data, null, 2)
  }

  const generateSQL = (): string => {
    if (data.length === 0) return ''

    const tableName = filename.replace(/[^a-zA-Z0-9]/g, '_')
    const headers = Object.keys(data[0])
    const sqlStatements: string[] = []

    // Add CREATE TABLE statement
    const columnDefinitions = headers.map(header => {
      // Infer SQL type from data
      const sampleValue = data.find(row => row[header] !== null && row[header] !== undefined)?.[header]
      let sqlType = 'NVARCHAR(MAX)'
      
      if (typeof sampleValue === 'number') {
        sqlType = Number.isInteger(sampleValue) ? 'INT' : 'DECIMAL(18,2)'
      } else if (typeof sampleValue === 'boolean') {
        sqlType = 'BIT'
      } else if (typeof sampleValue === 'string' && sampleValue.includes('T') && sampleValue.includes('Z')) {
        sqlType = 'DATETIME2'
      }
      
      return `  [${header}] ${sqlType}`
    }).join(',\n')

    sqlStatements.push(`-- Create table for ${tableName}`)
    sqlStatements.push(`CREATE TABLE [${tableName}] (`)
    sqlStatements.push(columnDefinitions)
    sqlStatements.push(');')
    sqlStatements.push('')

    // Add INSERT statements
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return 'NULL'
        if (typeof value === 'number') return String(value)
        if (typeof value === 'boolean') return value ? '1' : '0'
        if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`
        return `'${String(value).replace(/'/g, "''")}'`
      })
      
      sqlStatements.push(`INSERT INTO [${tableName}] ([${headers.join('], [')}]) VALUES (${values.join(', ')});`)
    })

    return sqlStatements.join('\n')
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      let content: string
      let fileExtension: string
      let mimeType: string
      
      switch (format) {
        case 'csv':
          content = generateCSV()
          fileExtension = 'csv'
          mimeType = 'text/csv'
          break
        case 'json':
          content = generateJSON()
          fileExtension = 'json'
          mimeType = 'application/json'
          break
        case 'sql':
          content = generateSQL()
          fileExtension = 'sql'
          mimeType = 'text/sql'
          break
        case 'xlsx':
          // For XLSX, we would need a library like xlsx or exceljs
          // For now, fall back to CSV
          content = generateCSV()
          fileExtension = 'csv'
          mimeType = 'text/csv'
          break
        default:
          throw new Error('Unsupported format')
      }
      
      const fullFilename = `${filename}.${fileExtension}`
      downloadFile(content, fullFilename, mimeType)
      
      // Close modal after successful export
      setTimeout(() => {
        onClose()
      }, 500)
      
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">
            Export Data
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Export Format Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Export Format
            </label>
            <div className="space-y-2">
              {exportFormats.map((fmt) => {
                const Icon = fmt.icon
                return (
                  <label
                    key={fmt.value}
                    className="flex items-center p-3 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <input
                      type="radio"
                      value={fmt.value}
                      checked={format === fmt.value}
                      onChange={(e) => setFormat(e.target.value as ExportFormat)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600"
                    />
                    <Icon className="h-5 w-5 ml-3 text-slate-400" />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {fmt.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {fmt.description}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Options */}
          {(format === 'csv' || format === 'xlsx') && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeHeaders}
                  onChange={(e) => setIncludeHeaders(e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 rounded"
                />
                <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">
                  Include headers
                </span>
              </label>
            </div>
          )}

          {/* File Info */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              <div>Records: {data.length.toLocaleString()}</div>
              <div>Filename: {filename}.{format}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || data.length === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-pulse' : ''}`} />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal 