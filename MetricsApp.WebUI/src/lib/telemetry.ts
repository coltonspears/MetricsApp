import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request'
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction'
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load'
import { trace, SpanStatusCode, Span } from '@opentelemetry/api'

// Configuration
const OTEL_COLLECTOR_URL = import.meta.env.VITE_OTEL_COLLECTOR_URL || 'http://localhost:4318/v1/traces'
const SERVICE_NAME = 'metricsapp-webui'
const SERVICE_VERSION = '1.0.0'

let isInitialized = false

export function initializeTelemetry() {
  if (isInitialized) {
    console.warn('OpenTelemetry already initialized')
    return
  }

  try {
    // Create OTLP trace exporter
    const traceExporter = new OTLPTraceExporter({
      url: OTEL_COLLECTOR_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Create resource
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
        [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'metricsapp',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: import.meta.env.MODE || 'development',
      })
    )

    // Create tracer provider
    const provider = new WebTracerProvider({
      resource,
    })

    // Add span processor
    provider.addSpanProcessor(new BatchSpanProcessor(traceExporter, {
      maxQueueSize: 1000,
      scheduledDelayMillis: 5000,
    }))

    // Register the provider globally
    provider.register({
      // Disable existing registered providers (if any)
      diag: undefined,
    })

    // Register auto-instrumentations
    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          propagateTraceHeaderCorsUrls: [
            /^https?:\/\/localhost.*\/api\/.*/,
            /^https?:\/\/.*\.metricsapp\.local.*\/api\/.*/,
          ],
          clearTimingResources: true,
        }),
        new XMLHttpRequestInstrumentation({
          propagateTraceHeaderCorsUrls: [
            /^https?:\/\/localhost.*\/api\/.*/,
            /^https?:\/\/.*\.metricsapp\.local.*\/api\/.*/,
          ],
        }),
        new UserInteractionInstrumentation({
          eventNames: ['click', 'submit', 'keydown'],
        }),
        new DocumentLoadInstrumentation(),
      ],
    })

    isInitialized = true
    console.log('✅ OpenTelemetry initialized successfully')

    // Add basic error tracking
    window.addEventListener('unhandledrejection', (event) => {
      recordError(event.reason, 'unhandled_promise_rejection')
    })

    window.addEventListener('error', (event) => {
      recordError(event.error, 'unhandled_error')
    })

  } catch (error) {
    console.error('❌ Failed to initialize OpenTelemetry:', error)
  }
}

export function shutdownTelemetry() {
  // Note: Web SDK doesn't have a direct shutdown method
  // The provider will be cleaned up when the page unloads
  isInitialized = false
  console.log('OpenTelemetry shut down')
}

// Manual span creation
export async function createSpan<T>(
  name: string, 
  callback: (span: Span) => T | Promise<T>
): Promise<T> {
  const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION)
  
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await callback(span)
      span.setStatus({ code: SpanStatusCode.OK })
      return result
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : String(error)
      })
      span.recordException(error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      span.end()
    }
  })
}

// Error recording
export function recordError(error: any, errorType: string = 'unknown') {
  const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION)
  const span = tracer.startSpan(`error.${errorType}`)
  
  span.setStatus({ 
    code: SpanStatusCode.ERROR,
    message: error instanceof Error ? error.message : String(error)
  })
  
  span.setAttributes({
    'error.type': errorType,
    'error.message': error instanceof Error ? error.message : String(error),
    'error.stack': error instanceof Error ? error.stack : undefined,
  })
  
  if (error instanceof Error) {
    span.recordException(error)
  }
  
  span.end()
}

// Helper functions
export function addSpanAttribute(key: string, value: string | number | boolean) {
  const activeSpan = trace.getActiveSpan()
  if (activeSpan) {
    activeSpan.setAttribute(key, value)
  }
}

export function addSpanEvent(name: string, attributes?: Record<string, any>) {
  const activeSpan = trace.getActiveSpan()
  if (activeSpan) {
    activeSpan.addEvent(name, attributes)
  }
}

// Route change tracing
export function traceRouteChange(routeName: string, additionalAttributes?: Record<string, any>) {
  const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION)
  const span = tracer.startSpan('route.change')
  
  span.setAttributes({
    'route.name': routeName,
    'navigation.type': 'spa',
    ...additionalAttributes,
  })
  
  setTimeout(() => {
    span.end()
  }, 100)
}

// API call tracing helper
export async function traceApiCall<T>(
  name: string, 
  apiCall: () => Promise<T>, 
  additionalAttributes?: Record<string, any>
): Promise<T> {
  return createSpan(`api.${name}`, async (span) => {
    if (additionalAttributes) {
      span.setAttributes(additionalAttributes)
    }
    
    const startTime = performance.now()
    try {
      const result = await apiCall()
      const duration = performance.now() - startTime
      
      span.setAttributes({
        'api.duration_ms': duration,
        'api.success': true,
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      span.setAttributes({
        'api.duration_ms': duration,
        'api.success': false,
        'api.error': error instanceof Error ? error.message : String(error),
      })
      
      throw error
    }
  })
} 