import { recordError, traceApiCall } from './telemetry'

export type RumEventType = 'pageview' | 'interaction' | 'error' | 'performance' | 'custom'

export interface RumEvent {
  id: string
  sessionId: string
  userId?: string
  timestamp: number
  type: RumEventType
  data: Record<string, unknown>
  userAgent: string
  url: string
  referrer: string
  viewport: {
    width: number
    height: number
  }
  connection?: {
    effectiveType?: string
    downlink?: number
    rtt?: number
  }
  location?: {
    country?: string
    region?: string
    city?: string
  }
}

export interface RumCollectorConfig {
  endpoint?: string
  batchSize?: number
  flushIntervalMs?: number
  maxQueueSize?: number
  autoStart?: boolean
  credentials?: RequestCredentials
  useSendBeacon?: boolean
}

export interface RumInteractionEvent {
  type: 'click' | 'scroll' | 'input' | 'navigation'
  target: string
  timestamp: number
  data?: Record<string, unknown>
}

export interface RumErrorPayload {
  message: string
  stack?: string
  filename?: string
  lineno?: number
  colno?: number
  category?: 'javascript' | 'network' | 'resource' | 'custom'
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

const DEFAULT_CONFIG: Required<Omit<RumCollectorConfig, 'autoStart'>> & { autoStart: boolean } = {
  endpoint: '/api/v1/rum/events',
  batchSize: 10,
  flushIntervalMs: 5000,
  maxQueueSize: 1000,
  credentials: 'include',
  useSendBeacon: true,
  autoStart: true
}

const navigationTimingKeys = [
  'domComplete',
  'domContentLoadedEventEnd',
  'domContentLoadedEventStart',
  'domInteractive',
  'loadEventEnd',
  'loadEventStart',
  'redirectCount',
  'transferSize'
] as const

type LayoutShiftEntry = PerformanceEntry & {
  value: number
  hadRecentInput: boolean
}

const performanceMarks = {
  lcp: 'largest-contentful-paint',
  fid: 'first-input',
  cls: 'layout-shift'
} as const

let globalCollector: RumCollector | undefined

type FlushTimer = ReturnType<typeof setInterval>

type EventListenerDisposer = () => void

export class RumCollector {
  private config: typeof DEFAULT_CONFIG
  private readonly sessionId: string
  private flushTimer?: FlushTimer
  private readonly disposers: EventListenerDisposer[] = []
  private readonly observers: PerformanceObserver[] = []
  private queue: RumEvent[] = []
  private userId?: string
  private enabled = false

  constructor(config: RumCollectorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.sessionId = this.generateSessionId()

    if (typeof window !== 'undefined' && this.config.autoStart) {
      this.enable()
    }
  }

  public enable(): void {
    if (this.enabled || typeof window === 'undefined') {
      return
    }

    this.enabled = true
    this.attachGlobalListeners()
    this.captureInitialMetrics()
    this.startFlushTimer()
  }

  public disable(): void {
    if (!this.enabled) {
      return
    }

    this.enabled = false

    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = undefined
    }

    this.observers.forEach(observer => observer.disconnect())
    this.observers.length = 0

    while (this.disposers.length > 0) {
      const dispose = this.disposers.pop()
      dispose?.()
    }
  }

  public configure(config: RumCollectorConfig): void {
    Object.assign(this.config, config)
  }

  public setUserId(userId?: string): void {
    this.userId = userId
  }

  public getSessionId(): string {
    return this.sessionId
  }

  public getFetchCredentials(): RequestCredentials {
    return this.config.credentials
  }

  public trackEvent(type: RumEventType, data: Record<string, unknown>): void {
    if (!this.enabled || typeof window === 'undefined') {
      return
    }

    const event: RumEvent = {
      id: this.createEventId(),
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
      },
      connection: this.getConnectionInfo()
    }

    if (this.queue.length >= this.config.maxQueueSize) {
      this.queue.shift()
    }

    this.queue.push(event)

    if (this.queue.length >= this.config.batchSize) {
      void this.flush()
    }
  }

  public trackInteraction(interaction: RumInteractionEvent): void {
    this.trackEvent('interaction', { ...interaction })
  }

  public trackError(error: RumErrorPayload): void {
    this.trackEvent('error', { ...error })
  }

  public trackCustomMetric(name: string, value: number, tags?: Record<string, string>): void {
    this.trackEvent('custom', {
      metricName: name,
      value,
      tags
    })
  }

  public async flush(): Promise<void> {
    if (!this.enabled || this.queue.length === 0 || typeof window === 'undefined') {
      return
    }

    const eventsToSend = this.queue
    this.queue = []

    const payload = {
      events: eventsToSend,
      sessionId: this.sessionId,
      timestamp: Date.now()
    }

    const body = JSON.stringify(payload)

    if (this.config.useSendBeacon && typeof navigator.sendBeacon === 'function') {
      const success = navigator.sendBeacon(this.config.endpoint, new Blob([body], { type: 'application/json' }))
      if (success) {
        return
      }
    }

    try {
      await traceApiCall(this.config.endpoint, 'POST', () => {
        return fetch(this.config.endpoint, {
          method: 'POST',
          credentials: this.config.credentials,
          headers: {
            'Content-Type': 'application/json'
          },
          body
        })
      })
    } catch (error) {
      recordError(error, 'rum.flush')
      // Requeue the events to try again later, but keep the queue bounded
      this.queue = [...eventsToSend, ...this.queue].slice(-this.config.maxQueueSize)
    }
  }

  private attachGlobalListeners(): void {
    if (typeof window === 'undefined') {
      return
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void this.flush()
      }
    }

    const onBeforeUnload = () => {
      void this.flush()
    }

    const onError = (event: globalThis.ErrorEvent) => {
      this.trackError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno ?? undefined,
        colno: event.colno ?? undefined,
        category: 'javascript',
        severity: 'high',
        stack: event.error instanceof Error ? event.error.stack : undefined
      })
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      this.trackError({
        message: String(event.reason),
        category: 'custom',
        severity: 'high'
      })
    }

    const disposeVisibility = this.addDocumentListener('visibilitychange', onVisibilityChange)
    const disposeBeforeUnload = this.addWindowListener('beforeunload', onBeforeUnload)
    const disposeError = this.addWindowListener('error', onError)
    const disposePromise = this.addWindowListener('unhandledrejection', onUnhandledRejection)

    this.disposers.push(disposeVisibility, disposeBeforeUnload, disposeError, disposePromise)
  }

  private addWindowListener<K extends keyof WindowEventMap>(event: K, handler: (event: WindowEventMap[K]) => void): EventListenerDisposer {
    window.addEventListener(event, handler as EventListener)
    return () => window.removeEventListener(event, handler as EventListener)
  }

  private addDocumentListener<K extends keyof DocumentEventMap>(event: K, handler: (event: DocumentEventMap[K]) => void): EventListenerDisposer {
    document.addEventListener(event, handler as EventListener)
    return () => document.removeEventListener(event, handler as EventListener)
  }

  private captureInitialMetrics(): void {
    this.captureNavigationTiming()
    this.observeLargestContentfulPaint()
    this.observeFirstInputDelay()
    this.observeCumulativeLayoutShift()
  }

  private captureNavigationTiming(): void {
    if (!('performance' in window)) {
      return
    }

    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const navigation = navigationEntries[0]

    if (!navigation) {
      return
    }

    const timing: Record<string, number> = {}

    for (const key of navigationTimingKeys) {
      const value = navigation[key]
      if (typeof value === 'number' && !Number.isNaN(value) && value !== 0) {
        timing[key] = value
      }
    }

    this.trackEvent('performance', {
      category: 'navigation',
      timing,
      type: 'navigation'
    })
  }

  private observeLargestContentfulPaint(): void {
    if (!('PerformanceObserver' in window)) {
      return
    }

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as LargestContentfulPaint | undefined

        if (!lastEntry) {
          return
        }

        this.trackEvent('performance', {
          category: performanceMarks.lcp,
          value: lastEntry.renderTime || lastEntry.loadTime,
          size: lastEntry.size
        })
      })

      observer.observe({ type: performanceMarks.lcp, buffered: true })
      this.observers.push(observer)
    } catch (error) {
      console.debug('[RUM] Unable to observe LCP', error)
    }
  }

  private observeFirstInputDelay(): void {
    if (!('PerformanceObserver' in window)) {
      return
    }

    try {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries() as PerformanceEventTiming[]
        const entry = entries[0]

        if (!entry) {
          return
        }

        this.trackEvent('performance', {
          category: performanceMarks.fid,
          value: entry.processingStart - entry.startTime,
          targetName: entry.name
        })

        observer.disconnect()
      })

      observer.observe({ type: performanceMarks.fid, buffered: true })
      this.observers.push(observer)
    } catch (error) {
      console.debug('[RUM] Unable to observe FID', error)
    }
  }

  private observeCumulativeLayoutShift(): void {
    if (!('PerformanceObserver' in window)) {
      return
    }

    try {
      let clsValue = 0

      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries() as LayoutShiftEntry[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        }

        this.trackEvent('performance', {
          category: performanceMarks.cls,
          value: Number(clsValue.toFixed(4))
        })
      })

      observer.observe({ type: performanceMarks.cls, buffered: true })
      this.observers.push(observer)
    } catch (error) {
      console.debug('[RUM] Unable to observe CLS', error)
    }
  }

  private getConnectionInfo(): RumEvent['connection'] {
    const nav = navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number } }
    const connection = nav.connection

    if (!connection) {
      return undefined
    }

    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      void this.flush()
    }, this.config.flushIntervalMs)
  }

  private generateSessionId(): string {
    return `rum_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }

  private createEventId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }
}

const ensureCollector = () => {
  if (!globalCollector) {
    globalCollector = new RumCollector()
  }
  return globalCollector
}

export const rumCollector = ensureCollector()

export const trackPageView = (page: string, additionalData: Record<string, unknown> = {}) => {
  rumCollector.trackEvent('pageview', {
    page,
    ...additionalData
  })
}

export const trackUserAction = (action: string, data: Record<string, unknown> = {}) => {
  rumCollector.trackEvent('interaction', {
    action,
    ...data
  })
}

export const trackError = (error: Error | string, context: Partial<RumErrorPayload> = {}) => {
  rumCollector.trackError({
    message: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    category: context.category ?? 'custom',
    severity: context.severity ?? 'medium',
    ...context
  })

  if (error instanceof Error) {
    recordError(error, 'rum.error')
  }
}

export const trackCustomMetric = (name: string, value: number, tags?: Record<string, string>) => {
  rumCollector.trackCustomMetric(name, value, tags)
}

export const createRumFetch = (collector: RumCollector = rumCollector) => {
  return async function rumFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const requestInit: RequestInit = {
      credentials: collector.getFetchCredentials(),
      ...init
    }

    let method = (requestInit.method ?? 'GET').toUpperCase()
    let url: string

    if (typeof input === 'string') {
      url = input
    } else if (input instanceof URL) {
      url = input.toString()
    } else {
      const request = input as Request
      url = request.url
      if (!requestInit.method) {
        method = request.method?.toUpperCase() ?? 'GET'
      }

      if (!requestInit.headers && request.headers) {
        requestInit.headers = request.headers
      }
    }

    const start = performance.now()

    try {
      const response = await traceApiCall(url, method, () => fetch(input, requestInit))

      collector.trackEvent('performance', {
        category: 'http',
        url,
        method,
        status: response.status,
        durationMs: performance.now() - start
      })

      return response
    } catch (error) {
      collector.trackError({
        message: error instanceof Error ? error.message : String(error),
        category: 'network',
        severity: 'high'
      })

      throw error
    }
  }
}

export const rumFetch = createRumFetch()

