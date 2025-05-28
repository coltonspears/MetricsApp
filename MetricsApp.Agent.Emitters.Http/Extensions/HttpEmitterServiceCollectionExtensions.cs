using MetricsApp.Agent.Core.Abstractions;
using MetricsApp.Agent.Emitters.Http;
using Microsoft.Extensions.Configuration;

namespace Microsoft.Extensions.DependencyInjection // For Extension Method
{

    public static class HttpEmitterServiceCollectionExtensions
    {
        public static IServiceCollection AddHttpMetricEmitter(this IServiceCollection services,
            IConfiguration configuration)
        {
            var section = configuration.GetSection("MetricsAgent:HttpEmitter");
            services.Configure<HttpEmitterOptions>(section);

            // Register HttpClient and the emitter
            // It's good practice to use IHttpClientFactory
            services.AddHttpClient<IMetricEmitter, HttpMetricEmitter>()
                .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
                {
                    // Allow self-signed certs for local development if your API sink uses HTTPS with a dev cert
                    // ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator 
                });
            // You can add Polly policies for retries/circuit breakers here if needed:
            // .AddTransientHttpErrorPolicy(builder => builder.WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))))

            return services;
        }
    }
}