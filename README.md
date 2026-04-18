# MetricsApp

> Status: pre-MVP. Active rebuild in progress. The repo currently focuses on a single, shippable
> deliverable: a **self-hosted observability sink** (logs + metrics + traces) with dashboards and
> alerts, similar in spirit to a small Datadog/Grafana installation.

## What ships in the MVP

- **Ingestion**
  - OTLP/HTTP endpoints for traces, metrics and logs (`POST /api/v1/ingest/otlp/{traces|metrics|logs}`).
    JSON is the supported wire format end-to-end. Protobuf is accepted only for `/traces`
    and forwarded as-is to Jaeger; `/metrics` and `/logs` return `415 Unsupported Media Type`
    on protobuf so senders fail loudly instead of silently dropping data.
  - Raw HTTP/JSON ingest API: `POST /api/v1/ingest/events` accepts a single `EventDto` or
    an array. Missing `Timestamp`, `TenantId`, `AppId`, `HostName` and `Ip` are filled in
    server-side. Max body size is 5 MB.
  - First-class .NET integration via `MetricsApp.Serilog.Sink`. Default `TargetEndpoint` is
    `events`, which posts to `/api/v1/ingest/events`. `otel` posts OTLP-shaped JSON to the
    OTLP logs endpoint instead.

  Run `pwsh ./scripts/ingest-smoke.ps1` to exercise every ingestion path against a running
  API (positive + negative cases).
- **Query + storage**
  - SQLite-backed repository for telemetry, dashboards and alert state.
  - In-process queue + cache (no external broker required).
- **UI**
  - React/Vite single-page app for dashboards, log search, trace explorer and alerts.
- **Deployment**
  - Single Docker Compose stack containing the API, WebUI and an embedded Jaeger UI for
    trace visualization.
- **Auth**
  - OIDC sign-in for Google and Microsoft accounts (admin-configured).

Anything not on that list (Redis cache, RabbitMQ queue, SQL Server / MySQL / Postgres
back-ends, plugin marketplace, multi-tenant org management, RUM, the broader
"federated data source" platform) is intentionally out of scope for the MVP and either
pruned, archived under `docs/archive/` or feature-flagged behind interfaces for later
work.

## Repository layout

| Project                                   | Role                                                               |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `MetricsApp.Api`                          | ASP.NET Core API: ingestion + query + dashboards + alerts.         |
| `MetricsApp.WebUI`                        | React/Vite frontend.                                               |
| `MetricsApp.AppHost`                      | .NET Aspire dev composition (API + Jaeger + WebUI).                |
| `MetricsApp.Worker`                       | Background workers that drain the ingestion queue into storage.    |
| `MetricsApp.Core` / `MetricsApp.Abstractions` | Shared models and interfaces.                                  |
| `MetricsApp.Queue.InMemory` / `Cache.InMemory` / `Repository.InMemory` | Default in-process implementations. |
| `MetricsApp.Parser.OpenTelemetry`         | OTLP payload parsing.                                              |
| `MetricsApp.Parser.WindowsPerfCounters`   | Windows perf counter parsing (used by the agent collector).        |
| `MetricsApp.Serilog.Sink`                 | Serilog sink for direct .NET integration.                          |
| `MetricsApp.Agent.*`                      | Optional out-of-process agent (HTTP/queue emitters + collectors).  |
| `MetricsApp.DataSources.*`                | External pull-based connectors (Prometheus, SQL, Sqlite, etc.).    |
| `MetricsApp.ServiceDefaults`              | Aspire-style shared host defaults (telemetry, health checks).      |

## Running locally

Prerequisites: .NET 9 SDK, Node.js 20+, Docker Desktop (for Jaeger).

```powershell
# From the repo root
dotnet run --project MetricsApp.AppHost
```

The Aspire dashboard prints URLs for the API, the WebUI (Vite dev server on port 3533) and
the Jaeger UI (port 16686).

To run only the WebUI against an already-running API:

```powershell
cd MetricsApp.WebUI
npm install
npm run dev
```

The frontend resolves the API base URL in this order: `VITE_API_BASE_URL`, the
Aspire-injected `services__metricsapp-api__https__0` / `__http__0` env vars, then the
current page origin's `/api/v1`.

## Documentation

- High-level milestone roadmap and prior design notes live under `docs/archive/`. They
  describe the previous, broader plugin/federated-datasource ambition and are kept for
  reference only — current work tracks the MVP scope above.
