import React, { useState, useEffect } from 'react';
import { Search, Activity, AlertCircle, ChevronDown, ChevronRight, Download } from 'lucide-react';

// OTLP Format Interfaces
interface OtlpTrace {
  resourceSpans: OtlpResourceSpan[];
}

interface OtlpResourceSpan {
  resource: OtlpResource;
  scopeSpans: OtlpScopeSpan[];
}

interface OtlpResource {
  attributes: OtlpAttribute[];
}

interface OtlpScopeSpan {
  scope: OtlpScope;
  spans: OtlpSpan[];
}

interface OtlpScope {
  name: string;
  version?: string;
}

interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind?: number;
  startTimeUnixNano: number;
  endTimeUnixNano: number;
  attributes: OtlpAttribute[];
  status?: OtlpStatus;
}

interface OtlpAttribute {
  key: string;
  value: OtlpValue;
}

interface OtlpValue {
  stringValue?: string;
  intValue?: number;
  doubleValue?: number;
  boolValue?: boolean;
}

interface OtlpStatus {
  code: number;
  message?: string;
}

// Normalized interfaces for display
interface NormalizedTrace {
  traceId: string;
  spans: NormalizedSpan[];
  services: Record<string, string>; // spanId -> serviceName
}

interface NormalizedSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  serviceName: string;
  startTime: number; // microseconds
  duration: number; // microseconds
  attributes: Record<string, any>;
  status: {
    code: number;
    message?: string;
  };
  isError: boolean;
}

interface TraceSearchFilters {
  service?: string;
  operation?: string;
  tags?: string;
  minDuration?: string;
  maxDuration?: string;
  start?: Date;
  end?: Date;
  limit: number;
}

const JaegerTraceViewer: React.FC = () => {
  const [traces, setTraces] = useState<NormalizedTrace[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<NormalizedTrace | null>(null);
  const [services, setServices] = useState<string[]>([]);
  const [operations, setOperations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [servicesLoaded, setServicesLoaded] = useState(false);
  
  const [filters, setFilters] = useState<TraceSearchFilters>({
    limit: 20,
    start: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    end: new Date()
  });

  // Load services on component mount (only once)
  useEffect(() => {
    if (!servicesLoaded) {
      loadServices();
    }
  }, [servicesLoaded]);
  
  // Retry loading services periodically if none are found (with debounce)
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (servicesLoaded && services.length === 0) {
      interval = setInterval(() => {
        loadServices();
      }, 10000); // Retry every 10 seconds (less aggressive)
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [servicesLoaded, services.length]);

  // Load operations when service changes
  useEffect(() => {
    if (filters.service) {
      loadOperations(filters.service);
    } else {
      setOperations([]); // Clear operations when no service selected
    }
  }, [filters.service]);

  // Convert OTLP trace format to normalized format
  const normalizeOtlpTrace = (otlpTrace: OtlpTrace): NormalizedTrace[] => {
    const normalizedTraces: NormalizedTrace[] = [];
    
    for (const resourceSpan of otlpTrace.resourceSpans) {
      const resource = resourceSpan.resource;
      const serviceName = resource.attributes.find(attr => attr.key === 'service.name')?.value.stringValue || 'unknown-service';
      
      for (const scopeSpan of resourceSpan.scopeSpans) {
        // Group spans by traceId
        const spansByTrace = new Map<string, NormalizedSpan[]>();
        
        for (const span of scopeSpan.spans) {
          const normalizedSpan: NormalizedSpan = {
            traceId: span.traceId,
            spanId: span.spanId,
            parentSpanId: span.parentSpanId,
            name: span.name,
            serviceName: serviceName,
            startTime: Math.floor(span.startTimeUnixNano / 1000), // Convert to microseconds
            duration: Math.floor((span.endTimeUnixNano - span.startTimeUnixNano) / 1000), // Convert to microseconds
            attributes: span.attributes.reduce((acc, attr) => {
              acc[attr.key] = attr.value.stringValue || attr.value.intValue || attr.value.doubleValue || attr.value.boolValue;
              return acc;
            }, {} as Record<string, any>),
            status: span.status || { code: 0 },
            isError: span.status?.code === 2 || span.attributes.some(attr => attr.key === 'error' && attr.value.boolValue === true)
          };
          
          if (!spansByTrace.has(span.traceId)) {
            spansByTrace.set(span.traceId, []);
          }
          spansByTrace.get(span.traceId)!.push(normalizedSpan);
        }
        
        // Create normalized traces
        for (const [traceId, spans] of spansByTrace) {
          const services: Record<string, string> = {};
          spans.forEach(span => {
            services[span.spanId] = span.serviceName;
          });
          
          normalizedTraces.push({
            traceId,
            spans,
            services
          });
        }
      }
    }
    
    return normalizedTraces;
  };

  const loadServices = async () => {
    try {
      const response = await fetch('/api/v1/integrations/jaeger/services');
      if (response.ok) {
        const result = await response.json();
        const servicesList = result.data?.data || [];
        setServices(servicesList);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setServicesLoaded(true);
    }
  };

  const loadOperations = async (serviceName: string) => {
    try {
      const response = await fetch(`/api/v1/integrations/jaeger/services/${encodeURIComponent(serviceName)}/operations`);
      if (response.ok) {
        const result = await response.json();
        // Jaeger returns operations as strings directly in the data array
        const operationsData = result.data?.data || [];
        // Handle both string array and object array formats
        const operationsList = operationsData.map((op: any) => 
          typeof op === 'string' ? op : (op.operationName || op.name || String(op))
        ).filter((op: string) => op && op.trim() !== '');
        setOperations(operationsList);
      }
    } catch (err) {
      console.error('Failed to load operations:', err);
      setOperations([]);
    }
  };

  const searchTraces = async () => {
    if (!filters.service) {
      setError('Please select a service to search for traces');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (filters.service) params.append('service', filters.service);
      if (filters.operation) params.append('operation', filters.operation);
      if (filters.tags) params.append('tags', filters.tags);
      if (filters.minDuration) params.append('minDuration', filters.minDuration);
      if (filters.maxDuration) params.append('maxDuration', filters.maxDuration);
      if (filters.start) params.append('start', filters.start.toISOString());
      if (filters.end) params.append('end', filters.end.toISOString());
      params.append('limit', filters.limit.toString());

      const response = await fetch(`/api/v1/integrations/jaeger/traces?${params}`);
      
      if (response.ok) {
        const result = await response.json();
        let traces: NormalizedTrace[] = [];
        
        if (result.data && result.data.data) {
          // Handle Jaeger format response
          traces = result.data.data.map((jaegerTrace: any) => {
            const normalizedSpans = (jaegerTrace.spans || []).map((span: any) => {
              // Find parent from references if parentSpanID is empty
              let parentSpanId = span.parentSpanID;
              if (!parentSpanId && span.references && span.references.length > 0) {
                const childOfRef = span.references.find((ref: any) => ref.refType === 'CHILD_OF');
                if (childOfRef) {
                  parentSpanId = childOfRef.spanID;
                }
              }
              
              const tags = span.tags || [];
              return {
                traceId: span.traceID,
                spanId: span.spanID,
                parentSpanId: parentSpanId || undefined,
                name: span.operationName,
                serviceName: jaegerTrace.processes?.[span.processID]?.serviceName || 'unknown',
                startTime: span.startTime || 0,
                duration: span.duration || 0,
                attributes: tags.reduce((acc: any, tag: any) => {
                  acc[tag.key] = tag.value;
                  return acc;
                }, {}),
                status: { code: 0 },
                isError: tags.some((tag: any) => tag.key === 'error' && tag.value === true)
              };
            });
            
            return {
              traceId: jaegerTrace.traceID,
              spans: normalizedSpans,
              services: Object.fromEntries(
                (jaegerTrace.spans || []).map((span: any) => [
                  span.spanID, 
                  jaegerTrace.processes?.[span.processID]?.serviceName || 'unknown'
                ])
              )
            };
          });
        } else if (result.resourceSpans) {
          // Handle OTLP format response  
          traces = normalizeOtlpTrace(result);
        }
        
        setTraces(traces);
      } else {
        setError('Failed to search traces');
      }
    } catch (err) {
      setError('Error searching traces');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateSampleTrace = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/integrations/jaeger/generate-sample-trace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Wait a moment for the trace to be processed, then search again
        setTimeout(() => {
          searchTraces();
        }, 2000);
      } else {
        setError('Failed to generate sample trace');
      }
    } catch (err) {
      setError('Error generating sample trace');
      console.error('Generate error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTraceDetails = async (traceId: string) => {
    try {
      const response = await fetch(`/api/v1/integrations/jaeger/traces/${encodeURIComponent(traceId)}`);
      if (response.ok) {
        const result = await response.json();
        let normalizedTrace: NormalizedTrace | null = null;
        
        if (result.data && result.data.data && result.data.data.length > 0) {
          // Handle Jaeger format response
          const jaegerTrace = result.data.data[0];
          const normalizedSpans = jaegerTrace.spans.map((span: any) => {
            // Find parent from references if parentSpanID is empty
            let parentSpanId = span.parentSpanID;
            if (!parentSpanId && span.references && span.references.length > 0) {
              const childOfRef = span.references.find((ref: any) => ref.refType === 'CHILD_OF');
              if (childOfRef) {
                parentSpanId = childOfRef.spanID;
              }
            }
            
            return {
              traceId: span.traceID,
              spanId: span.spanID,
              parentSpanId: parentSpanId || undefined,
              name: span.operationName,
              serviceName: jaegerTrace.processes[span.processID]?.serviceName || 'unknown',
              startTime: span.startTime,
              duration: span.duration,
              attributes: (span.tags || []).reduce((acc: any, tag: any) => {
                acc[tag.key] = tag.value;
                return acc;
              }, {}),
              status: { code: 0 },
              isError: (span.tags || []).some((tag: any) => tag.key === 'error' && tag.value === true)
            };
          });
          
          normalizedTrace = {
            traceId: jaegerTrace.traceID,
            spans: normalizedSpans,
            services: Object.fromEntries(
              jaegerTrace.spans.map((span: any) => [
                span.spanID, 
                jaegerTrace.processes[span.processID]?.serviceName || 'unknown'
              ])
            )
          };
        } else if (result.resourceSpans) {
          // Handle OTLP format response
          const normalizedTraces = normalizeOtlpTrace(result);
          if (normalizedTraces.length > 0) {
            normalizedTrace = normalizedTraces[0];
          }
        }
        
        if (normalizedTrace) {
          setSelectedTrace(normalizedTrace);
          // Auto-expand all spans that have children for better visibility
          const spansWithChildren = new Set<string>();
          normalizedTrace.spans.forEach(span => {
            if (span.parentSpanId) {
              spansWithChildren.add(span.parentSpanId);
            }
          });
          setExpandedSpans(spansWithChildren);
        }
      }
    } catch (err) {
      console.error('Failed to load trace details:', err);
    }
  };

  const formatDuration = (durationMicros: number): string => {
    const ms = durationMicros / 1000;
    if (ms < 1) return `${durationMicros}μs`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTime = (timeMicros: number): string => {
    return new Date(timeMicros / 1000).toLocaleTimeString();
  };

  const getSpanColor = (serviceName: string): string => {
    const colors = [
      '#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed',
      '#be185d', '#0891b2', '#65a30d', '#dc2626', '#ea580c'
    ];
    let hash = 0;
    for (let i = 0; i < serviceName.length; i++) {
      hash = serviceName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const buildSpanTree = (spans: NormalizedSpan[]): NormalizedSpan[] => {
    const spanMap = new Map(spans.map(span => [span.spanId, span]));
    const rootSpans: NormalizedSpan[] = [];
    
    spans.forEach(span => {
      if (!span.parentSpanId || !spanMap.has(span.parentSpanId)) {
        rootSpans.push(span);
      }
    });

    // Sort root spans by start time
    return rootSpans.sort((a, b) => a.startTime - b.startTime);
  };

  const getChildSpans = (parentId: string, spans: NormalizedSpan[]): NormalizedSpan[] => {
    return spans.filter(span => span.parentSpanId === parentId);
  };

  const toggleSpanExpansion = (spanId: string) => {
    setExpandedSpans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spanId)) {
        newSet.delete(spanId);
      } else {
        newSet.add(spanId);
      }
      return newSet;
    });
  };

  const SpanRow: React.FC<{ 
    span: NormalizedSpan; 
    allSpans: NormalizedSpan[]; 
    depth: number;
    traceStartTime: number;
    traceDuration: number;
  }> = ({ span, allSpans, depth, traceStartTime, traceDuration }) => {
    const childSpans = getChildSpans(span.spanId, allSpans);
    const hasChildren = childSpans.length > 0;
    const isExpanded = expandedSpans.has(span.spanId);
    const [showDetails, setShowDetails] = useState(false);
    const serviceName = span.serviceName;
    const spanColor = getSpanColor(serviceName);
    
    // Calculate span position and width relative to trace (handle edge cases)
    const safeDuration = traceDuration > 0 ? traceDuration : 1;
    const spanStart = Math.max(0, Math.min(100, ((span.startTime - traceStartTime) / safeDuration) * 100));
    const spanWidth = Math.max(0.5, Math.min(100 - spanStart, (span.duration / safeDuration) * 100));
    const selfTime = Math.max(0, span.duration - childSpans.reduce((acc, child) => acc + child.duration, 0));

    const isError = span.isError;
    
    // Get key attributes for display
    const httpMethod = span.attributes['http.request.method'];
    const httpStatus = span.attributes['http.response.status_code'];
    const httpRoute = span.attributes['http.route'] || span.attributes['url.path'];
    const spanKind = span.attributes['span.kind'];

    return (
      <>
        <div 
          className="border-b transition-colors"
          style={{
            borderColor: 'var(--border-primary)'
          }}
        >
          <div 
            className="flex items-center py-2 px-4 cursor-pointer"
            onClick={() => setShowDetails(!showDetails)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--interactive-secondary-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <div className="flex items-center" style={{ marginLeft: `${depth * 20}px` }}>
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSpanExpansion(span.spanId);
                  }}
                  className="mr-2 transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-tertiary)'
                  }}
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: spanColor }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="font-medium truncate"
                      style={{ 
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-sans)'
                      }}
                    >
                      {serviceName}
                    </span>
                    <span 
                      className="truncate"
                      style={{ 
                        fontSize: 'var(--text-sm)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {span.name}
                    </span>
                    {httpMethod && (
                      <span 
                        className="px-1 py-0.5 text-xs rounded"
                        style={{ 
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {httpMethod}
                      </span>
                    )}
                    {httpStatus && (
                      <span 
                        className="px-1 py-0.5 text-xs rounded"
                        style={{ 
                          backgroundColor: httpStatus >= 400 ? 'var(--status-error)' : 
                                        httpStatus >= 300 ? 'var(--status-warning)' : 'var(--status-success)',
                          color: 'white',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {httpStatus}
                      </span>
                    )}
                    {spanKind && (
                      <span 
                        className="px-1 py-0.5 text-xs rounded"
                        style={{ 
                          backgroundColor: 'var(--bg-elevated)',
                          color: 'var(--text-tertiary)',
                          fontFamily: 'var(--font-mono)'
                        }}
                      >
                        {spanKind}
                      </span>
                    )}
                    {isError && <AlertCircle size={16} style={{ color: 'var(--status-error)' }} />}
                  </div>
                  {httpRoute && (
                    <div 
                      className="mt-1 truncate"
                      style={{ 
                        fontSize: 'var(--text-xs)',
                        color: 'var(--text-tertiary)',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {httpRoute}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 ml-4">
              <div className="text-right">
                <div 
                  className="min-w-max font-mono"
                  style={{ 
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    fontWeight: 'bold'
                  }}
                >
                  {formatDuration(span.duration)}
                </div>
                {selfTime !== span.duration && (
                  <div 
                    className="min-w-max font-mono"
                    style={{ 
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-tertiary)'
                    }}
                  >
                    self: {formatDuration(selfTime)}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div 
                  className="min-w-max"
                  style={{ 
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)'
                  }}
                >
                  {formatTime(span.startTime)}
                </div>
                <div 
                  className="min-w-max font-mono"
                  style={{ 
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-tertiary)'
                  }}
                >
                  +{formatDuration(span.startTime - traceStartTime)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Span timeline visualization */}
          <div 
            className="px-4 py-1"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div 
              className="relative h-4"
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <div
                className="absolute h-full"
                style={{
                  left: `${spanStart}%`,
                  width: `${Math.max(spanWidth, 0.5)}%`,
                  backgroundColor: isError ? 'var(--status-error)' : spanColor,
                  opacity: 0.8,
                  borderRadius: 'var(--radius-sm)'
                }}
              />
            </div>
          </div>
          
          {/* Detailed information when expanded */}
          {showDetails && (
            <div 
              className="px-4 py-3 border-t"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-secondary)'
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 
                    className="font-semibold mb-2"
                    style={{ 
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Span Details
                  </h4>
                  <div className="space-y-1">
                    <div className="flex">
                      <span 
                        className="w-24 flex-shrink-0"
                        style={{ 
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-tertiary)'
                        }}
                      >
                        Span ID:
                      </span>
                      <span 
                        className="font-mono"
                        style={{ 
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {span.spanId}
                      </span>
                    </div>
                    {span.parentSpanId && (
                      <div className="flex">
                        <span 
                          className="w-24 flex-shrink-0"
                          style={{ 
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-tertiary)'
                          }}
                        >
                          Parent ID:
                        </span>
                        <span 
                          className="font-mono"
                          style={{ 
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {span.parentSpanId}
                        </span>
                      </div>
                    )}
                    <div className="flex">
                      <span 
                        className="w-24 flex-shrink-0"
                        style={{ 
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-tertiary)'
                        }}
                      >
                        Duration:
                      </span>
                      <span 
                        className="font-mono"
                        style={{ 
                          fontSize: 'var(--text-xs)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {formatDuration(span.duration)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 
                    className="font-semibold mb-2"
                    style={{ 
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Tags
                  </h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(span.attributes).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span 
                          className="w-32 flex-shrink-0 truncate"
                          style={{ 
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-tertiary)'
                          }}
                          title={key}
                        >
                          {key}:
                        </span>
                        <span 
                          className="font-mono break-all"
                          style={{ 
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Child spans */}
        {isExpanded && childSpans.sort((a, b) => a.startTime - b.startTime).map(childSpan => (
          <SpanRow
            key={childSpan.spanId}
            span={childSpan}
            allSpans={allSpans}
            depth={depth + 1}
            traceStartTime={traceStartTime}
            traceDuration={traceDuration}
          />
        ))}
      </>
    );
  };

  const rootSpans = selectedTrace ? buildSpanTree(selectedTrace.spans) : [];
  const traceStartTime = selectedTrace && selectedTrace.spans.length > 0 
    ? Math.min(...selectedTrace.spans.map(s => s.startTime)) 
    : 0;
  const traceEndTime = selectedTrace && selectedTrace.spans.length > 0 
    ? Math.max(...selectedTrace.spans.map(s => s.startTime + s.duration)) 
    : 0;
  const traceDuration = Math.max(1, traceEndTime - traceStartTime); // Ensure minimum duration of 1

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ 
          borderColor: 'var(--border-primary)',
          backgroundColor: 'var(--bg-secondary)'
        }}
      >
        <div className="flex items-center gap-3">
          <Activity size={20} style={{ color: 'var(--interactive-primary)' }} />
          <h1 
            className="text-lg font-medium"
            style={{ 
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)'
            }}
          >
            Trace Explorer
          </h1>
          <span className="badge-muted">
            {traces.length} traces
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-themed-secondary">
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Search Filters */}
      <div 
        className="page-toolbar"
        style={{ margin: 0, borderRadius: 0, borderLeft: 'none', borderRight: 'none' }}
      >
        <div className="page-toolbar__group">
          <select
            value={filters.service || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value || undefined }))}
            className="input-themed"
            style={{ minWidth: '160px' }}
          >
            <option value="">{services.length === 0 ? 'Loading...' : 'Service'}</option>
            {services.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
        </div>

        <div className="page-toolbar__group">
          <select
            value={filters.operation || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, operation: e.target.value || undefined }))}
            className="input-themed"
            style={{ minWidth: '140px', opacity: !filters.service ? 0.5 : 1 }}
            disabled={!filters.service}
          >
            <option value="">Operation</option>
            {operations.map(operation => (
              <option key={operation} value={operation}>{operation}</option>
            ))}
          </select>
        </div>

        <div className="page-toolbar__divider" />

        <div className="page-toolbar__group">
          <input
            type="text"
            placeholder="Tags (key:value)"
            value={filters.tags || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value || undefined }))}
            className="input-themed"
            style={{ width: '140px' }}
          />
        </div>

        <div className="page-toolbar__group">
          <input
            type="text"
            placeholder="Min"
            value={filters.minDuration || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, minDuration: e.target.value || undefined }))}
            className="input-themed"
            style={{ width: '70px' }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>to</span>
          <input
            type="text"
            placeholder="Max"
            value={filters.maxDuration || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, maxDuration: e.target.value || undefined }))}
            className="input-themed"
            style={{ width: '70px' }}
          />
        </div>

        <div className="page-toolbar__group">
          <select
            value={filters.limit}
            onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
            className="input-themed"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="page-toolbar__divider" />

        <div className="page-toolbar__group">
          <button
            onClick={searchTraces}
            disabled={loading || !filters.service}
            className="btn-themed-primary"
          >
            <Search size={14} />
            <span>{loading ? 'Searching...' : 'Search'}</span>
          </button>
          
          <button
            onClick={generateSampleTrace}
            disabled={loading}
            className="btn-themed-secondary"
          >
            <Activity size={14} />
            <span>Generate Sample</span>
          </button>
        </div>
        
        {!filters.service && services.length > 0 && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Select a service to search
          </span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div 
          className="mx-4 mt-4 p-4 border-l-4"
          style={{
            backgroundColor: 'var(--alert-error-bg)',
            color: 'var(--alert-error-text)',
            borderColor: 'var(--alert-error-border)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <div className="flex items-center">
            <AlertCircle className="mr-2" size={20} style={{ color: 'var(--status-error)' }} />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Traces List */}
        <div 
          className="w-1/2 border-r flex flex-col"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div 
            className="px-3 py-2 border-b flex items-center justify-between"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-primary)'
            }}
          >
            <span 
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              Results
            </span>
            {services.length === 0 && (
              <span 
                className="text-xs animate-pulse"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Loading services...
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-auto">
            {traces.length === 0 ? (
              <div 
                className="flex items-center justify-center h-full p-8 text-center"
                style={{ color: 'var(--text-muted)' }}
              >
                <div>
                  <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No traces found</p>
                  <p className="text-xs mt-1">Select a service and search for traces</p>
                </div>
              </div>
            ) : (
              traces.map(trace => {
                const rootSpan = trace.spans.find(span => !span.parentSpanId);
                const serviceName = rootSpan?.serviceName || 'unknown';
                const rootOperation = rootSpan?.name || 'unknown';
                const totalDuration = Math.max(...trace.spans.map(span => span.startTime + span.duration)) - Math.min(...trace.spans.map(span => span.startTime));
                const spanCount = trace.spans.length;
                const hasErrors = trace.spans.some(span => span.isError);
                const serviceCount = new Set(trace.spans.map(span => span.serviceName)).size;
                const errorCount = trace.spans.filter(span => span.isError).length;
                const traceStartTime = Math.min(...trace.spans.map(span => span.startTime));
                const isSelected = selectedTrace?.traceId === trace.traceId;

                return (
                  <div
                    key={trace.traceId}
                    onClick={() => loadTraceDetails(trace.traceId)}
                    className="px-3 py-2 border-b cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                      borderColor: 'var(--border-primary)',
                      borderLeftWidth: '3px',
                      borderLeftColor: isSelected ? 'var(--interactive-primary)' : 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-medium text-sm truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {rootOperation}
                          </span>
                          {hasErrors && (
                            <span className="badge-muted text-xs" style={{ color: 'var(--status-error)', borderColor: 'var(--status-error)' }}>
                              {errorCount} error{errorCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {serviceName}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {formatDuration(totalDuration)}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatTime(traceStartTime)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>{spanCount} spans</span>
                        <span>{serviceCount} services</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {trace.spans.slice(0, 4).map((span) => (
                          <div
                            key={span.spanId}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getSpanColor(span.serviceName) }}
                            title={span.serviceName}
                          />
                        ))}
                        {trace.spans.length > 4 && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            +{trace.spans.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Trace Details */}
        <div className="w-1/2 flex flex-col">
          {selectedTrace ? (
            <div className="h-full flex flex-col">
              <div 
                className="px-3 py-2 border-b flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-primary)'
                }}
              >
                <span 
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Timeline
                </span>
                <div className="flex items-center gap-2">
                  <span className="badge-muted">
                    {selectedTrace.spans.length} spans
                  </span>
                  <span 
                    className="font-mono text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {formatDuration(traceDuration)}
                  </span>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto">
                {rootSpans.map(span => (
                  <SpanRow
                    key={span.spanId}
                    span={span}
                    allSpans={selectedTrace.spans}
                    depth={0}
                    traceStartTime={traceStartTime}
                    traceDuration={traceDuration}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div 
              className="h-full flex items-center justify-center"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <div className="text-center">
                <Activity 
                  size={48} 
                  className="mx-auto mb-4" 
                  style={{ color: 'var(--text-tertiary)' }}
                />
                <p style={{ color: 'var(--text-secondary)' }}>Select a trace to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JaegerTraceViewer;

