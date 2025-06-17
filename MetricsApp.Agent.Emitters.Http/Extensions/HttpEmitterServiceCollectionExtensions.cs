using System.Net;
using MetricsApp.Agent.Core.Abstractions;
using MetricsApp.Agent.Emitters.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace Microsoft.Extensions.DependencyInjection
{
    public static class HttpEmitterServiceCollectionExtensions
    {
        public static IServiceCollection AddHttpMetricEmitter(this IServiceCollection services,
            IConfiguration configuration)
        {
            var section = configuration.GetSection("MetricsAgent:HttpEmitter");
            services.Configure<HttpEmitterOptions>(section);
            
            services.AddHttpClient<IMetricEmitter, HttpMetricEmitter>()
                .ConfigurePrimaryHttpMessageHandler(sp =>
                {
                    var options = sp.GetRequiredService<IOptions<HttpEmitterOptions>>().Value;
                    var handler = new HttpClientHandler();

                    if (options.Proxy != null && !string.IsNullOrWhiteSpace(options.Proxy.Address))
                    {
                        var webProxy = new WebProxy(options.Proxy.Address);
                        if (!string.IsNullOrWhiteSpace(options.Proxy.Username) && !string.IsNullOrWhiteSpace(options.Proxy.Password))
                        {
                            webProxy.Credentials = new NetworkCredential(options.Proxy.Username, options.Proxy.Password);
                        }

                        // Use BypassList if provided
                        if (options.Proxy.BypassList != null && options.Proxy.BypassList.Any())
                        {
                            webProxy.BypassList = options.Proxy.BypassList.ToArray();
                        }

                        handler.Proxy = webProxy;
                        handler.UseProxy = true;
                    }
                    else
                    {
                        handler.UseProxy = false;
                    }

                    return handler;
                });
            // .AddTransientHttpErrorPolicy(builder => builder.WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))))

            return services;
        }
    }
}