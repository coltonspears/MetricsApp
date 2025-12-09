using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

// Core infrastructure
var database = builder.AddSqlServer("sqlserver")
    .AddDatabase("metricsdb");

var redis = builder.AddRedis("redis");

var rabbitmq = builder.AddRabbitMQ("messaging")
    .WithManagementPlugin();

// Prometheus for metrics storage and visualization
builder.AddContainer("prometheus", "prom/prometheus", "latest")
    .WithBindMount("./prometheus.yml", "/etc/prometheus/prometheus.yml")
    .WithHttpEndpoint(9090, 9090, name: "prometheus-ui")
    .WithArgs(
        "--config.file=/etc/prometheus/prometheus.yml",
        "--storage.tsdb.path=/prometheus",
        "--web.console.libraries=/etc/prometheus/console_libraries",
        "--web.console.templates=/etc/prometheus/consoles",
        "--web.enable-lifecycle",
        "--web.enable-remote-write-receiver");

// Jaeger All-In-One for distributed tracing with OTLP support
// Exposes: OTLP gRPC (4317), OTLP HTTP (4318), Query UI/API (16686)
var jaeger = builder.AddContainer("jaeger", "jaegertracing/all-in-one", "latest")
    .WithEnvironment("COLLECTOR_OTLP_ENABLED", "true")
    .WithHttpEndpoint(16686, 16686, name: "jaeger-ui")     // Query UI & API
    .WithEndpoint(4317, 4317, name: "otlp-grpc")           // OTLP gRPC receiver
    .WithHttpEndpoint(4318, 4318, name: "otlp-http");      // OTLP HTTP receiver

// MetricsApp API acts as the OTLP collector and query surface
var metricsApi = builder.AddProject<Projects.MetricsApp_Api>("metricsapp-api")
    .WithReference(database)
    .WithReference(redis)
    .WithReference(rabbitmq)
    .WaitFor(database)
    .WaitFor(redis)
    .WaitFor(rabbitmq)
    .WaitFor(jaeger)
    // Configure Jaeger integration for the API
    .WithEnvironment("Jaeger__QueryUrl", "http://localhost:16686")
    .WithEnvironment("Jaeger__OtlpUrl", "http://localhost:4318")
    // Configure OpenTelemetry to export traces to Jaeger OTLP endpoint
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc")
    // Make the default endpoints external so they're accessible
    .WithExternalHttpEndpoints();


// Web UI
builder.AddNpmApp("ReactWebUI", "../MetricsApp.WebUI", "dev")
    .WithReference(metricsApi)
    .WaitFor(metricsApi)
    .WithEnvironment("BROWSER", "none")
    .WithHttpEndpoint(13533, 3533, name: "frontend-http")
    .WithExternalHttpEndpoints();

builder.Build().Run();
