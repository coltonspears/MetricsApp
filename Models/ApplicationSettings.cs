namespace MetricsApp.Models;

public class ApplicationSettings
{
    public int RefreshInterval { get; set; } = 60; 
    
    // TODO: Improve settings to distinguish between client and server settings
    // such as select theme. Use Local Storage for client settings probably.
    public string ThemeSelection { get; set; } = "Light";
    public bool EnableNotifications { get; set; } = false; 
    public int CpuThreshold { get; set; } = 80; 
    public int MemoryThreshold { get; set; } = 1024; 
}
