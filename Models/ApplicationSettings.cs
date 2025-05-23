namespace MetricsApp.Models;

public class ApplicationSettings
{
    public int RefreshInterval { get; init; } = 60; 
    
    // TODO: Improve settings to distinguish between client and server settings
    // such as select theme. Use Local Storage for client settings probably.
    public string ThemeSelection { get; init; } = "Light";
    public bool EnableNotifications { get; init; } = false; 
    public int CpuThreshold { get; init; } = 80; 
    public int MemoryThreshold { get; init; } = 1024; 
}
