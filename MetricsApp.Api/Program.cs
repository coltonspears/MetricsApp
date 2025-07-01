using MetricsApp.DataSources.Prometheus;
using MetricsApp.Worker.Workers;
using MetricsApp.Repository.InMemory.Extensions;
using MetricsApp.Abstractions.Data;
using MetricsApp.Agent.Collectors.WindowsPerfCounters;
using MetricsApp.Agent.Core.Services;
using MetricsApp.Agent.Core.Abstractions;
using MetricsApp.Api.Services;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddControllers()
    .AddJsonOptions(options => 
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddLogging(logging =>
{
    logging.ClearProviders();
    logging.AddConsole();
    logging.AddDebug();
});

builder.Services.AddInMemoryQueue();
builder.Services.AddInMemoryCaching();
builder.Services.AddInMemoryRepository();
builder.Services.AddWindowsPerfCounterParser();

builder.Services.AddScoped<IEventRepository, SqlServerEventRepository>(x =>
{
    return new SqlServerEventRepository(builder.Configuration);
});

// Configure Agent Core services
builder.Services.Configure<AgentOptions>(builder.Configuration.GetSection("MetricsAgent"));

// Register Windows Performance Counter Collector
if (OperatingSystem.IsWindows())
{
    builder.Services.AddWindowsPerfCounterCollector(builder.Configuration);
    builder.Services.AddHostedService<CollectorBackgroundService>();
}

// Register data sources
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

builder.Services.AddHostedService<IngestionWorker>();

var app = builder.Build();

// // Seed the repository with sample data sources on startup
// using (var scope = app.Services.CreateScope())
// {
//     var repository = scope.ServiceProvider.GetRequiredService<IConfigurationRepository>();
//     var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
//     
//     try
//     {
//         await repository.SeedSampleDataSourcesAsync(logger);
//     }
//     catch (Exception ex)
//     {
//         logger.LogError(ex, "Failed to seed sample data sources");
//     }
// }

// Configure the HTTP request pipeline.
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

app.UseHttpsRedirection();

app.MapControllers();

app.Run();
