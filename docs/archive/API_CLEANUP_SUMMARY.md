# MetricsApp API Cleanup & OpenTelemetry Integration Summary

## Overview
This document tracks the consolidation work that makes the MetricsApp API the single OpenTelemetry collector and query surface for the solution. The goals were to remove duplicate controllers, align route naming, and minimise custom protocol payloads in favour of the standard OTLP contract.

## Completed Changes
### API Surface
- Retired `QueryController` and folded its behaviour into `TelemetryController`.
- Normalised routes under the `api/v1` prefix using consistent nouns (`/telemetry`, `/ingest/otlp`, `/integrations/jaeger`).
- Scoped Jaeger proxy features (`services`, `traces`, `operations`, etc.) under `/api/v1/integrations/jaeger/*`.
- Marked `MetricsController` as legacy-only (Windows performance counters) and left it disabled by default.

### OTLP Ingestion
- `OtelController` now exposes canonical OTLP entry points:
  - `POST /api/v1/ingest/otlp/traces`
  - `POST /api/v1/ingest/otlp/metrics`
  - `POST /api/v1/ingest/otlp/logs`
  - `GET  /api/v1/ingest/otlp/health`
  - `GET  /api/v1/ingest/otlp/debug/stats`
- Supports JSON or protobuf payloads, extracts service/resource metadata, and forwards data into the internal queue pipeline. Optional Jaeger forwarding continues to work when `Jaeger:QueryUrl` is configured.

### Telemetry Query API
- `TelemetryController` owns the query surface consumed by the Web UI and external clients:
  - `GET /api/v1/telemetry/metrics` with optional `query`, `metricNames`, `step`, `aggregator`, and `limit` parameters.
  - `GET /api/v1/telemetry/metrics/metadata` for discoverability.
  - `GET /api/v1/telemetry/logs`, `GET /api/v1/telemetry/traces`, `GET /api/v1/telemetry/health`, and `GET /api/v1/telemetry/stats`.
- Adds cache-key normalisation and time-range aware responses so callers always receive the requested time window when repository data is sparse.

### Frontend & Client Updates
- Web UI libraries (`telemetry.ts`, `api-with-tracing.ts`, RUM collector, dashboards, etc.) call the new endpoints exclusively.
- Node-based smoke tests (`test-otlp-api.js`) target the cleaned routes.
- Serilog helper projects now default to OTLP ingestion URLs instead of bespoke collectors.

### Hosting (Aspire AppHost)
- The Aspire host provisions only the resources required for the in-process collector (SQL Server, Redis cache, RabbitMQ queue, Prometheus for optional scraping) and no longer attempts to stand up a separate Jaeger instance by default.

### Documentation
- Updated migration notes (`OPENTELEMETRY_MIGRATION_PLAN.md`, `OPENTELEMETRY_MIGRATION_SUMMARY.md`, this file) describe the new endpoints and deprecations.

## Current API Map
```
/api/v1/ingest/otlp
    +-- POST traces
    +-- POST metrics
    +-- POST logs
    +-- GET  health
    +-- GET  debug/stats

/api/v1/telemetry
    +-- GET metrics
    �     +- query, metricNames[], step, aggregator, limit
    �     +- caches per time range + query hash
    +-- GET metrics/metadata
    +-- GET logs
    +-- GET traces
    +-- GET health
    +-- GET stats

/api/v1/integrations/jaeger
    +-- GET services
    +-- GET traces
    +-- GET operations
    +-- GET trace/{traceId}
    +-- POST sample-trace
```

Other controllers (`DataSourcesController`, `PluginsController`) retain their existing admin-focused endpoints.

## Latest Cleanup (December 2025)

### Frontend API Alignment
- Fixed `api.ts` to correctly parse TelemetryController response format (`data.metrics` instead of `data.result`)
- Updated `getMetricsSummary()` to use `/api/v1/telemetry/stats` endpoint (was incorrectly calling non-existent `/api/v1/metrics/summary`)
- Frontend now properly handles `TelemetryMetricsResponse` structure with `metrics[]` array containing `samples[]`

### Controller Cleanup
- Fixed `PluginsController` route prefix from `/api/[controller]` to `/api/v1/[controller]` for consistency
- Deleted `MetricsController.cs` (was fully commented out legacy Windows performance counter code)

### Current Active Controllers
| Controller | Route Prefix | Purpose |
|------------|--------------|---------|
| `TelemetryController` | `/api/v1/telemetry` | Query metrics, logs, traces, stats |
| `OtelController` | `/api/v1/ingest/otlp` | OTLP ingestion (traces, metrics, logs) |
| `JaegerController` | `/api/v1/integrations/jaeger` | Jaeger proxy integration |
| `DataSourcesController` | `/api/v1/datasources` | Data source management |
| `PluginsController` | `/api/v1/plugins` | Plugin management |

## Next Steps
1. Exercise the new ingestion path with live telemetry and monitor queue throughput.
2. Flesh out Telemetry metrics metadata (last-seen timestamps, sample counts) once repository support is available.
3. Add authentication/authorisation to collector and query endpoints.
4. Expand automated smoke tests to cover log/trace queries end-to-end.
5. Fix remaining TypeScript lint errors in WebUI (unused imports, telemetry.ts provider issue).

## Testing
- Verified: `dotnet build MetricsApp.Api` succeeds with only warnings (no errors).
- Verified: `api.ts` passes TypeScript type checking.
- Pending: Full `npm run build` blocked by pre-existing TypeScript errors in other files.
