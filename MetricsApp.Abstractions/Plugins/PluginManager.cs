using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace MetricsApp.Abstractions.Plugins;

/// <summary>
/// Plugin manager with dependency resolution, lifecycle management, and capability discovery.
/// </summary>
public class PluginManager : IPluginManager
{
    private readonly ILogger<PluginManager> _logger;
    private readonly Dictionary<string, LoadedPlugin> _loadedPlugins = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, AssemblyLoadContext> _loadContexts = new();
    private readonly JsonSerializerOptions _jsonOptions;
    private bool _initialized;
    
    public PluginManager(ILogger<PluginManager> logger)
    {
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() }
        };
    }
    
    /// <inheritdoc />
    public IReadOnlyDictionary<string, LoadedPlugin> LoadedPlugins => _loadedPlugins;
    
    /// <inheritdoc />
    public async Task<PluginLoadResult> LoadPluginsAsync(
        string pluginsFolder, 
        IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        var result = new PluginLoadResult();
        
        if (!Directory.Exists(pluginsFolder))
        {
            _logger.LogWarning("Plugins folder does not exist: {Folder}", pluginsFolder);
            return result;
        }
        
        // 1. Discover all manifests
        var manifests = DiscoverManifests(pluginsFolder);
        result.DiscoveredCount = manifests.Count;
        
        // 2. Resolve dependencies and determine load order
        var (loadOrder, dependencyErrors) = ResolveDependencies(manifests);
        result.DependencyErrors.AddRange(dependencyErrors);
        
        // 3. Load plugins in dependency order
        foreach (var manifest in loadOrder)
        {
            try
            {
                var plugin = await LoadPluginAsync(manifest, pluginsFolder, services, cancellationToken);
                if (plugin != null)
                {
                    _loadedPlugins[manifest.PluginId] = plugin;
                    result.LoadedPlugins.Add(plugin);
                    _logger.LogInformation("Loaded plugin: {PluginId} v{Version}", 
                        manifest.PluginId, manifest.Version);
                }
            }
            catch (Exception ex)
            {
                result.LoadErrors.Add(new PluginLoadError
                {
                    PluginId = manifest.PluginId,
                    Message = ex.Message,
                    Exception = ex
                });
                _logger.LogError(ex, "Failed to load plugin: {PluginId}", manifest.PluginId);
            }
        }
        
        _initialized = true;
        return result;
    }
    
    /// <inheritdoc />
    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        foreach (var (pluginId, loadedPlugin) in _loadedPlugins)
        {
            try
            {
                var pluginConfig = configuration.GetSection($"Plugins:{pluginId}");
                loadedPlugin.Plugin.ConfigureServices(services, pluginConfig);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to configure services for plugin: {PluginId}", pluginId);
            }
        }
    }
    
    /// <inheritdoc />
    public async Task InitializePluginsAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        foreach (var (pluginId, loadedPlugin) in _loadedPlugins)
        {
            try
            {
                await loadedPlugin.Plugin.OnInitializeAsync(services, cancellationToken);
                loadedPlugin.State = PluginState.Running;
            }
            catch (Exception ex)
            {
                loadedPlugin.State = PluginState.Error;
                loadedPlugin.Error = ex.Message;
                _logger.LogError(ex, "Failed to initialize plugin: {PluginId}", pluginId);
            }
        }
    }
    
    /// <inheritdoc />
    public IEnumerable<TCapability> GetCapabilities<TCapability>() 
        where TCapability : class, Capabilities.IPluginCapability
    {
        return _loadedPlugins.Values
            .Select(p => p.Plugin.GetCapability<TCapability>())
            .Where(c => c != null)!;
    }
    
    /// <inheritdoc />
    public LoadedPlugin? GetPlugin(string pluginId)
    {
        return _loadedPlugins.TryGetValue(pluginId, out var plugin) ? plugin : null;
    }
    
    /// <inheritdoc />
    public IReadOnlyList<PluginManifest> LoadManifests(string pluginsFolder)
    {
        return DiscoverManifests(pluginsFolder);
    }
    
    #region Discovery and Loading
    
    private List<PluginManifest> DiscoverManifests(string pluginsFolder)
    {
        var manifests = new List<PluginManifest>();
        
        if (!Directory.Exists(pluginsFolder))
        {
            return manifests;
        }
        
        var manifestFiles = Directory.EnumerateFiles(pluginsFolder, "manifest.json", SearchOption.AllDirectories);
        
        foreach (var path in manifestFiles)
        {
            try
            {
                var json = File.ReadAllText(path);
                var manifest = JsonSerializer.Deserialize<PluginManifest>(json, _jsonOptions);
                if (manifest != null)
                {
                    manifest.Entry.Assembly = ResolveAssemblyPath(path, manifest.Entry.Assembly);
                    manifests.Add(manifest);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read manifest: {Path}", path);
            }
        }
        
        return manifests;
    }
    
    private string? ResolveAssemblyPath(string manifestPath, string? relativePath)
    {
        if (string.IsNullOrEmpty(relativePath)) return null;
        var pluginDir = Path.GetDirectoryName(manifestPath)!;
        return Path.Combine(pluginDir, relativePath);
    }
    
    #endregion
    
    #region Dependency Resolution
    
    private (List<PluginManifest> LoadOrder, List<string> Errors) ResolveDependencies(
        List<PluginManifest> manifests)
    {
        var errors = new List<string>();
        var resolved = new List<PluginManifest>();
        var pending = new HashSet<string>(manifests.Select(m => m.PluginId));
        var manifestLookup = manifests.ToDictionary(m => m.PluginId, StringComparer.OrdinalIgnoreCase);
        
        // Topological sort
        var visited = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var inProgress = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        
        foreach (var manifest in manifests)
        {
            if (!visited.Contains(manifest.PluginId))
            {
                Visit(manifest, manifestLookup, resolved, visited, inProgress, errors);
            }
        }
        
        return (resolved, errors);
    }
    
    private void Visit(
        PluginManifest manifest,
        Dictionary<string, PluginManifest> lookup,
        List<PluginManifest> resolved,
        HashSet<string> visited,
        HashSet<string> inProgress,
        List<string> errors)
    {
        if (inProgress.Contains(manifest.PluginId))
        {
            errors.Add($"Circular dependency detected involving plugin: {manifest.PluginId}");
            return;
        }
        
        if (visited.Contains(manifest.PluginId))
        {
            return;
        }
        
        inProgress.Add(manifest.PluginId);
        
        // Process dependencies
        if (manifest.Dependencies?.Plugins != null)
        {
            foreach (var (depId, depSpec) in manifest.Dependencies.Plugins)
            {
                if (lookup.TryGetValue(depId, out var depManifest))
                {
                    // TODO: Version checking
                    Visit(depManifest, lookup, resolved, visited, inProgress, errors);
                }
                else if (!depSpec.Optional)
                {
                    errors.Add($"Plugin {manifest.PluginId} requires missing plugin: {depId}");
                }
            }
        }
        
        inProgress.Remove(manifest.PluginId);
        visited.Add(manifest.PluginId);
        resolved.Add(manifest);
    }
    
    #endregion
    
    #region Plugin Loading
    
    private async Task<LoadedPlugin?> LoadPluginAsync(
        PluginManifest manifest,
        string pluginsFolder,
        IServiceProvider services,
        CancellationToken cancellationToken)
    {
        IPlugin? plugin = null;
        
        if (!string.IsNullOrEmpty(manifest.Entry.Assembly))
        {
            var assemblyPath = manifest.Entry.Assembly;
            if (!Path.IsPathRooted(assemblyPath))
            {
                assemblyPath = Path.Combine(pluginsFolder, assemblyPath);
            }
            
            if (!File.Exists(assemblyPath))
            {
                _logger.LogWarning("Assembly not found for plugin {PluginId}: {Path}", 
                    manifest.PluginId, assemblyPath);
                return null;
            }
            
            // Load into isolated context
            var loadContext = new PluginAssemblyLoadContext(assemblyPath);
            _loadContexts[manifest.PluginId] = loadContext;
            
            var assembly = loadContext.LoadFromAssemblyPath(assemblyPath);
            
            // Find IPlugin implementation
            var pluginTypes = assembly.GetTypes()
                .Where(t => typeof(IPlugin).IsAssignableFrom(t) && !t.IsAbstract && !t.IsInterface);
            
            foreach (var type in pluginTypes)
            {
                try
                {
                    plugin = (IPlugin?)Activator.CreateInstance(type);
                    if (plugin != null) break;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to instantiate plugin type: {Type}", type.FullName);
                }
            }
        }
        
        if (plugin == null)
        {
            _logger.LogWarning("No plugin implementation found for: {PluginId}", manifest.PluginId);
            return null;
        }
        
        var context = new PluginContext
        {
            Manifest = manifest,
            PluginDirectory = Path.GetDirectoryName(manifest.Entry.Assembly ?? pluginsFolder) ?? pluginsFolder,
            Services = services
        };
        
        await plugin.OnLoadAsync(context, cancellationToken);
        
        return new LoadedPlugin
        {
            Plugin = plugin,
            Manifest = manifest,
            State = PluginState.Loaded
        };
    }
    
    #endregion
    
    public void Dispose()
    {
        foreach (var context in _loadContexts.Values)
        {
            context.Unload();
        }
        _loadContexts.Clear();
        _loadedPlugins.Clear();
    }
}

/// <summary>
/// Represents a loaded plugin with its metadata and state.
/// </summary>
public class LoadedPlugin
{
    public required IPlugin Plugin { get; init; }
    public required PluginManifest Manifest { get; init; }
    public PluginState State { get; set; }
    public string? Error { get; set; }
}

public enum PluginState
{
    Discovered,
    Loaded,
    Running,
    Disabled,
    Error
}

/// <summary>
/// Result of plugin loading operation.
/// </summary>
public class PluginLoadResult
{
    public int DiscoveredCount { get; set; }
    public List<LoadedPlugin> LoadedPlugins { get; } = new();
    public List<PluginLoadError> LoadErrors { get; } = new();
    public List<string> DependencyErrors { get; } = new();
    
    public bool HasErrors => LoadErrors.Count > 0 || DependencyErrors.Count > 0;
}

public class PluginLoadError
{
    public required string PluginId { get; init; }
    public required string Message { get; init; }
    public Exception? Exception { get; init; }
}

/// <summary>
/// Isolated assembly load context for plugins.
/// </summary>
internal class PluginAssemblyLoadContext : AssemblyLoadContext
{
    private readonly AssemblyDependencyResolver _resolver;
    
    public PluginAssemblyLoadContext(string pluginPath) : base(isCollectible: true)
    {
        _resolver = new AssemblyDependencyResolver(pluginPath);
    }
    
    protected override Assembly? Load(AssemblyName assemblyName)
    {
        var assemblyPath = _resolver.ResolveAssemblyToPath(assemblyName);
        if (assemblyPath != null)
        {
            return LoadFromAssemblyPath(assemblyPath);
        }
        
        return null;
    }
}
