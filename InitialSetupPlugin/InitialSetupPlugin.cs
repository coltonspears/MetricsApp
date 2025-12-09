using MetricsApp.Abstractions.Plugins;
using MetricsApp.Abstractions.Plugins.Capabilities;
using MetricsApp.Abstractions.Setup;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace InitialSetupPlugin;

/// <summary>
/// Initial Setup Plugin - Provides the first-run setup wizard for MetricsApp.
/// This plugin handles database initialization, primary data source configuration,
/// and initial user/organization setup.
/// </summary>
[PluginManifest(
    Tags = new[] { "Setup", "Configuration", "Initialization", "Wizard" },
    License = "MIT",
    FrontendBundle = "/plugins/initial-setup-plugin/bundle.js",
    Permissions = new[] { "setup:read", "setup:write", "datasources:write" }
)]
[PluginAuthor("Colton Spears", Email = "coltonspears09@gmail.com", Homepage = "https://github.com/coltonspears09")]
[PluginAsset(PluginAssetType.Dashboard, "assets/dashboards/initial-setup-overview.json")]
public class InitialSetupPlugin : PluginBase, ISetupCapability, IRouteCapability
{
    // ========================================================================
    // IPlugin Implementation
    // ========================================================================
    
    public override string Id => "initial-setup-plugin";
    public override string Name => "MetricsApp.Setup.InitialSetup";
    public override string Version => "1.0.0";
    public override string Title => "Initial Setup";
    public override string Description => "Provides the initial setup wizard for MetricsApp, including database initialization and primary data source configuration.";

    // ========================================================================
    // ISetupCapability Implementation
    // ========================================================================
    
    public string SetupId => "initial-setup";
    public string SetupName => "Initial Setup";
    string ISetupCapability.Description => "Configure the primary database and initial settings for MetricsApp";
    public int Order => 0; // First setup step
    public bool IsRequired => true;
    public string SetupRoute => "/setup";

    public async Task<SetupStatus> GetStatusAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        try
        {
            var dbInitializer = services.GetService<IDbInitializer>();
            if (dbInitializer == null)
            {
                return new SetupStatus
                {
                    SetupId = SetupId,
                    State = SetupState.NotStarted,
                    Message = "Database initializer not configured"
                };
            }

            // Check if database is initialized
            var isInitialized = await dbInitializer.IsDatabaseInitializedAsync(cancellationToken);
            
            return new SetupStatus
            {
                SetupId = SetupId,
                State = isInitialized ? SetupState.Completed : SetupState.NotStarted,
                Message = isInitialized ? "Setup completed" : "Initial setup required"
            };
        }
        catch (Exception ex)
        {
            return new SetupStatus
            {
                SetupId = SetupId,
                State = SetupState.Failed,
                Message = $"Error checking setup status: {ex.Message}"
            };
        }
    }

    public async Task<SetupResult> CompleteSetupAsync(
        SetupContext context,
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var dbInitializer = services.GetRequiredService<IDbInitializer>();
            var logger = services.GetRequiredService<ILogger<InitialSetupPlugin>>();

            logger.LogInformation("Starting initial setup...");

            // Initialize the database
            await dbInitializer.InitializeDatabaseAsync(cancellationToken);

            logger.LogInformation("Initial setup completed successfully");

            return new SetupResult
            {
                Success = true,
                Message = "Initial setup completed successfully"
            };
        }
        catch (Exception ex)
        {
            return new SetupResult
            {
                Success = false,
                Message = "Setup failed",
                ErrorDetails = ex.ToString()
            };
        }
    }

    public Task<SetupResult> ResetSetupAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        // Reset is not supported for initial setup
        return Task.FromResult(new SetupResult
        {
            Success = false,
            Message = "Reset is not supported for initial setup"
        });
    }

    // ========================================================================
    // IRouteCapability Implementation
    // ========================================================================
    
    public IEnumerable<PluginRoute> GetRoutes()
    {
        yield return new PluginRoute
        {
            Path = "/setup",
            ComponentName = "InitialSetupWizard",
            Title = "Initial Setup",
            RequiresAuth = false // Allow access before auth is configured
        };
        
        yield return new PluginRoute
        {
            Path = "/setup/database",
            ComponentName = "DatabaseSetup",
            Title = "Database Configuration",
            RequiresAuth = false
        };
        
        yield return new PluginRoute
        {
            Path = "/setup/datasource",
            ComponentName = "DataSourceSetup",
            Title = "Primary Data Source",
            RequiresAuth = false
        };
    }

    public IEnumerable<NavigationItem> GetNavigationItems()
    {
        // Setup doesn't add permanent navigation items
        yield break;
    }

    // ========================================================================
    // Plugin Lifecycle
    // ========================================================================
    
    public override void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        // Register the database initializer
        services.AddTransient<IDbInitializer, SqlServerDbInitializer>();
    }

    public override async Task OnInitializeAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        var logger = services.GetRequiredService<ILogger<InitialSetupPlugin>>();
        logger.LogInformation("Initial Setup Plugin initialized");
        
        // Check if setup is needed
        var status = await GetStatusAsync(services, cancellationToken);
        if (status.State == SetupState.NotStarted)
        {
            logger.LogWarning("Initial setup has not been completed. Please complete setup at /setup");
        }
        
        await base.OnInitializeAsync(services, cancellationToken);
    }
}
