using System.ComponentModel.DataAnnotations;
using MetricsApp.Core.Models;

namespace MetricsApp.Api.Models;

public class IngestApiRequest
{
    // API Key can be added later for authentication
    // public string ApiKey { get; set; }

    [Required]
    [MinLength(1)]
    public List<EventDto> Events { get; set; } = new List<EventDto>();
}