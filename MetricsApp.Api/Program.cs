using MetricsApp.Worker.Workers;
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

builder.Services.AddHostedService<IngestionWorker>();

var app = builder.Build();

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
