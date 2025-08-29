using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

// Core infrastructure
var database = builder.AddSqlServer("sqlserver")
    .AddDatabase("metricsdb");

var redis = builder.AddRedis("redis");

var rabbitmq = builder.AddRabbitMQ("messaging")
    .WithManagementPlugin();

// OpenTelemetry Collector for receiving and processing telemetry data
var otlpCollector = builder.AddContainer("otel-collector", "otel/opentelemetry-collector-contrib", "latest")
    .WithBindMount("./otel-collector-config.yaml", "/etc/otelcol-contrib/otel-collector-config.yaml")
    .WithArgs("--config=/etc/otelcol-contrib/otel-collector-config.yaml")
    .WithEndpoint(4317, 4317, name: "otlp-grpc", scheme: "http")
    .WithHttpEndpoint(4318, 4318, name: "otlp-http")
    //.WithHttpEndpoint(9090, 9090, name: "prometheus-metrics")
    .WithHttpEndpoint(8889, 8889, name: "pprof");

// MetricsApp API - enhanced with OTLP support
var metricsApi = builder.AddProject<Projects.MetricsApp_Api>("metricsapp-api")
    .WithReference(database)
    .WithReference(redis)
    .WithReference(rabbitmq)
    //.WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", otlpCollector.GetEndpoint("otlp-grpc"))
    //.WithEnvironment("ASPNETCORE_URLS", "http://+:8080")
   // .WithHttpEndpoint(5247, name: "metrics-api-http")
    //.WithHttpEndpoint(7201, name: "metrics-api-https")
    .WaitFor(database)
    .WaitFor(redis)
    .WaitFor(rabbitmq);

// Web UI
builder.AddNpmApp("ReactWebUI", "../MetricsApp.WebUI", "dev")
    .WithReference(metricsApi)
    .WaitFor(metricsApi)
    .WithEnvironment("BROWSER", "none") // Disable opening browser on npm start
    //.WithHttpEndpoint(3533)
    .WithHttpEndpoint(13533, 3533, name: "frontend-http")
    .WithExternalHttpEndpoints();

// Optional: Jaeger for tracing visualization
var jaeger = builder.AddContainer("jaeger", "jaegertracing/all-in-one", "latest")
    .WithEnvironment("COLLECTOR_OTLP_ENABLED", "true")
    .WithHttpEndpoint(16686, 16686,name: "jaeger-ui")
    .WithHttpEndpoint(14268, 14268, name: "jaeger-collector")
    .WithHttpEndpoint(14317, 4317, name: "jaeger-otlp-grpc")
    .WithHttpEndpoint(14318, 4318, name: "jaeger-otlp-http");


builder.Build().Run();
