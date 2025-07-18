using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

IResourceBuilder<SqlServerDatabaseResource> database = builder.AddSqlServer("database")
    .AddDatabase("MetricsDb");

var metricsApi = builder.AddProject<Projects.MetricsApp_Api>("metricsapp-api")
    .WithReference(database)
    .WaitFor(database);

var rmq = builder.AddRabbitMQ("RabbitMQ")
    .WithManagementPlugin();

builder.AddNpmApp("ReactWebUI", "../MetricsApp.WebUI", "dev")
    .WithReference(metricsApi)
    .WaitFor(metricsApi)
    .WithEnvironment("BROWSER", "none") // Disable opening browser on npm start
    .WithHttpEndpoint(3001)
    .WithExternalHttpEndpoints();

builder.AddRedis("Redis");

builder.Build().Run();
