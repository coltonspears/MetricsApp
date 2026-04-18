# Project Restructure Plan for MetricsApp

## Goals
- **Separation of Concerns:** Clearly distinguish between data persistence (storage) and data sources (external systems).
- **Plugin Architecture:** Enable plugins/integrations for both data sources and persistence layers, with manifests describing their capabilities.
- **Flexible Persistence:** Allow users to choose (and easily swap) between different databases/caches (e.g., SQL Server, Postgres, InfluxDB, Redis, etc.) via plugins.
- **API as Gateway:** All frontend persistence must go through the API, which abstracts the underlying datastore.
- **Extensibility:** Make it easy to add new plugins (data sources, dashboards, persistence) with minimal friction.
- **Initial Setup:** Provide a setup process to select/install default plugins.

---

## Proposed Directory Structure

```
/Core
  IDataRepository.cs
  IDataSource.cs
  IPlugin.cs
  PluginManifest.cs
/Persistence
  /SqlServer
    SqlServerRepository.cs
    manifest.json
  /Postgres
    PostgresRepository.cs
    manifest.json
  /InfluxDb
    InfluxDbRepository.cs
    manifest.json
  ...
/DataSources
  /Prometheus
    PrometheusDataSource.cs
    manifest.json
  /WindowsPerfCounters
    WindowsPerfCounterDataSource.cs
    manifest.json
  ...
/Plugins
  (Symlinks or wrappers for DataSources and Persistence plugins)
/Dashboards
  default-overview.json
/WebUI
  ...
/Api
  ...
/Common
  ...
/Setup
  install-plugins.ps1
  install-plugins.sh
  setup-wizard.md
```

---

## Key Concepts

### 1. **Persistence Plugins**
- Each persistence backend (SQL Server, Postgres, etc.) is a plugin implementing `IDataRepository`.
- Each has a manifest describing its capabilities, requirements, and configuration.
- The API loads the selected persistence plugin at runtime (via config or setup wizard).
- Example: `Persistence/SqlServer/manifest.json`

### 2. **Data Source Plugins**
- Each data source (Prometheus, Windows Perf, etc.) is a plugin implementing `IDataSource`.
- Manifest describes what metrics/logs/events it provides.
- Example: `DataSources/Prometheus/manifest.json`

### 3. **Plugin Loader**
- At startup, the app scans `/Persistence` and `/DataSources` for plugins and loads their manifests.
- Preinstalled plugins are included in the repo; others can be installed via scripts or setup wizard.

### 4. **API as Gateway**
- All data persistence from the frontend goes through the API.
- The API uses the selected `IDataRepository` implementation (plugin) for all storage operations.
- Data sources are polled or queried by the API/backend, not the frontend directly.

### 5. **Setup Process**
- On first run, a setup wizard (CLI or web) prompts the user to select/install persistence and data source plugins.
- Scripts (`install-plugins.ps1`, `install-plugins.sh`) automate plugin installation.
- Config file (e.g., `appsettings.json`) stores the selected persistence backend.

---

## Implementation Thoughts
- **Interfaces:** All core interfaces live in `/Core` for easy reference and to avoid circular dependencies.
- **Plugin Discovery:** Use reflection or a simple manifest loader to find and register plugins at runtime.
- **Configuration:** Use environment variables or config files for plugin-specific settings (connection strings, etc.).
- **Security:** Never store secrets in source control; use environment variables or secret managers.
- **Extensibility:** New plugins can be dropped into `/Persistence` or `/DataSources` and registered via manifest.
- **Testing:** Provide mock/fake plugins for testing and development.
- **Documentation:** Each plugin should have a README and manifest.

---

## Next Steps
1. Refactor interfaces and move to `/Core`.
2. Move existing data source and persistence implementations to `/DataSources` and `/Persistence`.
3. Create plugin manifests for each.
4. Implement plugin loader in API/backend.
5. Build setup wizard/scripts.
6. Update documentation.

---

## Open Questions
- How to handle plugin dependencies (e.g., a plugin requiring another plugin)?
- Should plugins be NuGet packages, simple folders, or both?
- How to handle migrations/updates for persistence plugins?
- How to support custom dashboards and UI extensions from plugins?

---

*This plan is a living document and should be updated as the implementation progresses.* 