// RUM API Client for fetching and analyzing Real User Monitoring data

export interface RumSession {
  sessionId: string
  userId?: string
  startTime: number
  endTime?: number
  duration?: number
  pageViews: number
  interactions: number
  errors: number
  userAgent: string
  location?: {
    country?: string
    region?: string
    city?: string
  }
  device: {
    type: 'desktop' | 'mobile' | 'tablet'
    browser: string
    os: string
  }
  performance: {
    avgPageLoadTime: number
    avgLcp: number
    avgFid: number
    avgCls: number
  }
}

export interface RumPageView {
  id: string
  sessionId: string
  url: string
  title: string
  timestamp: number
  loadTime: number
  lcp?: number
  fid?: number
  cls?: number
  ttfb?: number
  errors: number
  interactions: number
}

export interface RumError {
  id: string
  sessionId: string
  timestamp: number
  message: string
  stack?: string
  filename?: string
  lineno?: number
  colno?: number
  type: 'javascript' | 'network' | 'resource' | 'custom'
  severity: 'low' | 'medium' | 'high' | 'critical'
  url: string
  userAgent: string
  resolved: boolean
}

export interface RumMetric {
  name: string
  value: number
  timestamp: number
  sessionId: string
  tags?: Record<string, string>
}

export interface RumAnalytics {
  overview: {
    totalSessions: number
    totalPageViews: number
    totalErrors: number
    avgSessionDuration: number
    bounceRate: number
    errorRate: number
  }
  performance: {
    avgPageLoadTime: number
    avgLcp: number
    avgFid: number
    avgCls: number
    p95PageLoadTime: number
    p95Lcp: number
  }
  topPages: Array<{
    url: string
    views: number
    avgLoadTime: number
    errorRate: number
  }>
  topErrors: Array<{
    message: string
    count: number
    affectedSessions: number
    severity: string
  }>
  devices: Array<{
    type: string
    count: number
    percentage: number
  }>
  browsers: Array<{
    name: string
    count: number
    percentage: number
  }>
  locations: Array<{
    country: string
    count: number
    percentage: number
  }>
}

export interface RumQueryParams {
  startTime?: string
  endTime?: string
  sessionId?: string
  userId?: string
  url?: string
  errorType?: string
  severity?: string
  limit?: number
  offset?: number
}

export class RumApi {
  private static baseUrl = '/api/v1/rum'

  // Sessions
  static async getSessions(params: RumQueryParams = {}): Promise<RumSession[]> {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined) as [string, string][]
    ).toString()
    
    const response = await fetch(`${this.baseUrl}/sessions?${queryString}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`)
    }
    
    const data = await response.json()
    return this.normalizeSessionsResponse(data)
  }

  static async getSession(sessionId: string): Promise<RumSession | null> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`Failed to fetch session: ${response.statusText}`)
    }
    
    const data = await response.json()
    return this.normalizeSessionResponse(data)
  }

  // Page Views
  static async getPageViews(params: RumQueryParams = {}): Promise<RumPageView[]> {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined) as [string, string][]
    ).toString()
    
    const response = await fetch(`${this.baseUrl}/pageviews?${queryString}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch page views: ${response.statusText}`)
    }
    
    const data = await response.json()
    return this.normalizePageViewsResponse(data)
  }

  // Errors
  static async getErrors(params: RumQueryParams = {}): Promise<RumError[]> {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined) as [string, string][]
    ).toString()
    
    const response = await fetch(`${this.baseUrl}/errors?${queryString}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch errors: ${response.statusText}`)
    }
    
    const data = await response.json()
    return this.normalizeErrorsResponse(data)
  }

  static async markErrorResolved(errorId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/errors/${errorId}/resolve`, {
      method: 'POST'
    })
    if (!response.ok) {
      throw new Error(`Failed to mark error as resolved: ${response.statusText}`)
    }
  }

  // Analytics
  static async getAnalytics(params: RumQueryParams = {}): Promise<RumAnalytics> {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined) as [string, string][]
    ).toString()
    
    const response = await fetch(`${this.baseUrl}/analytics?${queryString}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`)
    }
    
    const data = await response.json()
    return this.normalizeAnalyticsResponse(data)
  }

  // Performance Metrics
  static async getPerformanceMetrics(params: RumQueryParams = {}): Promise<RumMetric[]> {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined) as [string, string][]
    ).toString()
    
    const response = await fetch(`${this.baseUrl}/metrics?${queryString}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch performance metrics: ${response.statusText}`)
    }
    
    const data = await response.json()
    return this.normalizeMetricsResponse(data)
  }

  // User Journey
  static async getUserJourney(sessionId: string): Promise<Array<{
    timestamp: number
    type: 'pageview' | 'interaction' | 'error'
    data: any
  }>> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/journey`)
    if (!response.ok) {
      throw new Error(`Failed to fetch user journey: ${response.statusText}`)
    }
    
    const data = await response.json()
    return data.journey || []
  }

  // Real-time metrics
  static async getRealTimeMetrics(): Promise<{
    activeSessions: number
    currentPageViews: number
    errorsLastHour: number
    avgResponseTime: number
  }> {
    const response = await fetch(`${this.baseUrl}/realtime`)
    if (!response.ok) {
      throw new Error(`Failed to fetch real-time metrics: ${response.statusText}`)
    }
    
    return response.json()
  }

  // Data normalization methods
  private static normalizeSessionsResponse(data: any): RumSession[] {
    // Handle different response formats
    if (Array.isArray(data)) {
      return data.map(this.normalizeSessionResponse)
    }
    if (data.sessions) {
      return data.sessions.map(this.normalizeSessionResponse)
    }
    if (data.data && Array.isArray(data.data)) {
      return data.data.map(this.normalizeSessionResponse)
    }
    return []
  }

  private static normalizeSessionResponse(session: any): RumSession {
    return {
      sessionId: session.sessionId || session.id,
      userId: session.userId,
      startTime: session.startTime || session.timestamp,
      endTime: session.endTime,
      duration: session.duration,
      pageViews: session.pageViews || 0,
      interactions: session.interactions || 0,
      errors: session.errors || 0,
      userAgent: session.userAgent || '',
      location: session.location,
      device: session.device || this.parseUserAgent(session.userAgent),
      performance: session.performance || {
        avgPageLoadTime: 0,
        avgLcp: 0,
        avgFid: 0,
        avgCls: 0
      }
    }
  }

  private static normalizePageViewsResponse(data: any): RumPageView[] {
    if (Array.isArray(data)) {
      return data.map(this.normalizePageViewResponse)
    }
    if (data.pageViews) {
      return data.pageViews.map(this.normalizePageViewResponse)
    }
    return []
  }

  private static normalizePageViewResponse(pageView: any): RumPageView {
    return {
      id: pageView.id,
      sessionId: pageView.sessionId,
      url: pageView.url,
      title: pageView.title || '',
      timestamp: pageView.timestamp,
      loadTime: pageView.loadTime || 0,
      lcp: pageView.lcp,
      fid: pageView.fid,
      cls: pageView.cls,
      ttfb: pageView.ttfb,
      errors: pageView.errors || 0,
      interactions: pageView.interactions || 0
    }
  }

  private static normalizeErrorsResponse(data: any): RumError[] {
    if (Array.isArray(data)) {
      return data.map(this.normalizeErrorResponse)
    }
    if (data.errors) {
      return data.errors.map(this.normalizeErrorResponse)
    }
    return []
  }

  private static normalizeErrorResponse(error: any): RumError {
    return {
      id: error.id,
      sessionId: error.sessionId,
      timestamp: error.timestamp,
      message: error.message,
      stack: error.stack,
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
      type: error.type || 'javascript',
      severity: error.severity || 'medium',
      url: error.url,
      userAgent: error.userAgent || '',
      resolved: error.resolved || false
    }
  }

  private static normalizeAnalyticsResponse(data: any): RumAnalytics {
    return {
      overview: data.overview || {
        totalSessions: 0,
        totalPageViews: 0,
        totalErrors: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
        errorRate: 0
      },
      performance: data.performance || {
        avgPageLoadTime: 0,
        avgLcp: 0,
        avgFid: 0,
        avgCls: 0,
        p95PageLoadTime: 0,
        p95Lcp: 0
      },
      topPages: data.topPages || [],
      topErrors: data.topErrors || [],
      devices: data.devices || [],
      browsers: data.browsers || [],
      locations: data.locations || []
    }
  }

  private static normalizeMetricsResponse(data: any): RumMetric[] {
    if (Array.isArray(data)) {
      return data
    }
    if (data.metrics) {
      return data.metrics
    }
    return []
  }

  private static parseUserAgent(userAgent: string): RumSession['device'] {
    const ua = userAgent.toLowerCase()
    
    // Device type detection
    let type: 'desktop' | 'mobile' | 'tablet' = 'desktop'
    if (ua.includes('mobile')) type = 'mobile'
    else if (ua.includes('tablet') || ua.includes('ipad')) type = 'tablet'
    
    // Browser detection
    let browser = 'Unknown'
    if (ua.includes('chrome')) browser = 'Chrome'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('safari')) browser = 'Safari'
    else if (ua.includes('edge')) browser = 'Edge'
    else if (ua.includes('opera')) browser = 'Opera'
    
    // OS detection
    let os = 'Unknown'
    if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('mac')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'
    else if (ua.includes('android')) os = 'Android'
    else if (ua.includes('ios')) os = 'iOS'
    
    return { type, browser, os }
  }

  // Mock data generators for development
  static generateMockSessions(count: number = 50): RumSession[] {
    const sessions: RumSession[] = []
    const now = Date.now()
    
    for (let i = 0; i < count; i++) {
      const startTime = now - Math.random() * 7 * 24 * 60 * 60 * 1000 // Last 7 days
      const duration = Math.random() * 30 * 60 * 1000 // Up to 30 minutes
      
      sessions.push({
        sessionId: `session_${i}_${Date.now()}`,
        userId: Math.random() > 0.3 ? `user_${Math.floor(Math.random() * 1000)}` : undefined,
        startTime,
        endTime: startTime + duration,
        duration,
        pageViews: Math.floor(Math.random() * 10) + 1,
        interactions: Math.floor(Math.random() * 50),
        errors: Math.floor(Math.random() * 3),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        device: {
          type: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)] as any,
          browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)],
          os: ['Windows', 'macOS', 'Linux', 'Android', 'iOS'][Math.floor(Math.random() * 5)]
        },
        performance: {
          avgPageLoadTime: Math.random() * 3000 + 500,
          avgLcp: Math.random() * 4000 + 1000,
          avgFid: Math.random() * 200 + 50,
          avgCls: Math.random() * 0.3
        }
      })
    }
    
    return sessions
  }

  static generateMockAnalytics(): RumAnalytics {
    return {
      overview: {
        totalSessions: 1247,
        totalPageViews: 8934,
        totalErrors: 23,
        avgSessionDuration: 4.2 * 60 * 1000, // 4.2 minutes
        bounceRate: 0.34,
        errorRate: 0.0026
      },
      performance: {
        avgPageLoadTime: 1850,
        avgLcp: 2100,
        avgFid: 85,
        avgCls: 0.12,
        p95PageLoadTime: 4200,
        p95Lcp: 5800
      },
      topPages: [
        { url: '/dashboard', views: 2341, avgLoadTime: 1650, errorRate: 0.001 },
        { url: '/search', views: 1876, avgLoadTime: 2100, errorRate: 0.003 },
        { url: '/alerts', views: 1234, avgLoadTime: 1400, errorRate: 0.002 },
        { url: '/settings', views: 987, avgLoadTime: 1200, errorRate: 0.001 }
      ],
      topErrors: [
        { message: 'TypeError: Cannot read property of undefined', count: 8, affectedSessions: 6, severity: 'high' },
        { message: 'Network request failed: 500 Internal Server Error', count: 5, affectedSessions: 4, severity: 'high' },
        { message: 'ChunkLoadError: Loading chunk failed', count: 4, affectedSessions: 4, severity: 'medium' },
        { message: 'ReferenceError: variable is not defined', count: 3, affectedSessions: 3, severity: 'medium' }
      ],
      devices: [
        { type: 'desktop', count: 856, percentage: 68.6 },
        { type: 'mobile', count: 312, percentage: 25.0 },
        { type: 'tablet', count: 79, percentage: 6.4 }
      ],
      browsers: [
        { name: 'Chrome', count: 743, percentage: 59.6 },
        { name: 'Firefox', count: 287, percentage: 23.0 },
        { name: 'Safari', count: 149, percentage: 11.9 },
        { name: 'Edge', count: 68, percentage: 5.5 }
      ],
      locations: [
        { country: 'United States', count: 456, percentage: 36.6 },
        { country: 'United Kingdom', count: 234, percentage: 18.8 },
        { country: 'Germany', count: 187, percentage: 15.0 },
        { country: 'Canada', count: 123, percentage: 9.9 },
        { country: 'France', count: 98, percentage: 7.9 }
      ]
    }
  }
} 