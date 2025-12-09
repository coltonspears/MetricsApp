using MetricsApp.Abstractions.Plugins.Capabilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MetricsApp.Abstractions.Plugins;

/// <summary>
/// Base class for plugins that provides common functionality.
/// Inherit from this class and implement the desired capability interfaces.
/// </summary>
public abstract class PluginBase : IPlugin
{
    private readonly List<IPluginCapability> _capabilities = new();
    
    /// <inheritdoc />
    public abstract string Id { get; }
    
    /// <inheritdoc />
    public abstract string Name { get; }
    
    /// <inheritdoc />
    public abstract string Version { get; }
    
    /// <inheritdoc />
    public virtual string Title => Name;
    
    /// <inheritdoc />
    public virtual string Description => string.Empty;
    
    protected PluginBase()
    {
        // Auto-discover capabilities from implemented interfaces
        DiscoverCapabilities();
    }
    
    private void DiscoverCapabilities()
    {
        var capabilityInterface = typeof(IPluginCapability);
        var implementedInterfaces = GetType().GetInterfaces()
            .Where(i => i != capabilityInterface && capabilityInterface.IsAssignableFrom(i));
        
        foreach (var iface in implementedInterfaces)
        {
            if (this is IPluginCapability capability)
            {
                _capabilities.Add(capability);
            }
        }
    }
    
    /// <summary>
    /// Register an additional capability (for composition pattern)
    /// </summary>
    protected void RegisterCapability(IPluginCapability capability)
    {
        if (!_capabilities.Contains(capability))
        {
            _capabilities.Add(capability);
        }
    }
    
    /// <inheritdoc />
    public IEnumerable<IPluginCapability> GetCapabilities()
    {
        // Return self if this class implements any capabilities directly
        if (this is IPluginCapability selfCapability)
        {
            yield return selfCapability;
        }
        
        // Return any registered capabilities
        foreach (var capability in _capabilities)
        {
            if (capability != this)
            {
                yield return capability;
            }
        }
    }
    
    /// <inheritdoc />
    public TCapability? GetCapability<TCapability>() where TCapability : class, IPluginCapability
    {
        // Check if this class implements the capability
        if (this is TCapability selfCapability)
        {
            return selfCapability;
        }
        
        // Check registered capabilities
        return _capabilities.OfType<TCapability>().FirstOrDefault();
    }
    
    /// <inheritdoc />
    public bool HasCapability<TCapability>() where TCapability : class, IPluginCapability
    {
        return this is TCapability || _capabilities.OfType<TCapability>().Any();
    }
    
    /// <inheritdoc />
    public virtual void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        // Override in derived classes to register services
    }
    
    /// <inheritdoc />
    public virtual Task OnLoadAsync(PluginContext context, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
    
    /// <inheritdoc />
    public virtual Task OnInitializeAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
    
    /// <inheritdoc />
    public virtual Task OnShutdownAsync(CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}

