// Real User Monitoring (RUM) Data Collector
// Captures user interactions, performance metrics, and errors

export interface RumEvent {
  id: string
  sessionId: string
  userId?: string
  timestamp: number
  type: 'pageview' | 'interaction' | 'error' | 'performance' | 'custom'
  data: Record<string, any>
  userAgent: string
  url: string
  referrer: string
  viewport: {
    width: number
    height: number
  }
  connection?: {
    effectiveType: string
    downlink: number
    rtt: number
  }
  location?: {
    country?: string
    region?: string
    city?: string
  }
}

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  fcp?: number // First Contentful Paint
  ttfb?: number // Time to First Byte
  
  // Navigation Timing
  domContentLoaded?: number
  loadComplete?: number
  
  // Resource Timing
  resources?: ResourceTiming[]
  
  // Custom metrics
  customMetrics?: Record<string, number>
}

export interface ResourceTiming {
  name: string
  type: string
  duration: number
  size: number
  startTime: number
}

export interface UserInteraction {
  type: 'click' | 'scroll' | 'input' | 'navigation'
  target: string
  timestamp: number
  data?: Record<string, any>
}

export interface ErrorEvent {
  message: string
  stack?: string
  filename?: string
  lineno?: number
  colno?: number
  type: 'javascript' | 'network' | 'resource' | 'custom'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class RumCollector {
  private sessionId: string
  private userId?: string
  private events: RumEvent[] = []
  private isEnabled: boolean = true
  private apiEndpoint: string = '/api/v1/rum/events'
  private batchSize: number = 10
  private flushInterval: number = 5000 // 5 seconds
  private flushTimer?: number

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeCollector()
  }

  private generateSessionId(): string {
    return `rum_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeCollector(): void {
    if (typeof window === 'undefined') return

    // Capture page load performance
    this.capturePageLoadMetrics()
    
    // Set up error tracking
    this.setupErrorTracking()
    
    // Set up user interaction tracking
    this.setupInteractionTracking()
    
    // Set up Core Web Vitals
    this.setupWebVitals()
    
    // Set up periodic flushing
    this.startPeriodicFlush()
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush())
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush()
      }
    })
  }

  private capturePageLoadMetrics(): void {
    if (!window.performance) return

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const paint = performance.getEntriesByType('paint')
        
        const metrics: PerformanceMetrics = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          ttfb: navigation.responseStart - navigation.requestStart,
          fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
          resources: this.getResourceTimings()
        }

        this.trackEvent('performance', {
          eventType: 'page_load',
          metrics
        })
      }, 0)
    })
  }

  private getResourceTimings(): ResourceTiming[] {
    if (!window.performance) return []

    return performance.getEntriesByType('resource').map((resource: any) => ({
      name: resource.name,
      type: this.getResourceType(resource.name),
      duration: resource.duration,
      size: resource.transferSize || 0,
      startTime: resource.startTime
    }))
  }

  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)$/)) return 'script'
    if (url.match(/\.(css)$/)) return 'stylesheet'
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image'
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font'
    if (url.includes('/api/')) return 'api'
    return 'other'
  }

  private setupErrorTracking(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript',
        severity: 'high'
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        type: 'javascript',
        severity: 'high'
      })
    })

    // Network errors (fetch/XHR)
    this.interceptNetworkRequests()
  }

  private interceptNetworkRequests(): void {
    // Intercept fetch
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = performance.now()
      try {
        const response = await originalFetch(...args)
        const duration = performance.now() - startTime
        
        this.trackEvent('performance', {
          eventType: 'network_request',
          url: args[0],
          method: args[1]?.method || 'GET',
          status: response.status,
          duration,
          success: response.ok
        })

        if (!response.ok) {
          this.trackError({
            message: `Network request failed: ${response.status} ${response.statusText}`,
            type: 'network',
            severity: response.status >= 500 ? 'high' : 'medium'
          })
        }

        return response
      } catch (error) {
        const duration = performance.now() - startTime
        this.trackError({
          message: `Network request failed: ${error}`,
          type: 'network',
          severity: 'high'
        })
        
        this.trackEvent('performance', {
          eventType: 'network_request',
          url: args[0],
          method: args[1]?.method || 'GET',
          duration,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        })
        
        throw error
      }
    }
  }

  private setupInteractionTracking(): void {
    // Click tracking
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      this.trackInteraction({
        type: 'click',
        target: this.getElementSelector(target),
        timestamp: Date.now(),
        data: {
          x: event.clientX,
          y: event.clientY,
          button: event.button
        }
      })
    })

    // Scroll tracking (throttled)
    let scrollTimeout: number
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        this.trackInteraction({
          type: 'scroll',
          target: 'window',
          timestamp: Date.now(),
          data: {
            scrollY: window.scrollY,
            scrollX: window.scrollX,
            scrollHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight
          }
        })
      }, 100)
    })

    // Form input tracking
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        this.trackInteraction({
          type: 'input',
          target: this.getElementSelector(target),
          timestamp: Date.now(),
          data: {
            inputType: (target as HTMLInputElement).type,
            valueLength: (target as HTMLInputElement).value.length
          }
        })
      }
    })
  }

  private setupWebVitals(): void {
    // This would integrate with web-vitals library in a real implementation
    // For now, we'll implement basic versions
    
    // LCP (Largest Contentful Paint)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          
          this.trackEvent('performance', {
            eventType: 'web_vital',
            metric: 'lcp',
            value: lastEntry.startTime,
            rating: this.getLCPRating(lastEntry.startTime)
          })
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (e) {
        console.warn('LCP observation not supported')
      }

      // FID (First Input Delay)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach((entry: any) => {
            this.trackEvent('performance', {
              eventType: 'web_vital',
              metric: 'fid',
              value: entry.processingStart - entry.startTime,
              rating: this.getFIDRating(entry.processingStart - entry.startTime)
            })
          })
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
      } catch (e) {
        console.warn('FID observation not supported')
      }
    }
  }

  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good'
    if (value <= 4000) return 'needs-improvement'
    return 'poor'
  }

  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good'
    if (value <= 300) return 'needs-improvement'
    return 'poor'
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`
    if (element.className) return `.${element.className.split(' ')[0]}`
    return element.tagName.toLowerCase()
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.events.length > 0) {
        this.flush()
      }
    }, this.flushInterval)
  }

  public setUserId(userId: string): void {
    this.userId = userId
  }

  public trackEvent(type: RumEvent['type'], data: Record<string, any>): void {
    if (!this.isEnabled) return

    const event: RumEvent = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      type,
      data,
      userAgent: navigator.userAgent,
      url: window.location.href,
      referrer: document.referrer,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }

    // Add connection info if available
    if ('connection' in navigator) {
      const conn = (navigator as any).connection
      event.connection = {
        effectiveType: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt
      }
    }

    this.events.push(event)

    // Auto-flush if batch size reached
    if (this.events.length >= this.batchSize) {
      this.flush()
    }
  }

  public trackError(error: ErrorEvent): void {
    this.trackEvent('error', error)
  }

  public trackInteraction(interaction: UserInteraction): void {
    this.trackEvent('interaction', interaction)
  }

  public trackCustomMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.trackEvent('custom', {
      metricName: name,
      value,
      tags
    })
  }

  public async flush(): Promise<void> {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: eventsToSend,
          sessionId: this.sessionId,
          timestamp: Date.now()
        })
      })
    } catch (error) {
      console.warn('Failed to send RUM events:', error)
      // Re-add events to queue for retry (with limit to prevent memory issues)
      this.events = [...eventsToSend.slice(-50), ...this.events]
    }
  }

  public enable(): void {
    this.isEnabled = true
  }

  public disable(): void {
    this.isEnabled = false
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
  }

  public getSessionId(): string {
    return this.sessionId
  }
}

// Global RUM instance
export const rumCollector = new RumCollector()

// Convenience functions
export const trackPageView = (page: string, additionalData?: Record<string, any>) => {
  rumCollector.trackEvent('pageview', {
    page,
    ...additionalData
  })
}

export const trackUserAction = (action: string, data?: Record<string, any>) => {
  rumCollector.trackEvent('interaction', {
    action,
    ...data
  })
}

export const trackError = (error: Error | string, context?: Record<string, any>) => {
  rumCollector.trackError({
    message: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    type: 'custom',
    severity: 'medium',
    ...context
  })
}

export const trackCustomMetric = (name: string, value: number, tags?: Record<string, string>) => {
  rumCollector.trackCustomMetric(name, value, tags)
} 