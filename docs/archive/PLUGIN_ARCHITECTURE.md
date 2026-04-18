# MetricsApp Plugin Architecture

## Overview

MetricsApp uses a capability-based plugin system that allows extending the application with:
- **Data Sources** - Connect to external data stores (SQL Server, Prometheus, etc.)
- **Dashboards & Visualizations** - Custom dashboard panels and visualizations
- **Authentication Providers** - OAuth, SAML, LDAP, etc.
- **Alerting Channels** - Slack, PagerDuty, Email, Webhooks
- **Processors** - Data transformation and enrichment pipelines
- **Setup Wizards** - Initial configuration and onboarding flows

## Architecture Principles

### 1. Capability-Based Design
Plugins declare what capabilities they provide via interfaces. A single plugin can implement multiple capabilities:

```
┌─────────────────────────────────────────────────────────────┐
│                        Plugin                               │
├─────────────────────────────────────────────────────────────┤
│  IPlugin (required)                                         │
│  ├── IDataSourcePlugin (optional)                          │
│  ├── IDashboardPlugin (optional)                           │
│  ├── IAuthenticationPlugin (optional)                      │
│  ├── IAlertChannelPlugin (optional)                        │
│  └── IProcessorPlugin (optional)                           │
└─────────────────────────────────────────────────────────────┘
```

### 2. Separation of Concerns
- **Abstractions** (`MetricsApp.Abstractions`) - Core interfaces all plugins depend on
- **Plugin SDK** (`MetricsApp.Plugin.Sdk`) - Optional helpers, base classes, utilities
- **Frontend SDK** (`@metricsapp/plugin-sdk`) - React components and hooks for UI plugins

### 3. Dependency Management
Plugins can declare dependencies on other plugins. The PluginManager handles:
- Dependency resolution and load ordering
- Version compatibility checking
- Graceful degradation when optional dependencies are missing

### 4. Configuration-Driven
Each plugin defines its configuration schema, enabling:
- Auto-generated settings UI
- Validation
- Secure credential handling

## Plugin Manifest (manifest.json)

```json
{
  "manifest_version": "2.0.0",
  "plugin_id": "my-plugin",
  "name": "MyPlugin",
  "version": "1.0.0",
  "title": "My Awesome Plugin",
  "description": "Description of what this plugin does",
  
  "capabilities": ["datasource", "dashboard"],
  
  "author": {
    "name": "Your Name",
    "email": "you@example.com",
    "homepage": "https://github.com/you"
  },
  
  "repository": "https://github.com/you/my-plugin",
  "license": "MIT",
  
  "entry": {
    "assembly": "MyPlugin.dll",
    "frontend_bundle": "/plugins/my-plugin/bundle.js",
    "frontend_styles": "/plugins/my-plugin/styles.css"
  },
  
  "dependencies": {
    "plugins": {
      "core-datasource": ">=1.0.0",
      "optional-feature": { "version": ">=2.0.0", "optional": true }
    },
    "platform": {
      "metricsapp": ">=1.0.0"
    }
  },
  
  "exports": {
    "datasources": [
      {
        "type": "sqlserver",
        "displayName": "SQL Server",
        "description": "Microsoft SQL Server data source",
        "icon": "database"
      }
    ],
    "dashboardPanels": [
      {
        "type": "custom-chart",
        "displayName": "Custom Chart",
        "description": "A custom chart visualization"
      }
    ],
    "routes": [
      {
        "path": "/setup/my-plugin",
        "component": "SetupWizard"
      }
    ]
  },
  
  "settings": {
    "schema": {
      "type": "object",
      "properties": {
        "apiKey": {
          "type": "string",
          "title": "API Key",
          "description": "Your API key",
          "secret": true
        },
        "maxRetries": {
          "type": "integer",
          "title": "Max Retries",
          "default": 3
        }
      }
    }
  },
  
  "permissions": [
    "datasources:read",
    "datasources:write",
    "dashboards:read"
  ],
  
  "assets": {
    "dashboards": ["assets/dashboards/*.json"],
    "alerts": ["assets/alerts/*.json"],
    "icons": {
      "light": "assets/icon-light.svg",
      "dark": "assets/icon-dark.svg"
    }
  }
}
```

## Plugin Types and Capabilities

### Data Source Plugins

Data source plugins connect MetricsApp to external data stores.

```csharp
public interface IDataSourcePlugin : IPluginCapability
{
    string DataSourceType { get; }
    string DisplayName { get; }
    string Description { get; }
    string IconName { get; }
    
    IDataSource CreateDataSource(IServiceProvider services);
    DataSourceConfigurationSchema GetConfigurationSchema();
    Task<DataSourceTestResult> TestConnectionAsync(DataSourceConfiguration config, CancellationToken ct);
}
```

**When to use**: Bundle as a plugin when you want:
- Self-contained deployment
- Independent versioning
- Custom UI for configuration
- To distribute externally

**When to keep separate**: Keep as a library when:
- It's a core, always-included data source
- Other plugins depend on it directly
- Performance is critical (avoid assembly loading overhead)

### Dashboard Plugins

Dashboard plugins provide custom visualizations and panels.

```csharp
public interface IDashboardPlugin : IPluginCapability
{
    IEnumerable<PanelTypeDefinition> GetPanelTypes();
    IEnumerable<DashboardTemplate> GetDashboardTemplates();
}
```

### Authentication Plugins

Add new authentication providers.

```csharp
public interface IAuthenticationPlugin : IPluginCapability
{
    string ProviderId { get; }
    string ProviderName { get; }
    AuthConfigurationSchema GetConfigurationSchema();
    Task<IAuthenticationHandler> CreateHandlerAsync(AuthConfiguration config);
}
```

### Alert Channel Plugins

Add notification channels for alerts.

```csharp
public interface IAlertChannelPlugin : IPluginCapability
{
    string ChannelType { get; }
    string DisplayName { get; }
    AlertChannelConfigSchema GetConfigurationSchema();
    Task SendAlertAsync(AlertNotification alert, AlertChannelConfig config, CancellationToken ct);
}
```

### Setup Plugins

Provide setup wizards and initial configuration flows.

```csharp
public interface ISetupPlugin : IPluginCapability
{
    int Order { get; }
    bool IsRequired { get; }
    string SetupRoute { get; }
    Task<SetupStatus> GetStatusAsync();
    Task CompleteSetupAsync(SetupContext context);
}
```

## Creating a Plugin

### 1. Project Structure

```
MyPlugin/
├── manifest.json
├── MyPlugin.csproj
├── MyPlugin.cs              # Main plugin class
├── DataSource/
│   └── MyDataSource.cs      # IDataSource implementation
├── Frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── index.tsx        # Plugin entry point
│       ├── components/
│       └── hooks/
└── assets/
    ├── dashboards/
    └── icons/
```

### 2. Backend Implementation

```csharp
using MetricsApp.Abstractions.Plugins;

namespace MyPlugin;

public class MyPlugin : PluginBase, IDataSourcePlugin, IDashboardPlugin
{
    public override string Id => "my-plugin";
    public override string Name => "My Plugin";
    public override string Version => "1.0.0";
    
    // IDataSourcePlugin
    public string DataSourceType => "mydata";
    public string DisplayName => "My Data Source";
    public string Description => "Connect to MyData";
    public string IconName => "database";
    
    public IDataSource CreateDataSource(IServiceProvider services)
    {
        return new MyDataSource(services.GetRequiredService<ILogger<MyDataSource>>());
    }
    
    public DataSourceConfigurationSchema GetConfigurationSchema()
    {
        return new DataSourceConfigurationSchema
        {
            Fields = new List<ConfigurationField>
            {
                new() { Name = "endpoint", Label = "Endpoint", Type = ConfigurationFieldType.Text, Required = true }
            }
        };
    }
    
    // IDashboardPlugin
    public IEnumerable<PanelTypeDefinition> GetPanelTypes()
    {
        yield return new PanelTypeDefinition
        {
            Type = "my-chart",
            DisplayName = "My Custom Chart",
            Description = "A specialized visualization"
        };
    }
    
    public override void ConfigureServices(IServiceCollection services, IConfiguration config)
    {
        services.AddScoped<MyDataSource>();
    }
}
```

### 3. Frontend Implementation

```tsx
// Frontend/src/index.tsx
import { PluginSDK, registerPlugin } from '@metricsapp/plugin-sdk';

// Data source configuration component
function MyDataSourceConfig({ config, onChange, onTest }) {
  return (
    <div className="space-y-4">
      <PluginSDK.FormField
        name="endpoint"
        label="Endpoint URL"
        value={config.endpoint}
        onChange={(v) => onChange({ ...config, endpoint: v })}
        required
      />
      <button onClick={onTest}>Test Connection</button>
    </div>
  );
}

// Custom dashboard panel
function MyChartPanel({ data, options }) {
  return (
    <div className="my-chart">
      {/* Custom visualization */}
    </div>
  );
}

// Register the plugin
registerPlugin({
  id: 'my-plugin',
  
  datasourceConfig: {
    'mydata': MyDataSourceConfig
  },
  
  panels: {
    'my-chart': MyChartPanel
  },
  
  routes: [
    { path: '/my-plugin/settings', component: MyPluginSettings }
  ]
});
```

### 4. Build Configuration

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { metricsAppPlugin } from '@metricsapp/vite-plugin';

export default defineConfig({
  plugins: [react(), metricsAppPlugin()],
  build: {
    lib: {
      entry: 'src/index.tsx',
      name: 'MyPlugin',
      fileName: 'my-plugin.bundle',
      formats: ['umd']
    },
    rollupOptions: {
      external: ['react', 'react-dom', '@metricsapp/plugin-sdk'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@metricsapp/plugin-sdk': 'MetricsAppPluginSDK'
        }
      }
    }
  }
});
```

## Plugin Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│                    Plugin Lifecycle                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Discovery                                                │
│     └── PluginManager scans /Plugins folder                  │
│     └── Reads manifest.json files                            │
│                                                              │
│  2. Dependency Resolution                                    │
│     └── Build dependency graph                               │
│     └── Detect circular dependencies                         │
│     └── Determine load order                                 │
│                                                              │
│  3. Loading                                                  │
│     └── Load assemblies via AssemblyLoadContext             │
│     └── Instantiate plugin classes                           │
│     └── Call OnLoad() lifecycle hook                         │
│                                                              │
│  4. Registration                                             │
│     └── ConfigureServices() for DI                          │
│     └── Register capabilities with managers                  │
│     └── Call OnInitialize() lifecycle hook                   │
│                                                              │
│  5. Runtime                                                  │
│     └── Plugin is active and serving requests               │
│     └── Can be enabled/disabled dynamically                  │
│                                                              │
│  6. Shutdown                                                 │
│     └── Call OnShutdown() lifecycle hook                    │
│     └── Dispose resources                                    │
│     └── Unload assembly context                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Best Practices

### 1. Keep Plugins Focused
Each plugin should do one thing well. If you find yourself adding unrelated features, consider splitting into multiple plugins.

### 2. Use Dependencies Wisely
- Declare dependencies explicitly in the manifest
- Mark optional dependencies as such
- Handle missing optional dependencies gracefully

### 3. Follow the Configuration Schema
- Define all configurable options in the schema
- Mark sensitive fields as `secret: true`
- Provide sensible defaults
- Include validation rules

### 4. Provide Good UX
- Include helpful descriptions
- Implement connection testing
- Show clear error messages
- Provide default dashboards/templates

### 5. Consider Performance
- Lazy-load heavy resources
- Cache where appropriate
- Don't block startup with slow operations

## Migration from Separate Projects

If you have existing data sources as separate projects (like `MetricsApp.DataSources.SqlServer`), you can:

### Option A: Convert to Plugin
1. Create a manifest.json
2. Implement `IPlugin` and relevant capabilities
3. Move to /Plugins folder

### Option B: Keep as Library + Create Plugin Wrapper
1. Keep the core implementation as a library
2. Create a thin plugin that wraps it
3. Allows both plugin and direct usage

### Option C: Register as Built-in
Keep critical data sources registered directly in `Program.cs` for:
- Core functionality that must always be available
- Performance-critical integrations
- Dependencies shared by multiple plugins

## FAQ

**Q: Should data sources be plugins or libraries?**

A: It depends on your use case:
- **Plugins**: External distribution, optional installation, isolated versioning
- **Libraries**: Core functionality, performance-critical, shared dependencies

**Q: Can a plugin depend on a library?**

A: Yes! Use the `dependencies.nuget` section for NuGet packages.

**Q: How do I share code between plugins?**

A: Create a shared library and add it as a NuGet dependency, or use the Plugin SDK.

**Q: How do I debug a plugin?**

A: Set the plugin project as a dependency of the main API project during development, then copy to /Plugins for production.

