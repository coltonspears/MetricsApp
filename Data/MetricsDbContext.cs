using Microsoft.EntityFrameworkCore;
using MetricsApp.Models;

namespace MetricsApp.Data
{
    public class MetricsDbContext : DbContext
    {
        public MetricsDbContext(DbContextOptions<MetricsDbContext> options)
            : base(options)
        {
        }

        public DbSet<MetricItem> MetricItems { get; set; } = null!;
    }
}
