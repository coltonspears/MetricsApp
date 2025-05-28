using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MetricsApp.Agent.Core.Abstractions;
using MetricsApp.Core.Models; // For EventDto
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace MetricsApp.Agent.Core.Services
{
    public class AgentOptions
    {
        public TimeSpan CollectionInterval { get; set; } = TimeSpan.FromSeconds(60);
        
        // Default to current machine name
        public string DefaultHostName { get; set; } = Environment.MachineName; 
    }
}

