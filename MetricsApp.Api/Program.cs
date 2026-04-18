using MetricsApp.Abstractions.Parsers;
using MetricsApp.Abstractions.Plugins;
using MetricsApp.Api.Ingestion;
using MetricsApp.DataSources.MySql;
using MetricsApp.DataSources.PostgreSQL;
using MetricsApp.DataSources.Prometheus;
using MetricsApp.DataSources.Sqlite;
using MetricsApp.DataSources.SqlServer;
using MetricsApp.DataSources.WindowsPerformanceCounters;
using MetricsApp.Parser.OpenTelemetry.Extensions;
using MetricsApp.Worker.Workers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddOpenApi();

builder.Services
    .AddControllers(options =>
    {
        options.Conventions.Add(new ApiRoutePrefixConvention("api/v1"));
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHttpClient();

builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
        ?? new[]
        {
            "http://localhost:5173",
            "https://localhost:5173",
            "http://localhost:3533",
            "https://localhost:3533"
        };

    options.AddPolicy("AllowWebUI", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddLogging(logging =>
{
    logging.ClearProviders();
    logging.AddConsole();
    logging.AddDebug();
});

// Telemetry ingestion pipeline (in-memory for MVP; SQLite repo lands in M3)
builder.Services.AddInMemoryQueue();
builder.Services.AddInMemoryCaching();
builder.Services.AddInMemoryRepository();
builder.Services.AddWindowsPerfCounterParser();
builder.Services.AddOpenTelemetryParsers();
builder.Services.AddSingleton<IDataParser, SerilogSinkParser>();
builder.Services.AddSingleton<IDataParser, RawEventParser>();

// Pluggable external data sources (federation; not the primary store)
builder.Services.AddDataSources();
builder.Services.AddSqlServerDataSource();
builder.Services.AddSqliteDataSource();
builder.Services.AddMySqlDataSource();
builder.Services.AddPostgreSQLDataSource();
builder.Services.AddWindowsPerfDataSource();
builder.Services.AddPrometheusDataSource(httpClient =>
{
    httpClient.Timeout = TimeSpan.FromSeconds(60);
    httpClient.DefaultRequestHeaders.Add("User-Agent", "MetricsApp/1.0");
});

// Background ingestion worker (consumes the queue, parses, persists)
builder.Services.AddHostedService<IngestionWorker>();

// Plugin discovery (safe no-op when Plugins/ is empty)
builder.Services.AddPlugins(builder.Configuration, Path.Combine(AppContext.BaseDirectory, "Plugins"));

var app = builder.Build();

app.MapDefaultEndpoints();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.MapScalarApiReference(options =>
    {
        options
            .WithTheme(ScalarTheme.Kepler)
            .WithDarkModeToggle(true)
            .WithClientButton(true);
    });
}

app.UseCors("AllowWebUI");
app.UseHttpsRedirection();

app.MapControllers();

app.Run();

sealed class ApiRoutePrefixConvention : IApplicationModelConvention
{
    private readonly AttributeRouteModel _prefix;

    public ApiRoutePrefixConvention(string prefix)
    {
        if (string.IsNullOrWhiteSpace(prefix))
        {
            throw new ArgumentException("Route prefix cannot be empty.", nameof(prefix));
        }

        _prefix = new AttributeRouteModel(new RouteAttribute(prefix.Trim('/')));
    }

    public void Apply(ApplicationModel application)
    {
        foreach (var controller in application.Controllers)
        {
            foreach (var selector in controller.Selectors.Where(selector => selector.AttributeRouteModel != null))
            {
                var template = selector.AttributeRouteModel!.Template;
                if (!string.IsNullOrEmpty(template) &&
                    template.StartsWith(_prefix.Template!, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                selector.AttributeRouteModel = AttributeRouteModel.CombineAttributeRouteModel(
                    _prefix,
                    selector.AttributeRouteModel);
            }

            if (controller.Selectors.All(selector => selector.AttributeRouteModel == null))
            {
                controller.Selectors.Add(new SelectorModel
                {
                    AttributeRouteModel = _prefix
                });
            }
        }
    }
}
