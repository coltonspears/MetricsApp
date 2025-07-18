using MetricsApp.Abstractions.Queue;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;

namespace MetricsApp.Queue.RabbitMQ.Extensions;

public static class RabbitMqServiceCollectionExtensions
{
    public static IServiceCollection AddRabbitMqQueue(this IServiceCollection services, IConfiguration configuration)
    {
        // Configure options
        services.Configure<RabbitMqOptions>(configuration.GetSection(RabbitMqOptions.SectionName));

        // Register RabbitMQ connection as singleton
        services.AddSingleton<IConnection>(provider =>
        {
            var options = provider.GetRequiredService<IOptions<RabbitMqOptions>>().Value;
            var factory = new ConnectionFactory
            {
                Uri = new Uri(options.ConnectionString),
                AutomaticRecoveryEnabled = true,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(10)
            };
            return factory.CreateConnection();
        });

        // Register generic queue implementations
        services.AddTransient(typeof(IMessageQueueProducer<>), typeof(RabbitMqMessageQueue<>));
        services.AddTransient(typeof(IMessageQueueConsumer<>), typeof(RabbitMqMessageQueue<>));

        return services;
    }

    public static IServiceCollection AddRabbitMqQueue(this IServiceCollection services, Action<RabbitMqOptions> configureOptions)
    {
        services.Configure(configureOptions);

        // Register RabbitMQ connection as singleton
        services.AddSingleton<IConnection>(provider =>
        {
            var options = provider.GetRequiredService<IOptions<RabbitMqOptions>>().Value;
            var factory = new ConnectionFactory
            {
                Uri = new Uri(options.ConnectionString),
                AutomaticRecoveryEnabled = true,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(10)
            };
            return factory.CreateConnection();
        });

        // Register generic queue implementations
        services.AddTransient(typeof(IMessageQueueProducer<>), typeof(RabbitMqMessageQueue<>));
        services.AddTransient(typeof(IMessageQueueConsumer<>), typeof(RabbitMqMessageQueue<>));

        return services;
    }
} 