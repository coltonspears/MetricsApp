using System.CommandLine;
using System.Reflection;
using System.Text.Json;
using MetricsApp.Abstractions.Plugins;

namespace ManifestGenerator;

class Program
{
    static async Task<int> Main(string[] args)
    {
        var rootCommand = new RootCommand("Plugin manifest generator and validator for MetricsApp");

        // Generate command
        var generateCommand = new Command("generate", "Generate manifest.json from a plugin assembly");
        var assemblyOption = new Option<FileInfo>("--assembly", "Path to the plugin assembly") { IsRequired = true };
        var outputOption = new Option<FileInfo?>("--output", "Output path for manifest.json (default: manifest.json in assembly directory)");
        var forceOption = new Option<bool>("--force", "Overwrite existing manifest.json");
        
        generateCommand.AddOption(assemblyOption);
        generateCommand.AddOption(outputOption);
        generateCommand.AddOption(forceOption);
        
        generateCommand.SetHandler(async (FileInfo assembly, FileInfo? output, bool force) =>
        {
            await GenerateManifest(assembly, output, force);
        }, assemblyOption, outputOption, forceOption);

        // Validate command
        var validateCommand = new Command("validate", "Validate that manifest.json matches the plugin implementation");
        var manifestOption = new Option<FileInfo>("--manifest", "Path to manifest.json") { IsRequired = true };
        var validateAssemblyOption = new Option<FileInfo>("--assembly", "Path to the plugin assembly") { IsRequired = true };
        
        validateCommand.AddOption(manifestOption);
        validateCommand.AddOption(validateAssemblyOption);
        
        validateCommand.SetHandler(async (FileInfo manifest, FileInfo assembly) =>
        {
            await ValidateManifest(manifest, assembly);
        }, manifestOption, validateAssemblyOption);

        // Update command - reads existing manifest and updates fields that can be inferred
        var updateCommand = new Command("update", "Update an existing manifest.json with values from the plugin");
        var updateManifestOption = new Option<FileInfo>("--manifest", "Path to manifest.json") { IsRequired = true };
        var updateAssemblyOption = new Option<FileInfo>("--assembly", "Path to the plugin assembly") { IsRequired = true };
        
        updateCommand.AddOption(updateManifestOption);
        updateCommand.AddOption(updateAssemblyOption);
        
        updateCommand.SetHandler(async (FileInfo manifest, FileInfo assembly) =>
        {
            await UpdateManifest(manifest, assembly);
        }, updateManifestOption, updateAssemblyOption);

        rootCommand.AddCommand(generateCommand);
        rootCommand.AddCommand(validateCommand);
        rootCommand.AddCommand(updateCommand);

        return await rootCommand.InvokeAsync(args);
    }

    static async Task GenerateManifest(FileInfo assemblyFile, FileInfo? outputFile, bool force)
    {
        if (!assemblyFile.Exists)
        {
            Console.Error.WriteLine($"Assembly not found: {assemblyFile.FullName}");
            Environment.Exit(1);
        }

        var outputPath = outputFile?.FullName ?? Path.Combine(assemblyFile.DirectoryName!, "manifest.json");
        
        if (File.Exists(outputPath) && !force)
        {
            Console.Error.WriteLine($"Manifest already exists: {outputPath}");
            Console.Error.WriteLine("Use --force to overwrite");
            Environment.Exit(1);
        }

        try
        {
            var plugin = LoadPlugin(assemblyFile.FullName);
            if (plugin == null)
            {
                Console.Error.WriteLine("No IPlugin implementation found in assembly");
                Environment.Exit(1);
            }

            var options = ExtractOptionsFromAttributes(plugin);
            var json = PluginManifestGenerator.GenerateManifestJson(plugin, options);
            
            await File.WriteAllTextAsync(outputPath, json);
            Console.WriteLine($"Generated manifest: {outputPath}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error generating manifest: {ex.Message}");
            Environment.Exit(1);
        }
    }

    static async Task ValidateManifest(FileInfo manifestFile, FileInfo assemblyFile)
    {
        if (!manifestFile.Exists)
        {
            Console.Error.WriteLine($"Manifest not found: {manifestFile.FullName}");
            Environment.Exit(1);
        }

        if (!assemblyFile.Exists)
        {
            Console.Error.WriteLine($"Assembly not found: {assemblyFile.FullName}");
            Environment.Exit(1);
        }

        try
        {
            var plugin = LoadPlugin(assemblyFile.FullName);
            if (plugin == null)
            {
                Console.Error.WriteLine("No IPlugin implementation found in assembly");
                Environment.Exit(1);
            }

            var json = await File.ReadAllTextAsync(manifestFile.FullName);
            var manifest = JsonSerializer.Deserialize<PluginManifest>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (manifest == null)
            {
                Console.Error.WriteLine("Failed to parse manifest.json");
                Environment.Exit(1);
            }

            var result = PluginManifestGenerator.ValidateManifest(plugin, manifest);

            if (result.Errors.Any())
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("Errors:");
                foreach (var error in result.Errors)
                {
                    Console.WriteLine($"  - {error}");
                }
                Console.ResetColor();
            }

            if (result.Warnings.Any())
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("Warnings:");
                foreach (var warning in result.Warnings)
                {
                    Console.WriteLine($"  - {warning}");
                }
                Console.ResetColor();
            }

            if (result.IsValid)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("Manifest is valid!");
                Console.ResetColor();
            }
            else
            {
                Environment.Exit(1);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error validating manifest: {ex.Message}");
            Environment.Exit(1);
        }
    }

    static async Task UpdateManifest(FileInfo manifestFile, FileInfo assemblyFile)
    {
        if (!manifestFile.Exists)
        {
            Console.Error.WriteLine($"Manifest not found: {manifestFile.FullName}");
            Environment.Exit(1);
        }

        if (!assemblyFile.Exists)
        {
            Console.Error.WriteLine($"Assembly not found: {assemblyFile.FullName}");
            Environment.Exit(1);
        }

        try
        {
            var plugin = LoadPlugin(assemblyFile.FullName);
            if (plugin == null)
            {
                Console.Error.WriteLine("No IPlugin implementation found in assembly");
                Environment.Exit(1);
            }

            var json = await File.ReadAllTextAsync(manifestFile.FullName);
            var existing = JsonSerializer.Deserialize<PluginManifest>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (existing == null)
            {
                Console.Error.WriteLine("Failed to parse existing manifest.json");
                Environment.Exit(1);
            }

            // Update fields from plugin
            existing.PluginId = plugin.Id;
            existing.Name = plugin.Name;
            existing.Version = plugin.Version;
            existing.Title = plugin.Title;
            existing.Description = plugin.Description;

            // Update capabilities
            var capabilities = new List<string>();
            foreach (var cap in plugin.GetCapabilities())
            {
                var capType = cap.GetType().Name;
                if (capType.StartsWith("I") && capType.EndsWith("Capability"))
                {
                    var name = capType.Substring(1, capType.Length - "ICapability".Length - 1).ToLowerInvariant();
                    if (!capabilities.Contains(name))
                        capabilities.Add(name);
                }
            }
            existing.Capabilities = capabilities;

            var outputJson = JsonSerializer.Serialize(existing, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            });

            await File.WriteAllTextAsync(manifestFile.FullName, outputJson);
            Console.WriteLine($"Updated manifest: {manifestFile.FullName}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error updating manifest: {ex.Message}");
            Environment.Exit(1);
        }
    }

    static IPlugin? LoadPlugin(string assemblyPath)
    {
        var assembly = Assembly.LoadFrom(assemblyPath);
        var pluginTypes = assembly.GetTypes()
            .Where(t => typeof(IPlugin).IsAssignableFrom(t) && !t.IsAbstract && !t.IsInterface);

        foreach (var type in pluginTypes)
        {
            try
            {
                if (Activator.CreateInstance(type) is IPlugin plugin)
                {
                    return plugin;
                }
            }
            catch
            {
                // Continue to next type
            }
        }

        return null;
    }

    static PluginManifestOptions ExtractOptionsFromAttributes(IPlugin plugin)
    {
        var type = plugin.GetType();
        var options = new PluginManifestOptions();

        // Extract from PluginManifestAttribute
        var manifestAttr = type.GetCustomAttribute<PluginManifestAttribute>();
        if (manifestAttr != null)
        {
            options.Tags = manifestAttr.Tags?.ToList();
            options.License = manifestAttr.License;
            options.Repository = manifestAttr.Repository;
            options.FrontendBundle = manifestAttr.FrontendBundle;
            options.Permissions = manifestAttr.Permissions?.ToList();
        }

        // Extract from PluginAuthorAttribute
        var authorAttr = type.GetCustomAttribute<PluginAuthorAttribute>();
        if (authorAttr != null)
        {
            options.Author = new PluginAuthor
            {
                Name = authorAttr.Name,
                Email = authorAttr.Email,
                Homepage = authorAttr.Homepage
            };
        }

        // Extract from PluginDependencyAttributes
        var depAttrs = type.GetCustomAttributes<PluginDependencyAttribute>();
        if (depAttrs.Any())
        {
            options.Dependencies = new PluginDependencies
            {
                Plugins = depAttrs.ToDictionary(
                    d => d.PluginId,
                    d => new PluginDependencySpec { Version = d.Version, Optional = d.Optional }
                )
            };
        }

        // Extract from PluginAssetAttributes
        var assetAttrs = type.GetCustomAttributes<PluginAssetAttribute>().ToList();
        if (assetAttrs.Any())
        {
            options.Assets = new PluginAssets
            {
                Dashboards = assetAttrs.Where(a => a.AssetType == PluginAssetType.Dashboard).Select(a => a.Path).ToList(),
                Alerts = assetAttrs.Where(a => a.AssetType == PluginAssetType.Alert).Select(a => a.Path).ToList()
            };
            
            if (!options.Assets.Dashboards.Any()) options.Assets.Dashboards = null;
            if (!options.Assets.Alerts.Any()) options.Assets.Alerts = null;
        }

        return options;
    }
}

