using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

// Core infrastructure
var database = builder.AddSqlServer("sqlserver")
    .AddDatabase("metricsdb");

var redis = builder.AddRedis("redis");

var rabbitmq = builder.AddRabbitMQ("messaging")
    .WithManagementPlugin();

// Prometheus for metrics storage and visualization
var prometheus = builder.AddContainer("prometheus", "prom/prometheus", "latest")
    .WithBindMount("./prometheus.yml", "/etc/prometheus/prometheus.yml")
    .WithHttpEndpoint(9090, 9090, name: "prometheus-ui")
    .WithArgs("--config.file=/etc/prometheus/prometheus.yml", "--storage.tsdb.path=/prometheus", "--web.console.libraries=/etc/prometheus/console_libraries", "--web.console.templates=/etc/prometheus/consoles", "--web.enable-lifecycle", "--web.enable-remote-write-receiver");

// Jaeger for tracing visualization and storage
var jaeger = builder.AddContainer("jaeger", "jaegertracing/jaeger", "2.10.0")
    .WithEnvironment("COLLECTOR_OTLP_ENABLED", "true")
    .WithHttpEndpoint(16686, 16686,name: "jaeger-ui")
    .WithHttpEndpoint(14268, 14268, name: "jaeger-collector")
    .WithHttpEndpoint(14317, 4317, name: "jaeger-otlp-grpc")
    .WithHttpEndpoint(14318, 4318, name: "jaeger-otlp-http");

// MetricsApp API - enhanced with OTLP support and Jaeger integration
var metricsApi = builder.AddProject<Projects.MetricsApp_Api>("metricsapp-api")
    .WithReference(database)
    .WithReference(redis)
    .WithReference(rabbitmq)
    .WithReferenceRelationship(jaeger)
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", jaeger.GetEndpoint("jaeger-otlp-grpc"))
    .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc")
    .WithEnvironment("Jaeger:QueryUrl", "http://localhost:16686")
    .WaitFor(database)
    .WaitFor(redis)
    .WaitFor(rabbitmq)
    .WaitFor(jaeger);

// OpenTelemetry Collector for receiving and processing telemetry data
var otlpCollector = builder.AddContainer("otel-collector", "otel/opentelemetry-collector-contrib", "latest")
    .WithBindMount("./otel-collector-config.yaml", "/etc/otelcol-contrib/otel-collector-config.yaml")
    .WithArgs("--config=/etc/otelcol-contrib/otel-collector-config.yaml")
    .WithEndpoint(4317, 4317, name: "otlp-grpc", scheme: "http")
    //.WithEndpoint(5247, 5247, name: "metricsapp-api-otlp-http", scheme:"http") // Expose OTLP HTTP endpoint for local testing;
    .WithHttpEndpoint(4318, 4318, name: "otlp-http")
    //.WithHttpEndpoint(9090, 9090, name: "prometheus-metrics")
    .WithHttpEndpoint(8889, 8889, name: "pprof")
    .WaitFor(metricsApi)
    .WaitFor(jaeger)
    .WaitFor(prometheus);

// Web UI
builder.AddNpmApp("ReactWebUI", "../MetricsApp.WebUI", "dev")
    .WithReference(metricsApi)
    .WaitFor(metricsApi)
    .WithEnvironment("BROWSER", "none") // Disable opening browser on npm start
    //.WithHttpEndpoint(3533)
    .WithHttpEndpoint(13533, 3533, name: "frontend-http")
    .WithExternalHttpEndpoints();

builder.Build().Run();
