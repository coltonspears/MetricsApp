namespace MetricsApp.Queue.RabbitMQ;

public class RabbitMqOptions
{
    public const string SectionName = "RabbitMQ";

    public string ConnectionString { get; set; } = "amqp://localhost:5672";
    public string QueuePrefix { get; set; } = "metricsapp.";
    public string ExchangeName { get; set; } = "";
    public bool Durable { get; set; } = true;
    public bool Persistent { get; set; } = true;
    public int RetryCount { get; set; } = 3;
    public TimeSpan RetryDelay { get; set; } = TimeSpan.FromSeconds(5);
} 