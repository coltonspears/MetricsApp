using System.Text.Json.Serialization;

namespace MetricsApp.Abstractions.Plugins;

/// <summary>
    /// Represents the contents of a plugin's manifest.json
    /// </summary>
    public class PluginManifest
    {
        [JsonPropertyName("manifest_version")]
        public string ManifestVersion { get; set; }

        [JsonPropertyName("plugin_id")]
        public string PluginId { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; }

        [JsonPropertyName("version")]
        public string Version { get; set; }

        [JsonPropertyName("type")]
        public PluginType  Type { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; }

        [JsonPropertyName("description")]
        public string Description { get; set; }

        [JsonPropertyName("tags")]
        public List<string> Tags { get; set; }

        [JsonPropertyName("author")]
        public PluginAuthor Author { get; set; }

        [JsonPropertyName("entry")]
        public PluginEntry Entry { get; set; }

        [JsonPropertyName("assets")]
        public PluginAssets Assets { get; set; }
    }

    public class PluginAuthor
    {
        [JsonPropertyName("name")]
        public string Name { get; set; }

        [JsonPropertyName("email")]
        public string Email { get; set; }

        [JsonPropertyName("homepage")]
        public string Homepage { get; set; }
    }

    public class PluginEntry
    {
        /// <summary>
        /// Relative path (under Plugins folder) to the plugin DLL
        /// </summary>
        [JsonPropertyName("assembly")]
        public string Assembly { get; set; }

        /// <summary>
        /// Optional URL or relative path to the front-end bundle
        /// </summary>
        [JsonPropertyName("frontend_bundle")]
        public string FrontendBundle { get; set; }
    }

    public class PluginAssets
    {
        [JsonPropertyName("dashboards")]
        public List<string> Dashboards { get; set; }

        [JsonPropertyName("monitors")]
        public List<string> Monitors { get; set; }
    }