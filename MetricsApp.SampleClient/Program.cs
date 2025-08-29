using Serilog;
using MetricsApp.Serilog.OpenTelemetry;
using System.Diagnostics;

// Configure the OpenTelemetry telemetry client
var config = new OpenTelemetryConfiguration
{
    Endpoint = "https://localhost:7201",
    ServiceName = "sample-client",
    ServiceVersion = "1.0.0",
    Environment = "development",
    BatchSize = 5, // Small batch for demo
    FlushIntervalSeconds = 2 // Quick flush for demo
};

Console.WriteLine("🚀 MetricsApp Serilog OpenTelemetry Sample Client");
Console.WriteLine("===============================================");
Console.WriteLine($"📡 Sending telemetry to: {config.Endpoint}");
Console.WriteLine($"🏷️  Service: {config.ServiceName} v{config.ServiceVersion}");
Console.WriteLine();

// Method 1: Simple Serilog setup
Console.WriteLine("1️⃣ Setting up Serilog with OpenTelemetry sink...");
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.OpenTelemetry(config)
    .CreateLogger();

// Method 2: Full telemetry client
Console.WriteLine("2️⃣ Creating full telemetry client...");
using var telemetryClient = new OpenTelemetryTelemetryClient(config);

Console.WriteLine("✅ Setup complete! Starting demonstration...");
Console.WriteLine();

// Demonstrate basic logging
Console.WriteLine("📝 Logging Examples:");
Log.Information("Application started - using simple Serilog setup");
telemetryClient.LogInformation("Application started - using telemetry client");
telemetryClient.LogWarning("This is a warning message with structured data: {UserId} {Action}", 12345, "login");

try
{
    throw new InvalidOperationException("This is a test exception");
}
catch (Exception ex)
{
    telemetryClient.LogError(ex, "Caught an exception during demonstration");
}

Console.WriteLine("   ✓ Logs sent");
Console.WriteLine();

// Demonstrate metrics
Console.WriteLine("📊 Metrics Examples:");
telemetryClient.RecordCounter("sample.requests.total", 1, 
    tags: new() { ["method"] = "GET", ["endpoint"] = "/api/users" });

telemetryClient.RecordGauge("sample.active_users", 42.0, 
    tags: new() { ["region"] = "us-west-2" });

telemetryClient.RecordHistogram("sample.response_time", 125.7, 
    tags: new() { ["service"] = "user-service" }, unit: "ms");

Console.WriteLine("   ✓ Metrics recorded");
Console.WriteLine();

// Demonstrate tracing
Console.WriteLine("🔍 Tracing Examples:");
var result = telemetryClient.TraceOperation("sample-business-operation", activity =>
{
    activity?.SetTag("user.id", "12345");
    activity?.SetTag("operation.type", "data-processing");
    
    telemetryClient.LogInformation("Processing business operation for user {UserId}", "12345");
    
    // Simulate some work
    Thread.Sleep(100);
    
    telemetryClient.RecordCounter("sample.operations.completed");
    return "Success";
});

Console.WriteLine($"   ✓ Operation result: {result}");
Console.WriteLine();

// Demonstrate async tracing
Console.WriteLine("⚡ Async Tracing Examples:");
var asyncResult = await telemetryClient.TraceOperationAsync("async-database-query", async activity =>
{
    activity?.SetTag("database.table", "users");
    activity?.SetTag("query.type", "select");
    
    telemetryClient.LogInformation("Executing async database query");
    
    // Simulate async database work
    await Task.Delay(200);
    
    telemetryClient.RecordHistogram("sample.db.query_duration", 180.5, unit: "ms");
    return "Query completed";
});

Console.WriteLine($"   ✓ Async result: {asyncResult}");
Console.WriteLine();

// Demonstrate combined tracing and timing
Console.WriteLine("⏱️ Combined Tracing + Timing:");
var timedResult = await telemetryClient.TraceAndTimeOperationAsync("complex-calculation", async activity =>
{
    activity?.SetTag("calculation.type", "statistical");
    activity?.SetTag("data.size", "1000");
    
    telemetryClient.LogInformation("Starting complex calculation");
    
    // Simulate complex work
    await Task.Delay(300);
    
    // Simulate some CPU-intensive calculation
    var random = new Random();
    var sum = 0.0;
    for (int i = 0; i < 100000; i++)
    {
        sum += random.NextDouble();
    }
    
    telemetryClient.LogInformation("Calculation completed with result: {Result}", sum);
    return Math.Round(sum, 2);
}, tags: new() { ["priority"] = "high" });

Console.WriteLine($"   ✓ Calculation result: {timedResult}");
Console.WriteLine();

// Demonstrate business scenario
Console.WriteLine("💼 Business Scenario - User Registration Flow:");
await SimulateUserRegistrationFlow(telemetryClient);
Console.WriteLine();

// Demonstrate error handling
Console.WriteLine("❌ Error Handling:");
try
{
    telemetryClient.TraceOperation<string>("operation-that-fails", activity =>
    {
        activity?.SetTag("expected.outcome", "failure");
        telemetryClient.LogInformation("About to simulate a business error");
        throw new BusinessException("Insufficient funds");
    });
}
catch (BusinessException ex)
{
    telemetryClient.LogWarning("Business rule violation: {Message}", ex.Message);
    telemetryClient.RecordCounter("sample.business_errors", tags: new() { ["type"] = "insufficient_funds" });
    Console.WriteLine($"   ✓ Handled business error: {ex.Message}");
}

Console.WriteLine();

// Flush all pending telemetry
Console.WriteLine("🔄 Flushing all telemetry data...");
await telemetryClient.FlushAsync();
Log.CloseAndFlush();
Console.WriteLine("   ✓ Flush completed");
Console.WriteLine();

Console.WriteLine("✅ Demonstration completed!");
Console.WriteLine();
Console.WriteLine("🎯 What to check next:");
Console.WriteLine("   1. Open your MetricsApp WebUI: https://localhost:3000/telemetry/testing");
Console.WriteLine("   2. Check the API endpoints:");
Console.WriteLine("      • Logs: https://localhost:7201/api/v1/telemetry/logs");
Console.WriteLine("      • Metrics: https://localhost:7201/api/v1/telemetry/metrics");
Console.WriteLine("      • Health: https://localhost:7201/api/v1/telemetry/health");
Console.WriteLine("   3. Look for telemetry data from service: 'sample-client'");

Console.WriteLine();
Console.WriteLine("Press any key to exit...");
Console.ReadKey();

static async Task SimulateUserRegistrationFlow(OpenTelemetryTelemetryClient telemetry)
{
    var userId = Guid.NewGuid().ToString("N")[..8];
    
    await telemetry.TraceAndTimeOperationAsync<string>("user-registration-flow", async activity =>
    {
        activity?.SetTag("user.id", userId);
        activity?.SetTag("registration.channel", "web");
        
        telemetry.LogInformation("Starting user registration for {UserId}", userId);
        telemetry.RecordCounter("sample.registrations.started");
        
        // Step 1: Validate email
        await telemetry.TraceOperationAsync("validate-email", async stepActivity =>
        {
            stepActivity?.SetTag("validation.type", "email");
            await Task.Delay(50);
            telemetry.LogDebug("Email validation completed for {UserId}", userId);
        });
        
        // Step 2: Check existing user
        await telemetry.TraceOperationAsync("check-existing-user", async stepActivity =>
        {
            stepActivity?.SetTag("database.operation", "select");
            await Task.Delay(30);
            telemetry.LogDebug("Existing user check completed for {UserId}", userId);
        });
        
        // Step 3: Create user record
        await telemetry.TraceOperationAsync("create-user-record", async stepActivity =>
        {
            stepActivity?.SetTag("database.operation", "insert");
            await Task.Delay(80);
            telemetry.LogDebug("User record created for {UserId}", userId);
        });
        
        // Step 4: Send welcome email
        await telemetry.TraceOperationAsync("send-welcome-email", async stepActivity =>
        {
            stepActivity?.SetTag("email.provider", "smtp");
            stepActivity?.SetTag("template", "welcome");
            await Task.Delay(120);
            telemetry.LogDebug("Welcome email sent to {UserId}", userId);
        });
        
        telemetry.LogInformation("User registration completed successfully for {UserId}", userId);
        telemetry.RecordCounter("sample.registrations.completed");
        telemetry.RecordGauge("sample.total_users", Random.Shared.Next(1000, 5000));
        
        return "Registration completed";
        
    }, tags: new() { ["flow"] = "registration", ["version"] = "v2" });
    
    Console.WriteLine($"   ✓ User {userId} registered successfully");
}

public class BusinessException : Exception
{
    public BusinessException(string message) : base(message) { }
}