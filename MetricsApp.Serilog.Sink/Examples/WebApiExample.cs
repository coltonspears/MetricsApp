using Microsoft.AspNetCore.Mvc;
using Serilog;
using MetricsApp.Serilog.Sink.Extensions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;

namespace MetricsApp.Serilog.Sink.Examples;

/// <summary>
/// Example ASP.NET Core Web API integration with MetricsApp Serilog sink
/// </summary>
public class WebApiExample
{
    /// <summary>
    /// Configure services in Program.cs or Startup.cs
    /// </summary>
    public static void ConfigureServices(WebApplicationBuilder builder)
    {
        // Method 1: Simple configuration
        builder.Services.AddMetricsAppLogging(
            apiBaseUrl: "https://localhost:7201",
            serviceName: "my-web-api",
            serviceVersion: "1.0.0",
            environment: "production");

        // Method 2: Configuration from appsettings.json
        // builder.Services.AddMetricsAppLogging(builder.Configuration);

        // Method 3: Advanced configuration
        /*
        builder.Services.AddMetricsAppLogging(config =>
        {
            config.ApiBaseUrl = builder.Configuration["MetricsApp:ApiUrl"] ?? "https://localhost:7201";
            config.ServiceName = "my-web-api";
            config.ServiceVersion = "1.0.0";
            config.Environment = builder.Environment.EnvironmentName;
            config.TargetEndpoint = "telemetry";
            config.BatchSize = 100;
            config.FlushIntervalSeconds = 5;
            
            // Add authentication if needed
            var apiKey = builder.Configuration["MetricsApp:ApiKey"];
            if (!string.IsNullOrEmpty(apiKey))
            {
                config.CustomHeaders["X-API-Key"] = apiKey;
            }
        });
        */

        // Add other services
        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();
    }

    /// <summary>
    /// Alternative configuration using Serilog directly
    /// </summary>
    public static void ConfigureWithSerilog(WebApplicationBuilder builder)
    {
        // Configure Serilog
        Log.Logger = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration)
            .WriteTo.Console()
            .WriteTo.MetricsApp(builder.Configuration, "MetricsApp")
            .Enrich.FromLogContext()
            .Enrich.WithProperty("ServiceName", "my-web-api")
            .Enrich.WithProperty("Environment", builder.Environment.EnvironmentName)
            .CreateLogger();

        // Use Serilog as the logging provider
        builder.Host.UseSerilog();
    }
}

/// <summary>
/// Example controller showing structured logging patterns
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly ILogger<OrdersController> _logger;

    public OrdersController(ILogger<OrdersController> logger)
    {
        _logger = logger;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(int id)
    {
        _logger.LogInformation("Retrieving order {OrderId} for user {UserId}", 
            id, HttpContext.User.Identity?.Name ?? "anonymous");

        try
        {
            // Simulate some work
            await Task.Delay(100);

            if (id <= 0)
            {
                _logger.LogWarning("Invalid order ID {OrderId} provided", id);
                return BadRequest("Invalid order ID");
            }

            if (id > 1000)
            {
                _logger.LogWarning("Order {OrderId} not found", id);
                return NotFound();
            }

            var order = new { Id = id, Status = "Completed", Total = 99.99m };
            
            _logger.LogInformation("Successfully retrieved order {OrderId} with status {OrderStatus}", 
                id, order.Status);

            return Ok(order);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve order {OrderId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
    {
        // Create a contextual logger with order-specific properties
        var contextLogger = Log.Logger.ForContext("OrderId", Guid.NewGuid())
                                      .ForContext("CustomerId", request.CustomerId)
                                      .ForContext("Items", request.Items?.Count ?? 0);

        contextLogger.Information("Starting order creation for customer {CustomerId}", request.CustomerId);

        try
        {
            // Validate request
            if (string.IsNullOrEmpty(request.CustomerId))
            {
                contextLogger.Warning("Order creation failed: missing customer ID");
                return BadRequest("Customer ID is required");
            }

            if (request.Items == null || !request.Items.Any())
            {
                contextLogger.Warning("Order creation failed: no items provided");
                return BadRequest("At least one item is required");
            }

            // Simulate order processing
            await Task.Delay(200);

            var orderId = Random.Shared.Next(1, 1000);
            
            contextLogger.Information("Order {OrderId} created successfully for customer {CustomerId} with {ItemCount} items",
                orderId, request.CustomerId, request.Items.Count);

            return Ok(new { OrderId = orderId, Status = "Created" });
        }
        catch (Exception ex)
        {
            contextLogger.Error(ex, "Failed to create order for customer {CustomerId}", request.CustomerId);
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateStatusRequest request)
    {
        var correlationId = Guid.NewGuid().ToString();
        
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["OrderId"] = id,
            ["NewStatus"] = request.Status,
            ["UserId"] = HttpContext.User.Identity?.Name ?? "system"
        });

        _logger.LogInformation("Updating order status");

        try
        {
            // Simulate status update
            await Task.Delay(50);

            if (!IsValidStatus(request.Status))
            {
                _logger.LogWarning("Invalid status provided: {Status}", request.Status);
                return BadRequest("Invalid status");
            }

            _logger.LogInformation("Order status updated successfully");
            return Ok(new { Success = true });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update order status");
            return StatusCode(500, "Internal server error");
        }
    }

    private static bool IsValidStatus(string status)
    {
        var validStatuses = new[] { "Pending", "Processing", "Shipped", "Delivered", "Cancelled" };
        return validStatuses.Contains(status);
    }
}

/// <summary>
/// Request models for the example controller
/// </summary>
public class CreateOrderRequest
{
    public string CustomerId { get; set; } = string.Empty;
    public List<OrderItem> Items { get; set; } = new();
}

public class OrderItem
{
    public string ProductId { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}

public class UpdateStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

/// <summary>
/// Example middleware for request/response logging
/// </summary>
public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var requestId = Guid.NewGuid().ToString();
        
        using var scope = _logger.BeginScope(new Dictionary<string, object>
        {
            ["RequestId"] = requestId,
            ["Method"] = context.Request.Method,
            ["Path"] = context.Request.Path,
            ["QueryString"] = context.Request.QueryString.ToString(),
            ["UserAgent"] = context.Request.Headers["User-Agent"].ToString()
        });

        var sw = System.Diagnostics.Stopwatch.StartNew();

        _logger.LogInformation("Request started");

        try
        {
            await _next(context);
            
            sw.Stop();
            _logger.LogInformation("Request completed in {ElapsedMs}ms with status {StatusCode}", 
                sw.ElapsedMilliseconds, context.Response.StatusCode);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Request failed after {ElapsedMs}ms", sw.ElapsedMilliseconds);
            throw;
        }
    }
}

/// <summary>
/// Example of how to register the middleware
/// </summary>
public static class MiddlewareExtensions
{
    public static void ConfigureMiddleware(WebApplication app)
    {
        // Add request logging middleware
        app.UseMiddleware<RequestLoggingMiddleware>();
        
        // Other middleware
        app.UseSwagger();
        app.UseSwaggerUI();
        app.UseHttpsRedirection();
        app.MapControllers();
    }
}
