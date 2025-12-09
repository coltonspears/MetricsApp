using MetricsApp.Abstractions.DataSources;
using MetricsApp.Abstractions.Plugins;
using MetricsApp.Abstractions.Plugins.Capabilities;
using MetricsApp.Core.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace TemplatePlugin;

/// <summary>
/// Example plugin demonstrating the MetricsApp plugin architecture.
/// This plugin provides a data source and dashboard panel capability.
/// </summary>
public class TemplatePlugin : PluginBase, IDataSourceCapability, IDashboardCapability
{
    // ========================================================================
    // IPlugin Implementation
    // ========================================================================
    
    public override string Id => "template-plugin";
    public override string Name => "TemplatePlugin";
    public override string Version => "1.0.0";
    public override string Title => "Template Plugin";
    public override string Description => "An example plugin demonstrating the MetricsApp plugin system";

    // ========================================================================
    // IDataSourceCapability Implementation
    // ========================================================================
    
    public string DataSourceType => "template";
    public string DisplayName => "Template Data Source";
    string IDataSourceCapability.Description => "Example data source for demonstration";
    public string IconName => "database";
    public IReadOnlyList<string> Categories => new[] { "example", "template" };

    public IDataSource CreateDataSource(IServiceProvider services)
    {
        var logger = services.GetRequiredService<ILogger<TemplateDataSource>>();
        return new TemplateDataSource(logger);
    }

    public DataSourceConfigurationSchema GetConfigurationSchema()
    {
        return new DataSourceConfigurationSchema
        {
            Fields = new List<ConfigurationField>
            {
                new ConfigurationField
                {
                    Name = "endpoint",
                    Label = "Endpoint URL",
                    Description = "The API endpoint to connect to",
                    Type = ConfigurationFieldType.Text,
                    Required = true,
                    Placeholder = "https://api.example.com"
                },
                new ConfigurationField
                {
                    Name = "apiKey",
                    Label = "API Key",
                    Description = "Your API key for authentication",
                    Type = ConfigurationFieldType.Password,
                    Required = true
                },
                new ConfigurationField
                {
                    Name = "timeout",
                    Label = "Timeout (seconds)",
                    Description = "Request timeout in seconds",
                    Type = ConfigurationFieldType.Number,
                    DefaultValue = 30
                }
            },
            Defaults = new Dictionary<string, object>
            {
                { "timeout", 30 }
            }
        };
    }

    public async Task<DataSourceTestResult> TestConnectionAsync(
        DataSourceConfiguration configuration,
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Simulate connection test
            await Task.Delay(500, cancellationToken);
            
            var endpoint = configuration.Properties.GetValueOrDefault("endpoint", "")?.ToString();
            if (string.IsNullOrEmpty(endpoint))
            {
                return DataSourceTestResult.Failure("Endpoint is required");
            }

            return DataSourceTestResult.Success(125, "Connection successful!");
        }
        catch (Exception ex)
        {
            return DataSourceTestResult.Failure($"Connection failed: {ex.Message}");
        }
    }

    // ========================================================================
    // IDashboardCapability Implementation
    // ========================================================================
    
    public IEnumerable<PanelTypeDefinition> GetPanelTypes()
    {
        yield return new PanelTypeDefinition
        {
            Type = "template-chart",
            DisplayName = "Template Chart",
            Description = "A sample chart visualization",
            IconName = "bar-chart",
            DefaultSize = new PanelSize { Width = 6, Height = 4 },
            ConfigurationSchema = new PanelConfigurationSchema
            {
                Fields = new List<PanelConfigField>
                {
                    new PanelConfigField
                    {
                        Name = "chartType",
                        Label = "Chart Type",
                        Type = "select",
                        DefaultValue = "line",
                        Options = new List<SelectOption>
                        {
                            new() { Value = "line", Label = "Line Chart" },
                            new() { Value = "bar", Label = "Bar Chart" },
                            new() { Value = "area", Label = "Area Chart" }
                        }
                    },
                    new PanelConfigField
                    {
                        Name = "showLegend",
                        Label = "Show Legend",
                        Type = "boolean",
                        DefaultValue = true
                    }
                }
            }
        };
    }

    public IEnumerable<DashboardTemplate> GetDashboardTemplates()
    {
        yield return new DashboardTemplate
        {
            Id = "template-overview",
            Name = "Template Overview",
            Description = "A sample dashboard showing template data",
            Tags = new List<string> { "example", "overview" },
            RequiredDataSources = new List<string> { "template" },
            JsonDefinition = """
            {
              "title": "Template Overview",
              "panels": [
                {
                  "type": "template-chart",
                  "title": "Sample Metrics",
                  "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
                  "options": { "chartType": "line", "showLegend": true }
                }
              ]
            }
            """
        };
    }

    // ========================================================================
    // Plugin Lifecycle
    // ========================================================================
    
    public override void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        // Register plugin-specific services
        services.AddScoped<TemplateDataSource>();
        
        // Register any additional services your plugin needs
    }

    public override async Task OnLoadAsync(PluginContext context, CancellationToken cancellationToken = default)
    {
        // Called when the plugin is loaded
        // Use this for any initialization that needs to happen before services are configured
        await base.OnLoadAsync(context, cancellationToken);
    }

    public override async Task OnInitializeAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        // Called after all services are configured
        // Use this for any initialization that requires DI services
        var logger = services.GetRequiredService<ILogger<TemplatePlugin>>();
        logger.LogInformation("Template Plugin initialized!");
        
        await base.OnInitializeAsync(services, cancellationToken);
    }

    public override async Task OnShutdownAsync(CancellationToken cancellationToken = default)
    {
        // Called when the application is shutting down
        // Clean up any resources
        await base.OnShutdownAsync(cancellationToken);
    }
}

