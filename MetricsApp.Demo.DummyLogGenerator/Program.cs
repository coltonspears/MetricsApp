using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Text.Json;

// Main application class
public class DataSender
{
    // HttpClient is intended to be instantiated once and re-used throughout the life of an application.
    private static readonly HttpClient client = new HttpClient();
    
    private static readonly string splunkUrl = "http://localhost:8088/services/collector";
    private static readonly string splunkToken = ""; // IMPORTANT: Replace with your actual Splunk HEC token
    
    private static readonly string influxDbUrl = ""; // Target InfluxDB instance and database

    public static async Task Main(string[] args)
    {
        Console.WriteLine("Starting data sender application...");
        Console.WriteLine("Press Ctrl+C to exit.");

        // Periodically send data every 5 seconds
        while (true)
        {
            // 1. Generate some dummy data
            var dummyData = new
            {
                timestamp = DateTime.UtcNow.ToString("o"),
                level = "Info",
                message = "CPU usage is normal.",
                cpuUsage = new Random().NextDouble() * 100.0,
                memoryUsage = new Random().NextDouble() * 16.0
            };

            // 2. Send the data to Splunk and Grafana's data source (InfluxDB)
            await SendToSplunk(dummyData);
            //await SendToInfluxDB(dummyData.cpuUsage, dummyData.memoryUsage);

            // 3. Wait for the next interval
            await Task.Delay(5000);
        }
    }

    /// <summary>
    /// Sends a data payload to the Splunk HTTP Event Collector (HEC).
    /// </summary>
    /// <param name="data">The data object to send.</param>
    private static async Task SendToSplunk(object data)
    {
        try
        {
            // Splunk HEC expects a specific JSON structure: { "event": your_data }
            var splunkPayload = new { @event = data };
            string jsonPayload = JsonSerializer.Serialize(splunkPayload);

            var request = new HttpRequestMessage(HttpMethod.Post, splunkUrl);
            // Set the authorization header with the HEC token
            request.Headers.Add("Authorization", $"Splunk {splunkToken}");
            request.Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

            HttpResponseMessage response = await client.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                Console.WriteLine($"Successfully sent data to Splunk.");
            }
            else
            {
                string responseBody = await response.Content.ReadAsStringAsync();
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"Failed to send data to Splunk. Status: {response.StatusCode}. Response: {responseBody}");
                Console.ResetColor();
            }
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine($"An error occurred while sending to Splunk: {ex.Message}");
            Console.ResetColor();
        }
    }

    /// <summary>
    /// Sends metrics to InfluxDB using the InfluxDB Line Protocol format.
    /// This data can then be visualized in Grafana.
    /// </summary>
    /// <param name="cpuMetric">The CPU usage metric.</param>
    /// <param name="memoryMetric">The Memory usage metric.</param>
    private static async Task SendToInfluxDB(double cpuMetric, double memoryMetric)
    {
        try
        {
            // Format the data using InfluxDB Line Protocol:
            // measurement,tag_key=tag_value field_key=field_value
            // We escape the host name just in case it contains spaces.
            string hostName = Environment.MachineName.Replace(" ", "\\ ");
            string lineProtocolPayload = $"system_metrics,host={hostName} cpu_usage={cpuMetric:F2},memory_usage={memoryMetric:F2}";

            var request = new HttpRequestMessage(HttpMethod.Post, influxDbUrl);
            request.Content = new StringContent(lineProtocolPayload, Encoding.UTF8, "text/plain");

            HttpResponseMessage response = await client.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                Console.WriteLine("Successfully sent data to InfluxDB (for Grafana).");
            }
            else
            {
                string responseBody = await response.Content.ReadAsStringAsync();
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"Failed to send data to InfluxDB. Status: {response.StatusCode}. Response: {responseBody}");
                Console.ResetColor();
            }
        }
        catch (Exception ex)
        {
            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine($"An error occurred while sending to InfluxDB: {ex.Message}");
            Console.ResetColor();
        }
    }
}