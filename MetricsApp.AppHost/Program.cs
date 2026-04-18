using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

// Jaeger All-In-One for distributed tracing with OTLP support.
// Exposes: OTLP gRPC (4317), OTLP HTTP (4318), Query UI/API (16686).
var jaeger = builder.AddContainer("jaeger", "jaegertracing/all-in-one", "latest")
    .WithEnvironment("COLLECTOR_OTLP_ENABLED", "true")
    .WithHttpEndpoint(16686, 16686, name: "jaeger-ui")
    .WithEndpoint(4317, 4317, name: "otlp-grpc")
    .WithHttpEndpoint(4318, 4318, name: "otlp-http");

// MetricsApp API: OTLP collector + query surface + dashboards/alerts (M5+).
var metricsApi = builder.AddProject<Projects.MetricsApp_Api>("metricsapp-api")
    .WaitFor(jaeger)
    .WithEnvironment("Jaeger__QueryUrl", "http://localhost:16686")
    .WithEnvironment("Jaeger__OtlpUrl", "http://localhost:4318")
    .WithEnvironment("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
    .WithEnvironment("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc")
    .WithExternalHttpEndpoints();

// React WebUI (Vite dev server).
builder.AddNpmApp("ReactWebUI", "../MetricsApp.WebUI", "dev")
    .WithReference(metricsApi)
    .WaitFor(metricsApi)
    .WithEnvironment("BROWSER", "none")
    .WithHttpEndpoint(13533, 3533, name: "frontend-http")
    .WithExternalHttpEndpoints();

builder.Build().Run();
