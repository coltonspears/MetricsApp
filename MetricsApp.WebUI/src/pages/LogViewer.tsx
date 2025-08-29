import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { TelemetryApi } from '../lib/telemetry-api';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
  attributes: Record<string, any>;
  resource?: Record<string, any>;
  traceId?: string;
  spanId?: string;
}

interface LogViewerProps {
  className?: string;
}

const LogViewer: React.FC<LogViewerProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [timeRange, setTimeRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    end: new Date().toISOString().slice(0, 16)
  });
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await TelemetryApi.queryLogs({
        startTime: new Date(timeRange.start),
        endTime: new Date(timeRange.end),
        level: levelFilter || undefined,
        searchText: searchText || undefined,
        limit: 1000 // Get more logs for client-side pagination
      });
      
      // Convert the result to our LogEntry format
      const formattedLogs: LogEntry[] = result.map(log => ({
        ...log,
        timestamp: typeof log.timestamp === 'number' 
          ? new Date(log.timestamp).toISOString() 
          : log.timestamp,
        source: (log as any).source || ''
      }));
      
      setLogs(formattedLogs);
      setCurrentPage(1); // Reset to first page on new search
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs based on search text
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        return (
          log.message.toLowerCase().includes(searchLower) ||
          log.level.toLowerCase().includes(searchLower) ||
          (log.source && log.source.toLowerCase().includes(searchLower)) ||
          Object.values(log.attributes).some(value => 
            String(value).toLowerCase().includes(searchLower)
          )
        );
      }
      return true;
    });
  }, [logs, searchText]);

  // Paginate logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLogs.slice(startIndex, startIndex + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <XCircle className="h-4 w-4" style={{ color: 'var(--status-error)' }} />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" style={{ color: 'var(--status-warning)' }} />;
      case 'information':
      case 'info':
        return <Info className="h-4 w-4" style={{ color: 'var(--status-info)' }} />;
      case 'debug':
        return <CheckCircle className="h-4 w-4" style={{ color: 'var(--status-neutral)' }} />;
      default:
        return <Info className="h-4 w-4" style={{ color: 'var(--status-neutral)' }} />;
    }
  };

  const getLevelStyles = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return {
          backgroundColor: 'var(--alert-error-bg)',
          borderColor: 'var(--alert-error-border)',
          color: 'var(--alert-error-text)'
        };
      case 'warning':
        return {
          backgroundColor: 'var(--alert-warning-bg)',
          borderColor: 'var(--alert-warning-border)',
          color: 'var(--alert-warning-text)'
        };
      case 'information':
      case 'info':
        return {
          backgroundColor: 'var(--alert-info-bg)',
          borderColor: 'var(--alert-info-border)',
          color: 'var(--alert-info-text)'
        };
      case 'debug':
        return {
          backgroundColor: 'var(--alert-neutral-bg)',
          borderColor: 'var(--alert-neutral-border)',
          color: 'var(--alert-neutral-text)'
        };
      default:
        return {
          backgroundColor: 'var(--alert-neutral-bg)',
          borderColor: 'var(--alert-neutral-border)',
          color: 'var(--alert-neutral-text)'
        };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      // fractionalSecondDigits: 3 // Not supported in all browsers
    });
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportLogs = () => {
    const data = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-col h-full ${className}`} style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div className="p-6" style={{ 
        backgroundColor: 'var(--bg-surface)', 
        borderBottom: '1px solid var(--border-primary)'
      }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>Log Viewer</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportLogs}
              className="btn-themed-secondary flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="btn-themed-primary flex items-center disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border"
              style={{ 
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md)'
              }}
            />
          </div>

          {/* Level Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border appearance-none"
              style={{ 
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <option value="">All Levels</option>
              <option value="Error">Error</option>
              <option value="Warning">Warning</option>
              <option value="Information">Information</option>
              <option value="Debug">Debug</option>
            </select>
          </div>

          {/* Start Time */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="datetime-local"
              value={timeRange.start}
              onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border"
              style={{ 
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md)'
              }}
            />
          </div>

          {/* End Time */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="datetime-local"
              value={timeRange.end}
              onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border"
              style={{ 
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-md)'
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-4" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          <div className="flex items-center space-x-4">
            <span>{filteredLogs.length} logs found</span>
            {searchText && <span>• Filtered by: "{searchText}"</span>}
            {levelFilter && <span>• Level: {levelFilter}</span>}
          </div>
          <div className="flex items-center space-x-2">
            <span>Page size:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border rounded px-2 py-1"
              style={{ 
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-6 mt-4 p-4 border" style={{
          backgroundColor: 'var(--alert-error-bg)',
          borderColor: 'var(--alert-error-border)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div className="flex items-center">
            <XCircle className="h-5 w-5 mr-2" style={{ color: 'var(--status-error)' }} />
            <span className="font-medium" style={{ color: 'var(--alert-error-text)' }}>Error loading logs</span>
          </div>
          <p className="mt-1" style={{ color: 'var(--alert-error-text)' }}>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" style={{ color: 'var(--interactive-primary)' }} />
            <p style={{ color: 'var(--text-secondary)' }}>Loading logs...</p>
          </div>
        </div>
      )}

      {/* Logs List */}
      {!loading && !error && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto px-6">
            {paginatedLogs.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Search className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} />
                  <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>No logs found</p>
                  <p style={{ color: 'var(--text-tertiary)' }}>Try adjusting your filters or time range</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2 py-4">
                {paginatedLogs.map((log, index) => {
                  const globalIndex = (currentPage - 1) * pageSize + index;
                  const isExpanded = expandedLogs.has(globalIndex);
                  
                  const levelStyles = getLevelStyles(log.level);
                  
                  return (
                    <div
                      key={globalIndex}
                      className="border overflow-hidden transition-all duration-200"
                      style={{
                        ...levelStyles,
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      {/* Main log row */}
                      <div className="p-4">
                        <div className="flex items-start space-x-3">
                          {/* Level icon */}
                          <div className="flex-shrink-0 mt-1">
                            {getLevelIcon(log.level)}
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span 
                                    className="font-medium px-2 py-1"
                                    style={{
                                      fontSize: 'var(--text-sm)',
                                      borderRadius: 'var(--radius-full)',
                                      backgroundColor: 'rgba(255, 255, 255, 0.2)'
                                    }}
                                  >
                                    {log.level}
                                  </span>
                                  <div className="flex items-center" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatTimestamp(log.timestamp)}
                                  </div>
                                  {log.traceId && (
                                    <div className="flex items-center" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Trace: {log.traceId.slice(0, 8)}...
                                    </div>
                                  )}
                                </div>
                                <p className="font-medium mb-2" style={{ color: 'inherit' }}>
                                  {log.message}
                                </p>
                                {log.source && log.source.trim() && (
                                  <div className="flex items-center mb-2" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                                    <Tag className="h-3 w-3 mr-1" />
                                    Source: {log.source}
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center space-x-1 ml-4">
                                <button
                                  onClick={() => copyToClipboard(JSON.stringify(log, null, 2))}
                                  className="p-1 transition-colors"
                                  style={{ color: 'var(--text-tertiary)' }}
                                  title="Copy log"
                                >
                                  <Copy className="h-4 w-4" />
                                </button>
                                {Object.keys(log.attributes).length > 0 && (
                                  <button
                                    onClick={() => toggleExpanded(globalIndex)}
                                    className="p-1 transition-colors"
                                    style={{ color: 'var(--text-tertiary)' }}
                                    title={isExpanded ? "Collapse" : "Expand"}
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

                      {/* Expanded attributes */}
                      {isExpanded && Object.keys(log.attributes).length > 0 && (
                        <div 
                          className="p-4"
                          style={{ 
                            borderTop: '1px solid var(--border-primary)',
                            backgroundColor: 'rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          <h4 className="font-medium mb-2" style={{ fontSize: 'var(--text-sm)', color: 'inherit' }}>Attributes</h4>
                          <div className="space-y-2">
                            {Object.entries(log.attributes).map(([key, value]) => (
                              <div key={key} className="flex">
                                <span 
                                  className="min-w-32 flex-shrink-0"
                                  style={{ 
                                    fontFamily: 'var(--font-mono)', 
                                    fontSize: 'var(--text-xs)', 
                                    color: 'var(--text-secondary)' 
                                  }}
                                >
                                  {key}:
                                </span>
                                <span 
                                  className="ml-2 break-all"
                                  style={{ 
                                    fontFamily: 'var(--font-mono)', 
                                    fontSize: 'var(--text-xs)', 
                                    color: 'inherit' 
                                  }}
                                >
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4" style={{ 
              borderTop: '1px solid var(--border-primary)', 
              backgroundColor: 'var(--bg-surface)' 
            }}>
              <div className="flex items-center justify-between">
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredLogs.length)} of {filteredLogs.length} logs
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-themed-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      if (totalPages <= 5) {
                        return pageNum;
                      }
                      // Show pages around current page
                      const start = Math.max(1, currentPage - 2);
                      return start + i;
                    }).map(pageNum => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 transition-colors ${
                          pageNum === currentPage ? 'btn-themed-primary' : 'btn-themed-secondary'
                        }`}
                        style={{ fontSize: 'var(--text-sm)' }}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-themed-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LogViewer;
