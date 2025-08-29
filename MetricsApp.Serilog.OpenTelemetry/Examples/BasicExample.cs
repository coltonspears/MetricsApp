using Serilog;
using MetricsApp.Serilog.OpenTelemetry;
using System.Diagnostics;

namespace MetricsApp.Serilog.OpenTelemetry.Examples;

/// <summary>
/// Basic example showing how to use the OpenTelemetry telemetry client
/// </summary>
public class BasicExample
{
    public static async Task RunExample()
    {
        // Configure the telemetry client
        var config = new OpenTelemetryConfiguration
        {
            Endpoint = "https://localhost:7201",
            ServiceName = "example-service",
            ServiceVersion = "1.0.0",
            Environment = "development",
            BatchSize = 10, // Smaller batch for demo
            FlushIntervalSeconds = 2 // Faster flush for demo
        };

        // Create the telemetry client
        using var telemetryClient = new OpenTelemetryTelemetryClient(config);

        Console.WriteLine("🚀 Starting OpenTelemetry Example...");

        // 1. Basic Logging
        Console.WriteLine("\n📝 Logging Examples:");
        telemetryClient.LogInformation("Application started successfully");
        telemetryClient.LogWarning("This is a warning message");
        telemetryClient.LogError("This is an error message for testing");

        try
        {
            throw new InvalidOperationException("Test exception");
        }
        catch (Exception ex)
        {
            telemetryClient.LogError(ex, "Caught an exception during example execution");
        }

        // 2. Basic Metrics
        Console.WriteLine("\n📊 Metrics Examples:");
        
        // Counter - for counting events
        telemetryClient.RecordCounter("example.requests.total", 1, 
            tags: new() { ["method"] = "GET", ["status"] = "200" });
        
        // Gauge - for current values
        telemetryClient.RecordGauge("example.memory.usage", 512.7, 
            tags: new() { ["type"] = "heap" }, unit: "MB");
        
        // Histogram - for distributions
        telemetryClient.RecordHistogram("example.request.duration", 145.5, 
            tags: new() { ["endpoint"] = "/api/users" }, unit: "ms");

        // 3. Basic Tracing
        Console.WriteLine("\n🔍 Tracing Examples:");
        
        var result = telemetryClient.TraceOperation("example-operation", activity =>
        {
            activity?.SetTag("user.id", "123");
            activity?.SetTag("operation.type", "data-fetch");
            
            // Simulate some work
            Thread.Sleep(100);
            
            telemetryClient.LogInformation("Processing data for user {UserId}", "123");
            telemetryClient.RecordCounter("example.operations.completed");
            
            return "Operation completed successfully";
        });

        Console.WriteLine($"   Result: {result}");

        // 4. Async Tracing
        Console.WriteLine("\n⚡ Async Tracing Examples:");
        
        var asyncResult = await telemetryClient.TraceOperationAsync("async-operation", async activity =>
        {
            activity?.SetTag("batch.size", "100");
            activity?.SetTag("async", "true");
            
            // Simulate async work
            await Task.Delay(50);
            
            telemetryClient.LogInformation("Async operation completed");
            
            return "Async operation result";
        });

        Console.WriteLine($"   Async Result: {asyncResult}");

        // 5. Combined Tracing and Timing
        Console.WriteLine("\n⏱️ Combined Tracing + Timing Examples:");
        
        var timedResult = await telemetryClient.TraceAndTimeOperationAsync("timed-operation", async activity =>
        {
            activity?.SetTag("complexity", "high");
            
            // Simulate work that we want to both trace and time
            await Task.Delay(200);
            
            telemetryClient.LogInformation("Timed operation in progress");
            telemetryClient.RecordGauge("example.active.operations", 5);
            
            return 42;
        }, tags: new() { ["category"] = "computation" });

        Console.WriteLine($"   Timed Result: {timedResult}");

        // 6. Manual timing without tracing
        Console.WriteLine("\n⏲️ Manual Timing Examples:");
        
        var timingResult = await telemetryClient.TimeOperationAsync("manual-timing", async () =>
        {
            await Task.Delay(100);
            telemetryClient.LogInformation("Manual timing operation completed");
            return "Timing result";
        }, tags: new() { ["manual"] = "true" });

        Console.WriteLine($"   Timing Result: {timingResult}");

        // 7. Business Logic Simulation
        Console.WriteLine("\n💼 Business Logic Simulation:");
        await SimulateBusinessLogic(telemetryClient);

        // 8. Error Handling Example
        Console.WriteLine("\n❌ Error Handling Example:");
        try
        {
            telemetryClient.TraceOperation("error-operation", activity =>
            {
                activity?.SetTag("will.fail", "true");
                telemetryClient.LogInformation("About to simulate an error");
                throw new InvalidOperationException("Simulated business logic error");
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"   Caught expected error: {ex.Message}");
            telemetryClient.RecordCounter("example.errors.handled");
        }

        // Flush all pending telemetry
        Console.WriteLine("\n🔄 Flushing telemetry data...");
        await telemetryClient.FlushAsync();

        Console.WriteLine("✅ Example completed! Check your MetricsApp backend for the telemetry data.");
        Console.WriteLine("   Logs: Should appear in the telemetry logs endpoint");
        Console.WriteLine("   Metrics: Should appear in the metrics metadata and query endpoints");
        Console.WriteLine("   Traces: Should appear in the traces data");
    }

    private static async Task SimulateBusinessLogic(OpenTelemetryTelemetryClient telemetryClient)
    {
        // Simulate user registration flow
        await telemetryClient.TraceAndTimeOperationAsync("user-registration", async activity =>
        {
            var userId = Guid.NewGuid().ToString();
            activity?.SetTag("user.id", userId);
            activity?.SetTag("flow", "registration");

            telemetryClient.LogInformation("Starting user registration for {UserId}", userId);
            telemetryClient.RecordCounter("users.registration.started");

            // Validate email
            await telemetryClient.TraceOperationAsync("validate-email", async emailActivity =>
            {
                emailActivity?.SetTag("validation.type", "email");
                await Task.Delay(30); // Simulate validation
                telemetryClient.LogDebug("Email validation completed for {UserId}", userId);
            });

            // Save to database
            await telemetryClient.TraceOperationAsync("save-user", async saveActivity =>
            {
                saveActivity?.SetTag("database.table", "users");
                saveActivity?.SetTag("operation", "insert");
                await Task.Delay(80); // Simulate database save
                telemetryClient.LogDebug("User saved to database: {UserId}", userId);
            });

            // Send welcome email
            await telemetryClient.TraceOperationAsync("send-welcome-email", async emailActivity =>
            {
                emailActivity?.SetTag("email.type", "welcome");
                emailActivity?.SetTag("provider", "smtp");
                await Task.Delay(50); // Simulate email sending
                telemetryClient.LogDebug("Welcome email sent to {UserId}", userId);
            });

            telemetryClient.LogInformation("User registration completed for {UserId}", userId);
            telemetryClient.RecordCounter("users.registration.completed");
            telemetryClient.RecordGauge("users.total", Random.Shared.Next(1000, 5000));

        }, tags: new() { ["channel"] = "web", ["experiment"] = "A" });
    }
}

