# MetricsApp Plugin Development Guide

This guide walks you through creating plugins for MetricsApp, from simple data sources to complex multi-capability plugins.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Plugin Structure](#plugin-structure)
3. [Capability Types](#capability-types)
4. [Frontend Development](#frontend-development)
5. [Manifest Reference](#manifest-reference)
6. [Dependencies](#dependencies)
7. [Testing Your Plugin](#testing-your-plugin)
8. [Best Practices](#best-practices)
9. [Examples](#examples)

---

## Quick Start

### 1. Create from Template

```bash
# Copy the template
cp -r templates/plugin-template MyPlugin

# Rename files and update namespaces
cd MyPlugin
# Update manifest.json, *.csproj, and *.cs files with your plugin name
```

### 2. Implement Your Plugin

```csharp
public class MyPlugin : PluginBase, IDataSourceCapability
{
    public override string Id => "my-plugin";
    public override string Name => "MyPlugin";
    public override string Version => "1.0.0";
    
    // Implement IDataSourceCapability...
}
```

### 3. Build and Deploy

```bash
# Build the plugin
dotnet build -c Release

# Copy to plugins folder
cp -r bin/Release/net9.0/* ../MetricsApp.Api/bin/Debug/net9.0/Plugins/my-plugin/
```

---

## Plugin Structure

```
MyPlugin/
├── manifest.json           # Plugin metadata and configuration
├── MyPlugin.csproj         # Project file
├── MyPlugin.cs             # Main plugin class
├── [Capability].cs         # Capability implementations
├── Frontend/               # React frontend (if needed)
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── index.tsx       # Entry point
│       └── components/
└── assets/                 # Static assets
    ├── dashboards/
    ├── alerts/
    └── icons/
```

---

## Capability Types

Plugins declare functionality through capability interfaces. A single plugin can implement multiple capabilities.

### Data Source Capability

Connect MetricsApp to external data stores.

```csharp
public class MyPlugin : PluginBase, IDataSourceCapability
{
    // Metadata
    public string DataSourceType => "mydata";
    public string DisplayName => "My Data Source";
    public string Description => "Connect to MyData service";
    public string IconName => "database";
    public IReadOnlyList<string> Categories => new[] { "database", "metrics" };

    // Create instance
    public IDataSource CreateDataSource(IServiceProvider services)
    {
        return new MyDataSource(services.GetRequiredService<ILogger<MyDataSource>>());
    }

    // Configuration schema (auto-generates UI)
    public DataSourceConfigurationSchema GetConfigurationSchema()
    {
        return new DataSourceConfigurationSchema
        {
            Fields = new List<ConfigurationField>
            {
                new() { Name = "endpoint", Label = "Endpoint", Type = ConfigurationFieldType.Text, Required = true },
                new() { Name = "apiKey", Label = "API Key", Type = ConfigurationFieldType.Password, Required = true },
            }
        };
    }

    // Test connection
    public async Task<DataSourceTestResult> TestConnectionAsync(
        DataSourceConfiguration config, IServiceProvider services, CancellationToken ct)
    {
        // Validate and test connection
        return DataSourceTestResult.Success(125, "Connected!");
    }
}
```

### Dashboard Capability

Provide custom visualizations and dashboard templates.

```csharp
public class MyPlugin : PluginBase, IDashboardCapability
{
    public IEnumerable<PanelTypeDefinition> GetPanelTypes()
    {
        yield return new PanelTypeDefinition
        {
            Type = "my-chart",
            DisplayName = "My Custom Chart",
            ConfigurationSchema = new PanelConfigurationSchema
            {
                Fields = new List<PanelConfigField>
                {
                    new() { Name = "chartType", Label = "Chart Type", Type = "select" }
                }
            }
        };
    }

    public IEnumerable<DashboardTemplate> GetDashboardTemplates()
    {
        yield return new DashboardTemplate
        {
            Id = "my-overview",
            Name = "My Overview Dashboard",
            JsonDefinition = "{ ... }"
        };
    }
}
```

### Authentication Capability

Add authentication providers (OAuth, SAML, LDAP, etc.).

```csharp
public class MyPlugin : PluginBase, IAuthenticationCapability
{
    public string ProviderId => "my-oauth";
    public string ProviderName => "My OAuth Provider";
    
    public AuthConfigurationSchema GetConfigurationSchema() { ... }
    
    public async Task<IAuthenticationHandler> CreateHandlerAsync(
        AuthProviderConfiguration config, IServiceProvider services, CancellationToken ct)
    {
        return new MyOAuthHandler(config);
    }
}
```

### Alert Channel Capability

Add notification channels for alerts.

```csharp
public class MyPlugin : PluginBase, IAlertChannelCapability
{
    public string ChannelType => "my-channel";
    public string DisplayName => "My Notification Channel";
    
    public async Task<AlertSendResult> SendAlertAsync(
        AlertNotification alert, AlertChannelConfiguration config, CancellationToken ct)
    {
        // Send notification
        return new AlertSendResult { Success = true };
    }
}
```

### Setup Capability

Provide setup wizards and configuration flows.

```csharp
public class MyPlugin : PluginBase, ISetupCapability
{
    public string SetupId => "my-setup";
    public int Order => 10;
    public bool IsRequired => false;
    public string SetupRoute => "/setup/my-plugin";
    
    public async Task<SetupStatus> GetStatusAsync(IServiceProvider services, CancellationToken ct)
    {
        // Check if setup is complete
    }
    
    public async Task<SetupResult> CompleteSetupAsync(SetupContext context, IServiceProvider services, CancellationToken ct)
    {
        // Perform setup
    }
}
```

### Route Capability

Add custom pages/routes to the application.

```csharp
public class MyPlugin : PluginBase, IRouteCapability
{
    public IEnumerable<PluginRoute> GetRoutes()
    {
        yield return new PluginRoute
        {
            Path = "/my-plugin/settings",
            ComponentName = "SettingsPage",
            Title = "My Plugin Settings"
        };
    }
    
    public IEnumerable<NavigationItem> GetNavigationItems()
    {
        yield return new NavigationItem
        {
            Id = "my-plugin-nav",
            Label = "My Plugin",
            Path = "/my-plugin",
            Section = "main",
            IconName = "puzzle"
        };
    }
}
```

---

## Frontend Development

### Plugin SDK

Use the `@metricsapp/plugin-sdk` to build React UIs:

```tsx
import { 
  registerPlugin,
  usePluginContext,
  useDataSourceConfig,
  FormField,
  Card,
  Button 
} from '@metricsapp/plugin-sdk';

registerPlugin({
  id: 'my-plugin',
  version: '1.0.0',
  
  datasourceConfig: {
    'mydata': MyDataSourceConfig
  },
  
  panels: {
    'my-chart': MyChartPanel
  }
});
```

### Hooks

```tsx
// Access plugin context
const { pluginId, manifest, api, theme, user } = usePluginContext();

// Manage data source config
const { config, updateConfig, testConnection, errors } = useDataSourceConfig(initialConfig);

// Execute queries
const { data, loading, error } = useQuery({ dataSourceId, query, timeRange });

// Manage time ranges
const { timeRange, setRelativeRange } = useTimeRange();

// Plugin settings
const { settings, updateSettings, save, saving } = usePluginSettings(defaults);

// Check permissions
const canWrite = usePermission('datasources:write');
```

### Components

```tsx
// Form components
<FormField field={fieldDef} value={value} onChange={onChange} error={error} />
<FormSection title="Connection" description="Configure connection settings">
  {/* fields */}
</FormSection>

// UI components
<Card><CardHeader title="Title" /><CardContent>...</CardContent></Card>
<Button variant="primary" loading={saving}>Save</Button>
<Alert type="success">Saved!</Alert>
<StatusBadge status="connected" />
<ConnectionTest onTest={handleTest} />
<LoadingSpinner size="md" />
<EmptyState title="No data" action={<Button>Add Data</Button>} />
```

### Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
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

---

## Manifest Reference

### Full Schema (v2.0.0)

```json
{
  "manifest_version": "2.0.0",
  "plugin_id": "my-plugin",
  "name": "MyPlugin",
  "version": "1.0.0",
  "title": "My Plugin",
  "description": "Plugin description",
  
  "capabilities": ["datasource", "dashboard"],
  "tags": ["database", "metrics"],
  
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
      "required-plugin": ">=1.0.0",
      "optional-plugin": { "version": ">=2.0.0", "optional": true }
    },
    "platform": {
      "metricsapp": ">=1.0.0"
    }
  },
  
  "exports": {
    "datasources": [{ "type": "mydata", "displayName": "My Data" }],
    "dashboardPanels": [{ "type": "my-chart", "displayName": "My Chart" }],
    "routes": [{ "path": "/my-plugin", "component": "MainPage" }],
    "authProviders": [{ "id": "my-oauth", "displayName": "My OAuth" }],
    "alertChannels": [{ "type": "my-channel", "displayName": "My Channel" }]
  },
  
  "settings": {
    "schema": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": true }
      }
    }
  },
  
  "permissions": ["datasources:read", "datasources:write"],
  
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

---

## Dependencies

### Declaring Dependencies

```json
{
  "dependencies": {
    "plugins": {
      "core-datasource": ">=1.0.0",
      "optional-feature": { "version": ">=2.0.0", "optional": true }
    },
    "platform": {
      "metricsapp": ">=1.0.0"
    }
  }
}
```

### Version Syntax

- `"1.0.0"` - Exact version
- `">=1.0.0"` - Minimum version
- `">=1.0.0 <2.0.0"` - Version range
- `"^1.0.0"` - Compatible with 1.x.x
- `"~1.0.0"` - Approximately 1.0.x

### Optional Dependencies

```json
{
  "optional-plugin": { "version": ">=2.0.0", "optional": true }
}
```

Handle optional dependencies gracefully:

```csharp
public override async Task OnInitializeAsync(IServiceProvider services, CancellationToken ct)
{
    var optionalService = services.GetService<IOptionalService>();
    if (optionalService != null)
    {
        // Use optional feature
    }
}
```

---

## Testing Your Plugin

### Unit Tests

```csharp
[Fact]
public async Task TestConnection_ValidConfig_ReturnsSuccess()
{
    var plugin = new MyPlugin();
    var config = new DataSourceConfiguration { Properties = { ["endpoint"] = "http://test" } };
    
    var result = await plugin.TestConnectionAsync(config, _services, CancellationToken.None);
    
    Assert.True(result.Success);
}
```

### Integration Testing

1. Build your plugin
2. Copy to the Plugins folder
3. Start MetricsApp
4. Navigate to Plugins page
5. Test functionality

### Frontend Testing

```tsx
import { render, screen } from '@testing-library/react';
import { PluginProvider } from '@metricsapp/plugin-sdk';

test('renders config form', () => {
  render(
    <PluginProvider pluginId="test" manifest={mockManifest}>
      <MyDataSourceConfig config={{}} onChange={() => {}} onTest={() => Promise.resolve({ success: true })} />
    </PluginProvider>
  );
  
  expect(screen.getByLabelText('Endpoint')).toBeInTheDocument();
});
```

---

## Best Practices

### 1. Keep Plugins Focused

Each plugin should do one thing well. Split unrelated functionality into separate plugins.

### 2. Use Configuration Schemas

Let the framework generate UI from your schema. Don't hardcode forms.

```csharp
// Good: Schema-driven
public DataSourceConfigurationSchema GetConfigurationSchema() => new()
{
    Fields = new List<ConfigurationField>
    {
        new() { Name = "endpoint", Type = ConfigurationFieldType.Text, Required = true }
    }
};
```

### 3. Handle Errors Gracefully

```csharp
public async Task<DataSourceTestResult> TestConnectionAsync(...)
{
    try
    {
        // Test connection
        return DataSourceTestResult.Success(latencyMs, "Connected!");
    }
    catch (HttpRequestException ex)
    {
        return DataSourceTestResult.Failure($"Network error: {ex.Message}");
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Unexpected error testing connection");
        return DataSourceTestResult.Failure("An unexpected error occurred");
    }
}
```

### 4. Use Dependency Injection

```csharp
public override void ConfigureServices(IServiceCollection services, IConfiguration config)
{
    services.AddScoped<IMyService, MyService>();
    services.AddHttpClient<MyApiClient>();
}
```

### 5. Support Cancellation

```csharp
public async Task<LogQueryResult> QueryLogsAsync(LogQueryCriteria criteria, CancellationToken ct)
{
    ct.ThrowIfCancellationRequested();
    
    await foreach (var item in GetItemsAsync(ct))
    {
        ct.ThrowIfCancellationRequested();
        // Process item
    }
}
```

### 6. Log Appropriately

```csharp
_logger.LogInformation("Connected to {Endpoint}", endpoint);
_logger.LogWarning("Connection slow: {Latency}ms", latency);
_logger.LogError(ex, "Failed to query: {Query}", query);
```

### 7. Secure Sensitive Data

Mark sensitive fields in your schema:

```csharp
new ConfigurationField
{
    Name = "apiKey",
    Type = ConfigurationFieldType.Password,
    // Framework will encrypt/mask this value
}
```

---

## Examples

### Simple Data Source Plugin

See `templates/plugin-template/` for a complete example.

### Multi-Capability Plugin

```csharp
public class FullFeaturedPlugin : PluginBase, 
    IDataSourceCapability, 
    IDashboardCapability, 
    IAlertChannelCapability
{
    // Implement all capabilities
}
```

### Setup Plugin

See `InitialSetupPlugin/` for a complete setup wizard example.

---

## Support

- Documentation: `/docs/PLUGIN_ARCHITECTURE.md`
- Template: `/templates/plugin-template/`
- Examples: `/InitialSetupPlugin/`, `/SqlServerPlugin/`

For questions, open an issue on GitHub.

