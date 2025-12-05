import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch'
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request'
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction'
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load'
import { trace, SpanStatusCode, Span, SpanKind } from '@opentelemetry/api'

type Attributes = Record<string, any>

const OTEL_COLLECTOR_URL = import.meta.env.VITE_OTEL_COLLECTOR_URL ?? '/api/v1/ingest/otlp/traces'
const SERVICE_NAME = import.meta.env.VITE_OTEL_SERVICE_NAME ?? 'metricsapp-webui'
const SERVICE_VERSION = import.meta.env.VITE_OTEL_SERVICE_VERSION ?? '1.1.0'

let isInitialized = false
let provider: WebTracerProvider | undefined

export function initializeTelemetry() {
  if (isInitialized) {
    console.warn('OpenTelemetry already initialized')
    return
  }

  try {
    const traceExporter = new OTLPTraceExporter({
      url: OTEL_COLLECTOR_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const resource = defaultResource().merge(
      resourceFromAttributes({
        [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
        [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
        [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'metricsapp',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: import.meta.env.MODE || 'development'
      })
    )

    const tracerProvider = new WebTracerProvider({
      resource
    })

    // TypeScript types for WebTracerProvider may not include addSpanProcessor directly
    // but it exists on the prototype from BasicTracerProvider
    ;(tracerProvider as any).addSpanProcessor(new SimpleSpanProcessor(traceExporter))

    tracerProvider.register()

    provider = tracerProvider

    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          propagateTraceHeaderCorsUrls: [
            /^https?:\/\/localhost.*\/api\/.*/,
            /^https?:\/\/.*\.metricsapp\.local.*\/api\/.*/
          ],
          clearTimingResources: true
        }),
        new XMLHttpRequestInstrumentation({
          propagateTraceHeaderCorsUrls: [
            /^https?:\/\/localhost.*\/api\/.*/,
            /^https?:\/\/.*\.metricsapp\.local.*\/api\/.*/
          ]
        }),
        new UserInteractionInstrumentation({
          eventNames: ['click', 'submit', 'keydown']
        }),
        new DocumentLoadInstrumentation()
      ]
    })

    isInitialized = true
    console.log('OpenTelemetry initialized for MetricsApp WebUI')

    window.addEventListener('unhandledrejection', event => {
      recordError(event.reason, 'unhandled_promise_rejection')
    })

    window.addEventListener('error', event => {
      recordError(event.error ?? event.message, 'unhandled_error')
    })
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error)
  }
}

export async function shutdownTelemetry(): Promise<void> {
  if (!isInitialized) {
    return
  }

  isInitialized = false

  if (provider) {
    try {
      await provider.shutdown()
    } catch (error) {
      console.warn('Failed to shutdown OpenTelemetry provider', error)
    } finally {
      provider = undefined
    }
  }

  console.log('OpenTelemetry shut down')
}

interface TraceAsyncOptions {
  attributes?: Attributes
  spanKind?: SpanKind
}

export async function traceAsync<T>(
  name: string,
  operation: (span: Span) => T | Promise<T>,
  options: TraceAsyncOptions = {}
): Promise<T> {
  const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION)

  return tracer.startActiveSpan(name, { kind: options.spanKind ?? SpanKind.INTERNAL }, async span => {
    try {
      if (options.attributes) {
        span.setAttributes(options.attributes)
      }

      const result = await operation(span)
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

export async function traceApiCall<T>(
  url: string,
  method: string,
  apiCall: () => Promise<T>,
  attributes: Attributes = {}
): Promise<T> {
  const lowerMethod = method.toLowerCase()
  const baseAttributes: Attributes = {
    'http.method': lowerMethod,
    'http.url': url,
    ...attributes
  }

  const start = performance.now()

  return traceAsync(
    `http.${lowerMethod}`,
    async span => {
      span.setAttributes(baseAttributes)
      try {
        const result = await apiCall()
        span.setAttribute('http.duration_ms', performance.now() - start)
        span.setAttribute('http.success', true)
        return result
      } catch (error) {
        span.setAttribute('http.duration_ms', performance.now() - start)
        span.setAttribute('http.success', false)
        span.setAttribute('http.error', error instanceof Error ? error.message : String(error))
        throw error
      }
    },
    { spanKind: SpanKind.CLIENT }
  )
}

export function traceRouteChange(routeName: string, additionalAttributes: Attributes = {}) {
  const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION)
  const span = tracer.startSpan('route.change', { kind: SpanKind.INTERNAL })

  span.setAttributes({
    'route.name': routeName,
    'navigation.type': 'spa',
    ...additionalAttributes
  })

  setTimeout(() => {
    span.end()
  }, 100)
}

export function addSpanAttribute(key: string, value: string | number | boolean) {
  const activeSpan = trace.getActiveSpan()
  if (activeSpan) {
    activeSpan.setAttribute(key, value)
  }
}

export function addSpanEvent(name: string, attributes?: Attributes) {
  const activeSpan = trace.getActiveSpan()
  if (activeSpan) {
    activeSpan.addEvent(name, attributes)
  }
}

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
    'error.stack': error instanceof Error ? error.stack : undefined
  })

  if (error instanceof Error) {
    span.recordException(error)
  }

  span.end()
}

export const tracedFetch = async (url: string, options?: RequestInit) => {
  const method = options?.method ?? 'GET'
  return traceApiCall(url, method, () => fetch(url, options))
}








