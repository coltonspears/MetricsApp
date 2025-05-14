using System.ComponentModel.DataAnnotations;

namespace MetricsApp.Models
{
    public class MetricItem
    {
        public int Id { get; set; }
        public DateTime Timestamp { get; set; }

        [Required]
        public string? ServerName { get; set; }

        [Required]
        public string? Environment { get; set; } // "QA", "Production"

        [Required]
        public string? MetricType { get; set; } // e.g., "CPUUsage", "RAMUsage", "DiskSpace"

        [Required]
        public string? MetricValue { get; set; } // Can be a simple value or a JSON string for complex metrics

        public string? Source { get; set; } // Optional: e.g., "AgentX", "ManualInput"
    }
}
