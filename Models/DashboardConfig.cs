using System.ComponentModel.DataAnnotations;

namespace MetricsApp.Models
{
    public class DashboardConfig
    {
        public int Id { get; set; }
        
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = "";
        
        [Required]
        public string Layout { get; set; } = "";
        
        [Required]
        public string Widgets { get; set; } = "";
        
        public string Settings { get; set; } = "{}";
        
        public bool IsDefault { get; set; } = false;
        
        public DateTime CreatedAt { get; set; }
        
        public DateTime LastModified { get; set; }
    }
} 