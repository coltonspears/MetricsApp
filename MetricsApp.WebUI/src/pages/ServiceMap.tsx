import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Network,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  ArrowRight,
  RotateCcw
} from 'lucide-react'
import PageHeader from '../components/PageHeader'

interface ServiceDependency {
  parent: string
  child: string
  callCount: number
  source?: string
}

interface ServiceNode {
  id: string
  name: string
  x: number
  y: number
  incomingCalls: number
  outgoingCalls: number
  connections: string[]
  isRoot: boolean
  isLeaf: boolean
}

interface CanvasState {
  zoom: number
  offsetX: number
  offsetY: number
}

const ServiceMap: React.FC = () => {
  const [dependencies, setDependencies] = useState<ServiceDependency[]>([])
  const [nodes, setNodes] = useState<ServiceNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [lookbackHours, setLookbackHours] = useState(24)
  const [canvas, setCanvas] = useState<CanvasState>({ zoom: 1, offsetX: 0, offsetY: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchDependencies = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const lookbackMs = lookbackHours * 60 * 60 * 1000
      const response = await fetch(`/api/v1/integrations/jaeger/dependencies?lookback=${lookbackMs}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch service dependencies')
      }

      const result = await response.json()
      const deps: ServiceDependency[] = result.data?.data || []
      setDependencies(deps)

      // Build node graph
      const serviceMap = new Map<string, ServiceNode>()
      
      deps.forEach(dep => {
        // Add parent node
        if (!serviceMap.has(dep.parent)) {
          serviceMap.set(dep.parent, {
            id: dep.parent,
            name: dep.parent,
            x: 0,
            y: 0,
            incomingCalls: 0,
            outgoingCalls: 0,
            connections: [],
            isRoot: true,
            isLeaf: false
          })
        }
        
        // Add child node
        if (!serviceMap.has(dep.child)) {
          serviceMap.set(dep.child, {
            id: dep.child,
            name: dep.child,
            x: 0,
            y: 0,
            incomingCalls: 0,
            outgoingCalls: 0,
            connections: [],
            isRoot: true,
            isLeaf: true
          })
        }

        // Update connections
        const parent = serviceMap.get(dep.parent)!
        const child = serviceMap.get(dep.child)!
        
        parent.outgoingCalls += dep.callCount
        parent.connections.push(dep.child)
        
        child.incomingCalls += dep.callCount
        child.isRoot = false
      })

      // Layout nodes in a hierarchical arrangement
      const nodeList = Array.from(serviceMap.values())
      layoutNodes(nodeList)
      setNodes(nodeList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dependencies')
      // Generate mock data for demo
      generateMockData()
    } finally {
      setLoading(false)
    }
  }, [lookbackHours])

  const generateMockData = () => {
    const mockDeps: ServiceDependency[] = [
      { parent: 'frontend', child: 'api-gateway', callCount: 15420 },
      { parent: 'api-gateway', child: 'user-service', callCount: 8234 },
      { parent: 'api-gateway', child: 'order-service', callCount: 12456 },
      { parent: 'api-gateway', child: 'product-service', callCount: 9876 },
      { parent: 'user-service', child: 'auth-service', callCount: 3456 },
      { parent: 'user-service', child: 'postgres', callCount: 7890 },
      { parent: 'order-service', child: 'payment-service', callCount: 5678 },
      { parent: 'order-service', child: 'inventory-service', callCount: 4567 },
      { parent: 'order-service', child: 'postgres', callCount: 11234 },
      { parent: 'product-service', child: 'elasticsearch', callCount: 6543 },
      { parent: 'product-service', child: 'redis', callCount: 8765 },
      { parent: 'payment-service', child: 'stripe-api', callCount: 2345 },
      { parent: 'inventory-service', child: 'postgres', callCount: 3456 },
      { parent: 'auth-service', child: 'redis', callCount: 4321 }
    ]

    setDependencies(mockDeps)

    // Build nodes from mock data
    const serviceMap = new Map<string, ServiceNode>()
    
    mockDeps.forEach(dep => {
      if (!serviceMap.has(dep.parent)) {
        serviceMap.set(dep.parent, {
          id: dep.parent,
          name: dep.parent,
          x: 0,
          y: 0,
          incomingCalls: 0,
          outgoingCalls: 0,
          connections: [],
          isRoot: true,
          isLeaf: false
        })
      }
      
      if (!serviceMap.has(dep.child)) {
        serviceMap.set(dep.child, {
          id: dep.child,
          name: dep.child,
          x: 0,
          y: 0,
          incomingCalls: 0,
          outgoingCalls: 0,
          connections: [],
          isRoot: true,
          isLeaf: true
        })
      }

      const parent = serviceMap.get(dep.parent)!
      const child = serviceMap.get(dep.child)!
      
      parent.outgoingCalls += dep.callCount
      parent.connections.push(dep.child)
      
      child.incomingCalls += dep.callCount
      child.isRoot = false
    })

    const nodeList = Array.from(serviceMap.values())
    layoutNodes(nodeList)
    setNodes(nodeList)
  }

  const layoutNodes = (nodeList: ServiceNode[]) => {
    // Create a hierarchical layout
    const levels = new Map<string, number>()
    const visited = new Set<string>()
    
    // Find root nodes
    const roots = nodeList.filter(n => n.isRoot)
    roots.forEach(r => levels.set(r.id, 0))
    
    // BFS to assign levels
    const queue = [...roots]
    while (queue.length > 0) {
      const node = queue.shift()!
      if (visited.has(node.id)) continue
      visited.add(node.id)
      
      const currentLevel = levels.get(node.id) || 0
      
      node.connections.forEach(childId => {
        const childLevel = levels.get(childId) || 0
        if (!levels.has(childId) || childLevel <= currentLevel) {
          levels.set(childId, currentLevel + 1)
        }
        const childNode = nodeList.find(n => n.id === childId)
        if (childNode && !visited.has(childId)) {
          queue.push(childNode)
        }
      })
    }

    // Position nodes based on levels
    const levelGroups = new Map<number, ServiceNode[]>()
    nodeList.forEach(node => {
      const level = levels.get(node.id) || 0
      if (!levelGroups.has(level)) {
        levelGroups.set(level, [])
      }
      levelGroups.get(level)!.push(node)
    })

    const containerWidth = 800
    const containerHeight = 500
    const levelSpacing = containerWidth / (levelGroups.size + 1)

    levelGroups.forEach((nodesInLevel, level) => {
      const nodeSpacing = containerHeight / (nodesInLevel.length + 1)
      nodesInLevel.forEach((node, index) => {
        node.x = (level + 1) * levelSpacing
        node.y = (index + 1) * nodeSpacing
      })
    })
  }

  useEffect(() => {
    fetchDependencies()
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true)
      setDragStart({ x: e.clientX - canvas.offsetX, y: e.clientY - canvas.offsetY })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setCanvas(prev => ({
        ...prev,
        offsetX: e.clientX - dragStart.x,
        offsetY: e.clientY - dragStart.y
      }))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoom = (delta: number) => {
    setCanvas(prev => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(2, prev.zoom + delta))
    }))
  }

  const resetView = () => {
    setCanvas({ zoom: 1, offsetX: 0, offsetY: 0 })
  }

  const getNodeType = (node: ServiceNode): string => {
    const name = node.name.toLowerCase()
    if (name.includes('postgres') || name.includes('mysql') || name.includes('database')) return 'database'
    if (name.includes('redis') || name.includes('cache')) return 'cache'
    if (name.includes('elasticsearch') || name.includes('search')) return 'search'
    if (name.includes('kafka') || name.includes('rabbitmq') || name.includes('queue')) return 'queue'
    if (name.includes('api') || name.includes('gateway')) return 'gateway'
    if (name.includes('frontend') || name.includes('web')) return 'frontend'
    return 'service'
  }

  const formatCallCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const selectedServiceDetails = selectedService 
    ? {
        node: nodes.find(n => n.id === selectedService),
        incoming: dependencies.filter(d => d.child === selectedService),
        outgoing: dependencies.filter(d => d.parent === selectedService)
      }
    : null

  return (
    <div className="page-shell">
      <PageHeader
        title="Service Dependency Map"
        description="Visualize service relationships and call patterns"
        meta={
          <span className="badge-muted">
            <Network className="h-3 w-3" />
            {nodes.length} services • {dependencies.length} connections
          </span>
        }
        actions={
          <div className="page-actions">
            <select
              value={lookbackHours}
              onChange={(e) => setLookbackHours(Number(e.target.value))}
              className="input-themed"
            >
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={24}>Last 24 hours</option>
              <option value={168}>Last 7 days</option>
            </select>
            <button onClick={fetchDependencies} disabled={loading} className="btn-themed-secondary">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {error && (
        <div className="panel border-themed-status-warning bg-yellow-500/5">
          <div className="flex items-center gap-2 text-themed-status-warning">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Using demo data - Jaeger not available</span>
          </div>
          <p className="text-sm text-themed-text-secondary mt-1">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Service Map Canvas */}
        <div className="lg:col-span-3 panel flex flex-col min-h-[500px]">
          <div className="panel-header">
            <h3 className="panel-title">Topology View</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => handleZoom(0.1)} className="btn-themed-secondary p-2" title="Zoom In">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button onClick={() => handleZoom(-0.1)} className="btn-themed-secondary p-2" title="Zoom Out">
                <ZoomOut className="h-4 w-4" />
              </button>
              <button onClick={resetView} className="btn-themed-secondary p-2" title="Reset View">
                <RotateCcw className="h-4 w-4" />
              </button>
              <span className="text-xs text-themed-text-muted">{Math.round(canvas.zoom * 100)}%</span>
            </div>
          </div>
          
          <div 
            ref={containerRef}
            className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
            style={{ backgroundColor: 'var(--bg-surface)' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-themed-interactive-primary" />
              </div>
            ) : nodes.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-themed-text-muted">
                <div className="text-center">
                  <Network className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No service dependencies found</p>
                  <p className="text-sm mt-1">Start tracing requests to see the service map</p>
                </div>
              </div>
            ) : (
              <svg 
                width="100%" 
                height="100%" 
                viewBox="0 0 900 600"
                style={{ 
                  transform: `scale(${canvas.zoom}) translate(${canvas.offsetX}px, ${canvas.offsetY}px)`,
                  transformOrigin: 'center'
                }}
              >
                {/* Connection lines */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon 
                      points="0 0, 10 3.5, 0 7" 
                      fill="var(--text-muted)"
                    />
                  </marker>
                </defs>
                
                {dependencies.map((dep, idx) => {
                  const parentNode = nodes.find(n => n.id === dep.parent)
                  const childNode = nodes.find(n => n.id === dep.child)
                  if (!parentNode || !childNode) return null

                  const isHighlighted = selectedService === dep.parent || selectedService === dep.child
                  const lineWidth = Math.min(4, Math.max(1, Math.log10(dep.callCount)))
                  
                  return (
                    <g key={idx}>
                      <line
                        x1={parentNode.x + 60}
                        y1={parentNode.y}
                        x2={childNode.x - 60}
                        y2={childNode.y}
                        stroke={isHighlighted ? 'var(--interactive-primary)' : 'var(--border-secondary)'}
                        strokeWidth={isHighlighted ? lineWidth + 1 : lineWidth}
                        strokeOpacity={isHighlighted ? 1 : 0.6}
                        markerEnd="url(#arrowhead)"
                      />
                      {/* Call count label */}
                      <text
                        x={(parentNode.x + childNode.x) / 2}
                        y={(parentNode.y + childNode.y) / 2 - 8}
                        fill="var(--text-muted)"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {formatCallCount(dep.callCount)}
                      </text>
                    </g>
                  )
                })}

                {/* Service nodes */}
                {nodes.map(node => {
                  const isSelected = selectedService === node.id
                  const nodeType = getNodeType(node)
                  
                  return (
                    <g 
                      key={node.id}
                      onClick={() => setSelectedService(isSelected ? null : node.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={node.x - 60}
                        y={node.y - 25}
                        width={120}
                        height={50}
                        rx={6}
                        fill={isSelected ? 'var(--interactive-primary)' : 'var(--bg-elevated)'}
                        stroke={isSelected ? 'var(--interactive-primary)' : 'var(--border-primary)'}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <text
                        x={node.x}
                        y={node.y - 5}
                        fill={isSelected ? 'var(--text-inverse)' : 'var(--text-primary)'}
                        fontSize="12"
                        fontWeight="500"
                        textAnchor="middle"
                      >
                        {node.name.length > 14 ? node.name.slice(0, 14) + '...' : node.name}
                      </text>
                      <text
                        x={node.x}
                        y={node.y + 12}
                        fill={isSelected ? 'var(--text-inverse)' : 'var(--text-muted)'}
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {nodeType}
                      </text>
                    </g>
                  )
                })}
              </svg>
            )}
          </div>
          
          {/* Legend */}
          <div className="panel-footer flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }} />
              <span className="text-themed-text-muted">Service</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="h-3 w-3 text-themed-text-muted" />
              <span className="text-themed-text-muted">Dependency</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-themed-text-muted">Line thickness = call volume</span>
            </div>
          </div>
        </div>

        {/* Service Details Panel */}
        <div className="space-y-4">
          {selectedServiceDetails?.node ? (
            <>
              <div className="panel">
                <div className="panel-header">
                  <h3 className="panel-title">{selectedServiceDetails.node.name}</h3>
                  <span className="badge-muted">{getNodeType(selectedServiceDetails.node)}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-themed-text-secondary text-sm">Total Incoming</span>
                    <span className="font-mono text-themed-text-primary">{formatCallCount(selectedServiceDetails.node.incomingCalls)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-themed-text-secondary text-sm">Total Outgoing</span>
                    <span className="font-mono text-themed-text-primary">{formatCallCount(selectedServiceDetails.node.outgoingCalls)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-themed-text-secondary text-sm">Dependencies</span>
                    <span className="font-mono text-themed-text-primary">{selectedServiceDetails.node.connections.length}</span>
                  </div>
                </div>
              </div>

              {selectedServiceDetails.incoming.length > 0 && (
                <div className="panel">
                  <div className="panel-header">
                    <h4 className="panel-title text-sm">Incoming Calls</h4>
                  </div>
                  <div className="space-y-2">
                    {selectedServiceDetails.incoming.map((dep, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between py-1"
                        onClick={() => setSelectedService(dep.parent)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="text-themed-text-secondary text-sm">{dep.parent}</span>
                        <span className="font-mono text-xs text-themed-text-muted">{formatCallCount(dep.callCount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedServiceDetails.outgoing.length > 0 && (
                <div className="panel">
                  <div className="panel-header">
                    <h4 className="panel-title text-sm">Outgoing Calls</h4>
                  </div>
                  <div className="space-y-2">
                    {selectedServiceDetails.outgoing.map((dep, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center justify-between py-1"
                        onClick={() => setSelectedService(dep.child)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="text-themed-text-secondary text-sm">{dep.child}</span>
                        <span className="font-mono text-xs text-themed-text-muted">{formatCallCount(dep.callCount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="panel">
              <div className="text-center py-8 text-themed-text-muted">
                <Network className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Click a service to view details</p>
              </div>
            </div>
          )}

          {/* Stats Overview */}
          <div className="panel">
            <div className="panel-header">
              <h4 className="panel-title text-sm">Overview</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-themed-text-secondary text-sm">Total Services</span>
                <span className="font-mono text-themed-text-primary">{nodes.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-themed-text-secondary text-sm">Total Connections</span>
                <span className="font-mono text-themed-text-primary">{dependencies.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-themed-text-secondary text-sm">Total Calls</span>
                <span className="font-mono text-themed-text-primary">
                  {formatCallCount(dependencies.reduce((sum, d) => sum + d.callCount, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-themed-text-secondary text-sm">Root Services</span>
                <span className="font-mono text-themed-text-primary">{nodes.filter(n => n.isRoot).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-themed-text-secondary text-sm">Leaf Services</span>
                <span className="font-mono text-themed-text-primary">{nodes.filter(n => n.isLeaf).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceMap

