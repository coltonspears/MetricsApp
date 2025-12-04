import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  AlertTriangle,
  Info,
  XCircle,
  CheckCircle,
  Clock,
  Tag,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText
} from 'lucide-react'
import { TelemetryApi } from '../lib/telemetry-api'
import PageHeader from '../components/PageHeader'

interface LogEntry {
  timestamp: string
  level: string
  message: string
  source?: string
  attributes: Record<string, any>
  resource?: Record<string, any>
  traceId?: string
  spanId?: string
}

interface LogViewerProps {
  className?: string
}

const LogViewer: React.FC<LogViewerProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [searchText, setSearchText] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [timeRange, setTimeRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    end: new Date().toISOString().slice(0, 16)
  })
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set())

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await TelemetryApi.queryLogs({
        startTime: new Date(timeRange.start),
        endTime: new Date(timeRange.end),
        level: levelFilter || undefined,
        searchText: searchText || undefined,
        limit: 1000
      })

      const formattedLogs: LogEntry[] = result.map(log => ({
        ...log,
        timestamp: typeof log.timestamp === 'number'
          ? new Date(log.timestamp).toISOString()
          : log.timestamp,
        source: (log as any).source || ''
      }))

      setLogs(formattedLogs)
      setCurrentPage(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchText) {
        const searchLower = searchText.toLowerCase()
        return (
          log.message.toLowerCase().includes(searchLower) ||
          log.level.toLowerCase().includes(searchLower) ||
          (log.source && log.source.toLowerCase().includes(searchLower)) ||
          Object.values(log.attributes).some(value =>
            String(value).toLowerCase().includes(searchLower)
          )
        )
      }
      return true
    })
  }, [logs, searchText])

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredLogs.slice(startIndex, startIndex + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  const totalPages = Math.ceil(filteredLogs.length / pageSize)

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <XCircle className="h-4 w-4 text-themed-status-error" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-themed-status-warning" />
      case 'information':
      case 'info':
        return <Info className="h-4 w-4 text-themed-status-info" />
      case 'debug':
        return <CheckCircle className="h-4 w-4 text-themed-status-neutral" />
      default:
        return <Info className="h-4 w-4 text-themed-status-neutral" />
    }
  }

  const getLevelClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'bg-themed-alert-error border-themed-alert-error'
      case 'warning':
        return 'bg-themed-alert-warning border-themed-alert-warning'
      case 'information':
      case 'info':
        return 'bg-themed-alert-info border-themed-alert-info'
      case 'debug':
        return 'bg-themed-alert-neutral border-themed-alert-neutral'
      default:
        return 'bg-themed-alert-neutral border-themed-alert-neutral'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedLogs(newExpanded)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const exportLogs = () => {
    const data = JSON.stringify(filteredLogs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString().slice(0, 19)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatTimeRange = () => {
    const start = new Date(timeRange.start)
    const end = new Date(timeRange.end)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.round(diffMs / (1000 * 60 * 60))
    if (diffHours < 24) return `${diffHours}h`
    return `${Math.round(diffHours / 24)}d`
  }

  return (
    <div className={`page-shell ${className}`}>
      <PageHeader
        title="Log Viewer"
        description="View and analyze application logs with advanced filtering"
        meta={
          <span className="badge-muted">
            <FileText className="h-3 w-3" />
            Telemetry Logs
          </span>
        }
        actions={
          <div className="page-actions">
            <button onClick={exportLogs} className="btn-themed-secondary">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="btn-themed-primary disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
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
            {filteredLogs.length} logs
          </span>
          {levelFilter && (
            <span className="badge-muted">
              Level: {levelFilter}
            </span>
          )}
        </div>
      </PageHeader>

      <div className="page-toolbar flex-wrap">
        <div className="page-toolbar__group flex-1 min-w-48">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="input-themed w-full pl-10"
            />
          </div>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="input-themed pl-10 w-40"
            >
              <option value="">All Levels</option>
              <option value="Error">Error</option>
              <option value="Warning">Warning</option>
              <option value="Information">Information</option>
              <option value="Debug">Debug</option>
            </select>
          </div>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
            <input
              type="datetime-local"
              value={timeRange.start}
              onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value }))}
              className="input-themed pl-10"
            />
          </div>
          <span className="text-themed-text-muted">to</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-themed-text-muted" />
            <input
              type="datetime-local"
              value={timeRange.end}
              onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value }))}
              className="input-themed pl-10"
            />
          </div>
        </div>
        <div className="page-toolbar__divider" />
        <div className="page-toolbar__group">
          <span className="text-sm text-themed-text-muted">Page size:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="input-themed w-20"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="panel border-themed-alert-error">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-themed-status-error flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="panel-title text-themed-status-error">Error loading logs</h3>
              <p className="text-sm text-themed-text-secondary mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="panel flex items-center justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-themed-interactive-primary" />
          <span className="ml-3 text-themed-text-secondary">Loading logs...</span>
        </div>
      ) : (
        <div className="panel flex-1 flex flex-col overflow-hidden">
          <div className="panel-header">
            <h3 className="panel-title">Log Entries</h3>
            <span className="badge-muted">{filteredLogs.length} total</span>
          </div>

          {paginatedLogs.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-themed-text-muted" />
                <p className="text-lg text-themed-text-secondary">No logs found</p>
                <p className="text-themed-text-muted">Try adjusting your filters or time range</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2">
              {paginatedLogs.map((log, index) => {
                const globalIndex = (currentPage - 1) * pageSize + index
                const isExpanded = expandedLogs.has(globalIndex)

                return (
                  <div
                    key={globalIndex}
                    className={`rounded-lg border overflow-hidden ${getLevelClass(log.level)}`}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getLevelIcon(log.level)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="badge-muted font-medium">{log.level}</span>
                                <div className="flex items-center text-xs text-themed-text-muted">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTimestamp(log.timestamp)}
                                </div>
                                {log.traceId && (
                                  <div className="flex items-center text-xs text-themed-text-muted">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Trace: {log.traceId.slice(0, 8)}...
                                  </div>
                                )}
                              </div>
                              <p className="font-medium text-themed-text-primary mb-2">
                                {log.message}
                              </p>
                              {log.source && log.source.trim() && (
                                <div className="flex items-center text-sm text-themed-text-secondary">
                                  <Tag className="h-3 w-3 mr-1" />
                                  Source: {log.source}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 ml-4">
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}
                                className="p-1 text-themed-text-muted hover:text-themed-text-primary transition-colors"
                                title="Copy log"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              {Object.keys(log.attributes).length > 0 && (
                                <button
                                  onClick={() => toggleExpanded(globalIndex)}
                                  className="p-1 text-themed-text-muted hover:text-themed-text-primary transition-colors"
                                  title={isExpanded ? 'Collapse' : 'Expand'}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && Object.keys(log.attributes).length > 0 && (
                      <div className="p-4 border-t border-themed-border-primary bg-black bg-opacity-5">
                        <h4 className="font-medium mb-2 text-sm">Attributes</h4>
                        <div className="space-y-2">
                          {Object.entries(log.attributes).map(([key, value]) => (
                            <div key={key} className="flex">
                              <span className="min-w-32 flex-shrink-0 font-mono text-xs text-themed-text-secondary">
                                {key}:
                              </span>
                              <span className="ml-2 break-all font-mono text-xs text-themed-text-primary">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="panel-footer flex items-center justify-between">
              <div className="text-sm text-themed-text-secondary">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} logs
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn-themed-secondary disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    if (totalPages <= 5) return pageNum
                    const start = Math.max(1, currentPage - 2)
                    return start + i
                  }).map(pageNum => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={pageNum === currentPage ? 'btn-themed-primary' : 'btn-themed-secondary'}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-themed-secondary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default LogViewer
