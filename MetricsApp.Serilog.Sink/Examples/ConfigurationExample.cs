using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;
using MetricsApp.Serilog.Sink.Extensions;
using MetricsApp.Serilog.Sink.Configuration;

namespace MetricsApp.Serilog.Sink.Examples;

/// <summary>
/// Examples showing different ways to configure the MetricsApp Serilog sink
/// </summary>
public class ConfigurationExample
{
    /// <summary>
    /// Example appsettings.json configuration
    /// </summary>
    public static string GetExampleAppSettings()
    {
        return """
        {
          "MetricsApp": {
            "ApiBaseUrl": "https://localhost:7201",
            "ServiceName": "example-service",
            "ServiceVersion": "1.2.0",
            "Environment": "production",
            "TenantId": "company-123",
            "HostName": "web-server-01",
            "TargetEndpoint": "telemetry",
            "BatchSize": 100,
            "FlushIntervalSeconds": 5,
            "TimeoutSeconds": 30,
            "IncludeStructuredProperties": true,
            "IncludeExceptionDetails": true,
            "IncludeScopeInformation": true,
            "UseOtlpFormat": true,
            "MaxRetries": 3,
            "LogSinkFailures": false,
            "CustomHeaders": {
              "X-API-Key": "your-secret-api-key",
              "X-Environment": "production",
              "Authorization": "Bearer your-jwt-token"
            }
          },
          "Serilog": {
            "MinimumLevel": {
              "Default": "Information",
              "Override": {
                "Microsoft": "Warning",
                "System": "Warning"
              }
            },
            "WriteTo": [
              {
                "Name": "Console",
                "Args": {
                  "outputTemplate": "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}"
                }
              },
              {
                "Name": "MetricsApp",
                "Args": {
                  "configuration": "MetricsApp"
                }
              }
            ],
            "Enrich": ["FromLogContext", "WithMachineName", "WithThreadId"]
          }
        }
        """;
    }

    /// <summary>
    /// Environment-specific configuration example
    /// </summary>
    public static class EnvironmentSpecificConfiguration
    {
        public static void ConfigureDevelopment(IServiceCollection services, IConfiguration configuration)
        {
            services.AddMetricsAppLogging(config =>
            {
                config.ApiBaseUrl = "https://localhost:7201";
                config.ServiceName = "dev-service";
                config.Environment = "development";
                config.TargetEndpoint = "telemetry";
                config.LogSinkFailures = true; // Enable debugging in dev
                config.FlushIntervalSeconds = 1; // Faster flushing for development
            });
        }

        public static void ConfigureProduction(IServiceCollection services, IConfiguration configuration)
        {
            services.AddMetricsAppLogging(config =>
            {
                config.ApiBaseUrl = configuration["MetricsApp:ApiUrl"] ?? throw new InvalidOperationException("MetricsApp:ApiUrl is required");
                config.ServiceName = configuration["ServiceName"] ?? "production-service";
                config.Environment = "production";
                config.TargetEndpoint = "otel";
                config.UseOtlpFormat = true;
                config.BatchSize = 250; // Larger batches for production
                config.FlushIntervalSeconds = 10;
                config.LogSinkFailures = false;
                config.MaxRetries = 5;
                
                // Add authentication headers
                var apiKey = configuration["MetricsApp:ApiKey"];
                if (!string.IsNullOrEmpty(apiKey))
                {
                    config.CustomHeaders["X-API-Key"] = apiKey;
                }
            });
        }
    }

    /// <summary>
    /// Configuration with multiple environments using IHostEnvironment
    /// </summary>
    public static void ConfigureByEnvironment(IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        if (environment.IsDevelopment())
        {
            // Development configuration
            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Debug()
                .WriteTo.Console()
                .WriteTo.MetricsAppTelemetry(
                    "https://localhost:7201",
                    "dev-service",
                    environment: "development",
                    batchSize: 10,
                    flushIntervalSeconds: 1)
                .CreateLogger();
        }
        else if (environment.IsStaging())
        {
            // Staging configuration
            services.AddMetricsAppLogging(config =>
            {
                config.ApiBaseUrl = configuration["MetricsApp:StagingUrl"] ?? "https://staging-metrics.company.com";
                config.ServiceName = $"staging-{configuration["ServiceName"]}";
                config.Environment = "staging";
                config.TargetEndpoint = "otel";
                config.UseOtlpFormat = true;
            });
        }
        else
        {
            // Production configuration
            services.AddMetricsAppLogging(config =>
            {
                config.ApiBaseUrl = configuration["MetricsApp:ProductionUrl"] ?? "https://metrics.company.com";
                config.ServiceName = configuration["ServiceName"] ?? "production-service";
                config.Environment = "production";
                config.TargetEndpoint = "otel";
                config.UseOtlpFormat = true;
                config.BatchSize = 500;
                config.FlushIntervalSeconds = 15;
                
                // Production authentication
                config.CustomHeaders["Authorization"] = $"Bearer {configuration["MetricsApp:Token"]}";
            });
        }
    }

    /// <summary>
    /// Configuration with secrets management
    /// </summary>
    public static void ConfigureWithSecrets(IServiceCollection services, IConfiguration configuration)
    {
        services.AddMetricsAppLogging(config =>
        {
            config.ApiBaseUrl = configuration["MetricsApp:ApiUrl"] ?? "https://localhost:7201";
            config.ServiceName = configuration["ServiceName"] ?? "secure-service";
            config.Environment = configuration["ASPNETCORE_ENVIRONMENT"] ?? "development";
            
            // Use Azure Key Vault or other secret stores
            var apiKey = configuration["MetricsApp:ApiKey"]; // From Key Vault
            var authToken = configuration["MetricsApp:AuthToken"]; // From environment variable
            
            if (!string.IsNullOrEmpty(apiKey))
                config.CustomHeaders["X-API-Key"] = apiKey;
            
            if (!string.IsNullOrEmpty(authToken))
                config.CustomHeaders["Authorization"] = $"Bearer {authToken}";
        });
    }

    /// <summary>
    /// Configuration validation example
    /// </summary>
    public static void ConfigureWithValidation(IServiceCollection services, IConfiguration configuration)
    {
        // Create and validate configuration
        var sinkConfig = new MetricsAppSinkConfiguration();
        configuration.GetSection("MetricsApp").Bind(sinkConfig);
        
        var validationErrors = sinkConfig.Validate().ToList();
        if (validationErrors.Any())
        {
            throw new InvalidOperationException($"MetricsApp configuration is invalid: {string.Join(", ", validationErrors)}");
        }

        services.AddSingleton(sinkConfig);
        services.AddMetricsAppLogging(sinkConfig);
    }

    /// <summary>
    /// Dynamic configuration example (configuration that can change at runtime)
    /// </summary>
    public static void ConfigureDynamic(IServiceCollection services, IConfiguration configuration)
    {
        // Register configuration that can be updated
        services.Configure<MetricsAppSinkConfiguration>(configuration.GetSection("MetricsApp"));
        
        // Custom configuration provider that can reload
        services.AddSingleton<IConfigurationRoot>(provider =>
        {
            return new ConfigurationBuilder()
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")}.json", optional: true, reloadOnChange: true)
                .AddEnvironmentVariables()
                .Build();
        });
    }

    /// <summary>
    /// Docker/Kubernetes configuration example
    /// </summary>
    public static void ConfigureForContainers(IServiceCollection services, IConfiguration configuration)
    {
        services.AddMetricsAppLogging(config =>
        {
            // Use environment variables common in container environments
            config.ApiBaseUrl = Environment.GetEnvironmentVariable("METRICSAPP_API_URL") ?? "https://localhost:7201";
            config.ServiceName = Environment.GetEnvironmentVariable("SERVICE_NAME") ?? "container-service";
            config.ServiceVersion = Environment.GetEnvironmentVariable("SERVICE_VERSION") ?? "1.0.0";
            config.Environment = Environment.GetEnvironmentVariable("DEPLOYMENT_ENVIRONMENT") ?? "development";
            config.HostName = Environment.GetEnvironmentVariable("HOSTNAME") ?? Environment.MachineName;
            
            // Kubernetes service mesh authentication
            var serviceToken = Environment.GetEnvironmentVariable("SERVICE_ACCOUNT_TOKEN");
            if (!string.IsNullOrEmpty(serviceToken))
            {
                config.CustomHeaders["Authorization"] = $"Bearer {serviceToken}";
            }
            
            // Adjust for container resource constraints
            config.BatchSize = int.TryParse(Environment.GetEnvironmentVariable("LOG_BATCH_SIZE"), out var batchSize) ? batchSize : 100;
            config.FlushIntervalSeconds = int.TryParse(Environment.GetEnvironmentVariable("LOG_FLUSH_INTERVAL"), out var flushInterval) ? flushInterval : 5;
        });
    }

    /// <summary>
    /// A/B testing configuration example
    /// </summary>
    public static void ConfigureForTesting(IServiceCollection services, IConfiguration configuration)
    {
        var testGroup = configuration["Testing:Group"];
        
        services.AddMetricsAppLogging(config =>
        {
            config.ApiBaseUrl = "https://localhost:7201";
            config.ServiceName = $"test-service-{testGroup}";
            config.Environment = "testing";
            
            // Route different test groups to different endpoints
            config.TargetEndpoint = testGroup switch
            {
                "A" => "telemetry",
                "B" => "otel",
                _ => "telemetry"
            };
            
            // Add test metadata
            config.CustomHeaders["X-Test-Group"] = testGroup ?? "control";
            config.CustomHeaders["X-Test-Run-ID"] = configuration["Testing:RunId"] ?? Guid.NewGuid().ToString();
        });
    }
}
