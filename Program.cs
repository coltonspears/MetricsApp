using Microsoft.EntityFrameworkCore;
using MetricsApp.Data;
using MetricsApp.Models;
using MetricsApp.Services; // Added for CacheService
using StackExchange.Redis; // Added for Redis

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<MetricsDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure Redis Cache
var redisConfiguration = builder.Configuration.GetConnectionString("RedisConnection");
if (string.IsNullOrEmpty(redisConfiguration))
{
    Console.WriteLine("Redis connection string 'RedisConnection' not found in configuration. Caching will be disabled or use a fallback.");
    // In a real app, you might register a NullCacheService or InMemoryCacheService here
    // For this project, we'll assume Redis is available if configured.
}
else
{
    builder.Services.AddSingleton<IConnectionMultiplexer>(ConnectionMultiplexer.Connect(redisConfiguration));
    builder.Services.AddSingleton<ICacheService, RedisCacheService>();
}

builder.Services.AddMcpServer();
builder.Services.AddControllers(); // For API Controllers
builder.Services.AddRazorPages(); // For Razor Pages UI

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseDeveloperExceptionPage(); // Useful for debugging Razor Pages issues
}
else
{
    app.UseExceptionHandler("/Error"); // Basic error handling for Razor Pages
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    // app.UseHsts(); // Not enabling HSTS as --no-https was used for simplicity
}

// app.UseHttpsRedirection(); // Not using HTTPS for simplicity as per --no-https
app.UseStaticFiles(); // To serve CSS, JS, images from wwwroot

app.UseRouting();

app.UseAuthorization();

app.MapRazorPages(); // Map requests to Razor Pages
app.MapControllers(); // Map requests to API controllers

app.Run();

