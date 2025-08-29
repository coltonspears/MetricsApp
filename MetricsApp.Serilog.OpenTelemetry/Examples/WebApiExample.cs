using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MetricsApp.Serilog.OpenTelemetry;
using Serilog;
using System.Diagnostics;

namespace MetricsApp.Serilog.OpenTelemetry.Examples;

/// <summary>
/// Example showing how to integrate with ASP.NET Core Web API
/// </summary>
public class WebApiExample
{
    /// <summary>
    /// Configure services for dependency injection
    /// </summary>
    public static void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        // Add the OpenTelemetry client
        services.AddOpenTelemetryClient(configuration, "OpenTelemetry");
        
        // Or configure directly:
        // services.AddOpenTelemetryClient(config =>
        // {
        //     config.Endpoint = "https://localhost:7201";
        //     config.ServiceName = "my-web-api";
        //     config.Environment = "production";
        // });

        // Add other services
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IOrderService, OrderService>();
    }

    /// <summary>
    /// Configure Serilog with OpenTelemetry sink
    /// </summary>
    public static void ConfigureSerilog(IHostBuilder hostBuilder)
    {
        hostBuilder.UseSerilog((context, config) =>
        {
            config
                .ReadFrom.Configuration(context.Configuration)
                .WriteTo.Console()
                .WriteTo.OpenTelemetry(context.Configuration, "OpenTelemetry");
        });
    }
}

/// <summary>
/// Example controller using OpenTelemetry telemetry
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly OpenTelemetryTelemetryClient _telemetry;
    private readonly IUserService _userService;

    public UsersController(OpenTelemetryTelemetryClient telemetry, IUserService userService)
    {
        _telemetry = telemetry;
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int size = 10)
    {
        return await _telemetry.TraceAndTimeOperationAsync("get-users", async activity =>
        {
            activity?.SetTag("http.method", "GET");
            activity?.SetTag("page", page.ToString());
            activity?.SetTag("size", size.ToString());

            _telemetry.LogInformation("Fetching users - Page: {Page}, Size: {Size}", page, size);
            _telemetry.RecordCounter("api.users.list.requests");

            var users = await _userService.GetUsersAsync(page, size);

            _telemetry.RecordGauge("api.users.returned", users.Count);
            _telemetry.LogInformation("Returned {UserCount} users", users.Count);

            return Ok(users);
        }, tags: new() { ["endpoint"] = "users", ["method"] = "GET" });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(int id)
    {
        return await _telemetry.TraceAndTimeOperationAsync("get-user", async activity =>
        {
            activity?.SetTag("http.method", "GET");
            activity?.SetTag("user.id", id.ToString());

            _telemetry.LogInformation("Fetching user {UserId}", id);
            _telemetry.RecordCounter("api.users.get.requests");

            var user = await _userService.GetUserByIdAsync(id);

            if (user == null)
            {
                _telemetry.LogWarning("User not found: {UserId}", id);
                _telemetry.RecordCounter("api.users.not_found");
                return NotFound(new { message = "User not found" });
            }

            _telemetry.LogInformation("User found: {UserId}", id);
            return Ok(user);
        }, tags: new() { ["endpoint"] = "users", ["method"] = "GET" }, ActivityKind.Server);
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest request)
    {
        return await _telemetry.TraceAndTimeOperationAsync("create-user", async activity =>
        {
            activity?.SetTag("http.method", "POST");
            activity?.SetTag("user.email", request.Email);

            _telemetry.LogInformation("Creating new user with email {Email}", request.Email);
            _telemetry.RecordCounter("api.users.create.requests");

            try
            {
                var user = await _userService.CreateUserAsync(request);

                _telemetry.LogInformation("User created successfully: {UserId}", user.Id);
                _telemetry.RecordCounter("api.users.create.success");
                _telemetry.RecordGauge("api.users.total", await _userService.GetTotalUserCountAsync());

                return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
            }
            catch (UserValidationException ex)
            {
                _telemetry.LogWarning(ex, "User validation failed for {Email}", request.Email);
                _telemetry.RecordCounter("api.users.create.validation_error");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _telemetry.LogError(ex, "Failed to create user with email {Email}", request.Email);
                _telemetry.RecordCounter("api.users.create.error");
                throw; // Let global error handler deal with it
            }
        }, tags: new() { ["endpoint"] = "users", ["method"] = "POST" }, ActivityKind.Server);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
    {
        return await _telemetry.TraceAndTimeOperationAsync("update-user", async activity =>
        {
            activity?.SetTag("http.method", "PUT");
            activity?.SetTag("user.id", id.ToString());

            _telemetry.LogInformation("Updating user {UserId}", id);
            _telemetry.RecordCounter("api.users.update.requests");

            var existingUser = await _userService.GetUserByIdAsync(id);
            if (existingUser == null)
            {
                _telemetry.LogWarning("Attempted to update non-existent user: {UserId}", id);
                _telemetry.RecordCounter("api.users.update.not_found");
                return NotFound();
            }

            try
            {
                var updatedUser = await _userService.UpdateUserAsync(id, request);

                _telemetry.LogInformation("User updated successfully: {UserId}", id);
                _telemetry.RecordCounter("api.users.update.success");

                return Ok(updatedUser);
            }
            catch (UserValidationException ex)
            {
                _telemetry.LogWarning(ex, "User validation failed for update {UserId}", id);
                _telemetry.RecordCounter("api.users.update.validation_error");
                return BadRequest(new { message = ex.Message });
            }
        }, tags: new() { ["endpoint"] = "users", ["method"] = "PUT" }, ActivityKind.Server);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        return await _telemetry.TraceAndTimeOperationAsync("delete-user", async activity =>
        {
            activity?.SetTag("http.method", "DELETE");
            activity?.SetTag("user.id", id.ToString());

            _telemetry.LogInformation("Deleting user {UserId}", id);
            _telemetry.RecordCounter("api.users.delete.requests");

            var deleted = await _userService.DeleteUserAsync(id);

            if (!deleted)
            {
                _telemetry.LogWarning("Attempted to delete non-existent user: {UserId}", id);
                _telemetry.RecordCounter("api.users.delete.not_found");
                return NotFound();
            }

            _telemetry.LogInformation("User deleted successfully: {UserId}", id);
            _telemetry.RecordCounter("api.users.delete.success");
            _telemetry.RecordGauge("api.users.total", await _userService.GetTotalUserCountAsync());

            return NoContent();
        }, tags: new() { ["endpoint"] = "users", ["method"] = "DELETE" }, ActivityKind.Server);
    }
}

/// <summary>
/// Example service that also uses telemetry
/// </summary>
public interface IUserService
{
    Task<List<User>> GetUsersAsync(int page, int size);
    Task<User?> GetUserByIdAsync(int id);
    Task<User> CreateUserAsync(CreateUserRequest request);
    Task<User> UpdateUserAsync(int id, UpdateUserRequest request);
    Task<bool> DeleteUserAsync(int id);
    Task<int> GetTotalUserCountAsync();
}

public class UserService : IUserService
{
    private readonly OpenTelemetryTelemetryClient _telemetry;
    private static readonly List<User> _users = new();
    private static int _nextId = 1;

    public UserService(OpenTelemetryTelemetryClient telemetry)
    {
        _telemetry = telemetry;
    }

    public async Task<List<User>> GetUsersAsync(int page, int size)
    {
        return await _telemetry.TraceAndTimeOperationAsync("user-service.get-users", async activity =>
        {
            activity?.SetTag("database.operation", "select");
            activity?.SetTag("database.table", "users");
            activity?.SetTag("pagination.page", page.ToString());
            activity?.SetTag("pagination.size", size.ToString());

            _telemetry.LogDebug("Querying users from database - Page: {Page}, Size: {Size}", page, size);

            // Simulate database delay
            await Task.Delay(Random.Shared.Next(10, 50));

            var skip = (page - 1) * size;
            var users = _users.Skip(skip).Take(size).ToList();

            _telemetry.RecordHistogram("database.query.duration", Random.Shared.Next(5, 25), 
                tags: new() { ["table"] = "users", ["operation"] = "select" }, unit: "ms");

            return users;
        }, tags: new() { ["service"] = "user", ["operation"] = "list" });
    }

    public async Task<User?> GetUserByIdAsync(int id)
    {
        return await _telemetry.TraceAndTimeOperationAsync("user-service.get-user", async activity =>
        {
            activity?.SetTag("database.operation", "select");
            activity?.SetTag("database.table", "users");
            activity?.SetTag("user.id", id.ToString());

            _telemetry.LogDebug("Querying user by ID: {UserId}", id);

            // Simulate database delay
            await Task.Delay(Random.Shared.Next(5, 20));

            var user = _users.FirstOrDefault(u => u.Id == id);

            if (user != null)
            {
                _telemetry.RecordCounter("user-service.cache.hit");
            }
            else
            {
                _telemetry.RecordCounter("user-service.cache.miss");
            }

            return user;
        }, tags: new() { ["service"] = "user", ["operation"] = "get" });
    }

    public async Task<User> CreateUserAsync(CreateUserRequest request)
    {
        return await _telemetry.TraceAndTimeOperationAsync("user-service.create-user", async activity =>
        {
            activity?.SetTag("database.operation", "insert");
            activity?.SetTag("database.table", "users");
            activity?.SetTag("user.email", request.Email);

            _telemetry.LogDebug("Creating user with email: {Email}", request.Email);

            // Validate email uniqueness
            if (_users.Any(u => u.Email == request.Email))
            {
                _telemetry.LogWarning("Email already exists: {Email}", request.Email);
                _telemetry.RecordCounter("user-service.validation.duplicate_email");
                throw new UserValidationException("Email already exists");
            }

            // Simulate database insert
            await Task.Delay(Random.Shared.Next(20, 100));

            var user = new User
            {
                Id = _nextId++,
                Name = request.Name,
                Email = request.Email,
                CreatedAt = DateTime.UtcNow
            };

            _users.Add(user);

            _telemetry.LogDebug("User created with ID: {UserId}", user.Id);
            _telemetry.RecordCounter("user-service.users.created");

            return user;
        }, tags: new() { ["service"] = "user", ["operation"] = "create" });
    }

    public async Task<User> UpdateUserAsync(int id, UpdateUserRequest request)
    {
        return await _telemetry.TraceAndTimeOperationAsync("user-service.update-user", async activity =>
        {
            activity?.SetTag("database.operation", "update");
            activity?.SetTag("database.table", "users");
            activity?.SetTag("user.id", id.ToString());

            var user = _users.FirstOrDefault(u => u.Id == id);
            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            // Simulate database update
            await Task.Delay(Random.Shared.Next(15, 60));

            user.Name = request.Name;
            user.Email = request.Email;

            _telemetry.RecordCounter("user-service.users.updated");

            return user;
        }, tags: new() { ["service"] = "user", ["operation"] = "update" });
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        return await _telemetry.TraceAndTimeOperationAsync("user-service.delete-user", async activity =>
        {
            activity?.SetTag("database.operation", "delete");
            activity?.SetTag("database.table", "users");
            activity?.SetTag("user.id", id.ToString());

            // Simulate database delete
            await Task.Delay(Random.Shared.Next(10, 40));

            var removed = _users.RemoveAll(u => u.Id == id) > 0;

            if (removed)
            {
                _telemetry.RecordCounter("user-service.users.deleted");
            }

            return removed;
        }, tags: new() { ["service"] = "user", ["operation"] = "delete" });
    }

    public async Task<int> GetTotalUserCountAsync()
    {
        return await _telemetry.TraceAndTimeOperationAsync("user-service.count-users", async activity =>
        {
            activity?.SetTag("database.operation", "count");
            activity?.SetTag("database.table", "users");

            // Simulate database count
            await Task.Delay(Random.Shared.Next(5, 15));

            return _users.Count;
        }, tags: new() { ["service"] = "user", ["operation"] = "count" });
    }
}

// Models
public record User(int Id, string Name, string Email, DateTime CreatedAt);
public record CreateUserRequest(string Name, string Email);
public record UpdateUserRequest(string Name, string Email);

public class UserValidationException : Exception
{
    public UserValidationException(string message) : base(message) { }
}

