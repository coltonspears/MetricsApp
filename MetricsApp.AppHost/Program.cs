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

// MetricsApp API acts as the OTLP collector and query surface
var metricsApi = builder.AddProject<Projects.MetricsApp_Api>("metricsapp-api")
    .WithReference(database)
    .WithReference(redis)
    .WithReference(rabbitmq)
    .WaitFor(database)
    .WaitFor(redis)
    .WaitFor(rabbitmq);


// Web UI
builder.AddNpmApp("ReactWebUI", "../MetricsApp.WebUI", "dev")
    .WithReference(metricsApi)
    .WaitFor(metricsApi)
    .WithEnvironment("BROWSER", "none")
    .WithHttpEndpoint(13533, 3533, name: "frontend-http")
    .WithExternalHttpEndpoints();

builder.Build().Run();
