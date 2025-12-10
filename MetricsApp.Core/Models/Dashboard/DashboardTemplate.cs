namespace MetricsApp.Core.Models.Dashboard;

/// <summary>
/// A reusable dashboard template that can be instantiated across tenants/apps.
/// Templates define the structure and use variables for data sources.
/// </summary>
public class DashboardTemplate
{
    /// <summary>
    /// Unique identifier for this template
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    /// <summary>
    /// Template name (e.g., "Kubernetes Overview")
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Detailed description of what this dashboard shows
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Version of this template (for tracking updates)
    /// </summary>
    public string Version { get; set; } = "1.0.0";
    
    /// <summary>
    /// Author/creator of the template
    /// </summary>
    public string? Author { get; set; }
    
    /// <summary>
    /// Tags for categorization and search
    /// </summary>
    public List<string> Tags { get; set; } = new();
    
    /// <summary>
    /// Category/folder for organization (e.g., "Infrastructure", "Application")
    /// </summary>
    public string? Category { get; set; }
    
    /// <summary>
    /// Preview image URL or base64 thumbnail
    /// </summary>
    public string? PreviewImage { get; set; }
    
    /// <summary>
    /// Variable definitions (data source placeholders, constants)
    /// </summary>
    public List<DashboardVariable> Variables { get; set; } = new();
    
    /// <summary>
    /// Panel definitions for this dashboard
    /// </summary>
    public List<DashboardPanel> Panels { get; set; } = new();
    
    /// <summary>
    /// Default time range for this dashboard
    /// </summary>
    public TimeRangeConfig DefaultTimeRange { get; set; } = new();
    
    /// <summary>
    /// Default auto-refresh interval in seconds (0 = disabled)
    /// </summary>
    public int RefreshIntervalSeconds { get; set; } = 30;
    
    /// <summary>
    /// Layout configuration
    /// </summary>
    public DashboardLayout Layout { get; set; } = new();
    
    /// <summary>
    /// Annotations/overlay definitions
    /// </summary>
    public List<DashboardAnnotation> Annotations { get; set; } = new();
    
    /// <summary>
    /// Whether this is a built-in system template
    /// </summary>
    public bool IsSystem { get; set; } = false;
    
    /// <summary>
    /// Whether this template is published/available for use
    /// </summary>
    public bool IsPublished { get; set; } = true;
    
    /// <summary>
    /// Plugin ID that provides this template (if from a plugin)
    /// </summary>
    public string? SourcePluginId { get; set; }
    
    /// <summary>
    /// Required data source types to use this template
    /// </summary>
    public List<string> RequiredDataSourceTypes { get; set; } = new();
    
    /// <summary>
    /// When this template was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// When this template was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// A variable definition for templates (can be data source, constant, query-based, etc.)
/// </summary>
public class DashboardVariable
{
    /// <summary>
    /// Variable name (used in queries as $variableName or ${variableName})
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Display label in the UI
    /// </summary>
    public string Label { get; set; } = string.Empty;
    
    /// <summary>
    /// Description/help text
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Variable type
    /// </summary>
    public DashboardVariableType Type { get; set; } = DashboardVariableType.Constant;
    
    /// <summary>
    /// Default value
    /// </summary>
    public string? DefaultValue { get; set; }
    
    /// <summary>
    /// For query-based variables, the query to execute
    /// </summary>
    public string? Query { get; set; }
    
    /// <summary>
    /// Data source reference for query-based variables
    /// </summary>
    public string? DataSourceRef { get; set; }
    
    /// <summary>
    /// For select/multi-select, the available options
    /// </summary>
    public List<VariableOption>? Options { get; set; }
    
    /// <summary>
    /// Whether multiple values can be selected
    /// </summary>
    public bool Multi { get; set; } = false;
    
    /// <summary>
    /// Include "All" option for multi-select
    /// </summary>
    public bool IncludeAll { get; set; } = false;
    
    /// <summary>
    /// Sort order for options
    /// </summary>
    public int SortOrder { get; set; } = 0;
    
    /// <summary>
    /// Whether to hide this variable from the UI
    /// </summary>
    public bool Hidden { get; set; } = false;
    
    /// <summary>
    /// For datasource type, which data source types are allowed
    /// </summary>
    public List<string>? AllowedDataSourceTypes { get; set; }
}

public enum DashboardVariableType
{
    /// <summary>
    /// Static constant value
    /// </summary>
    Constant,
    
    /// <summary>
    /// User text input
    /// </summary>
    TextInput,
    
    /// <summary>
    /// Data source selector
    /// </summary>
    DataSource,
    
    /// <summary>
    /// Query-based dynamic values
    /// </summary>
    Query,
    
    /// <summary>
    /// Custom predefined options
    /// </summary>
    Custom,
    
    /// <summary>
    /// Time interval selector
    /// </summary>
    Interval
}

public class VariableOption
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool Selected { get; set; } = false;
}

/// <summary>
/// Panel definition within a dashboard
/// </summary>
public class DashboardPanel
{
    /// <summary>
    /// Unique panel ID within the dashboard
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    /// <summary>
    /// Panel title
    /// </summary>
    public string Title { get; set; } = string.Empty;
    
    /// <summary>
    /// Optional description shown on hover
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Panel visualization type (e.g., "timeseries", "stat", "table", "gauge")
    /// </summary>
    public string Type { get; set; } = "timeseries";
    
    /// <summary>
    /// Grid position and size
    /// </summary>
    public PanelGridPosition GridPos { get; set; } = new();
    
    /// <summary>
    /// Data source reference (can use variable: "$datasource")
    /// </summary>
    public string? DataSourceRef { get; set; }
    
    /// <summary>
    /// Queries to execute for this panel
    /// </summary>
    public List<PanelQuery> Queries { get; set; } = new();
    
    /// <summary>
    /// Visualization-specific options
    /// </summary>
    public Dictionary<string, object> Options { get; set; } = new();
    
    /// <summary>
    /// Field configuration (overrides, thresholds, mappings)
    /// </summary>
    public PanelFieldConfig FieldConfig { get; set; } = new();
    
    /// <summary>
    /// Whether the panel is collapsed (for row panels)
    /// </summary>
    public bool Collapsed { get; set; } = false;
    
    /// <summary>
    /// Repeat configuration (repeat panel for each value of a variable)
    /// </summary>
    public PanelRepeat? Repeat { get; set; }
    
    /// <summary>
    /// Custom panel links
    /// </summary>
    public List<PanelLink> Links { get; set; } = new();
    
    /// <summary>
    /// Alert rules attached to this panel
    /// </summary>
    public List<PanelAlert>? Alerts { get; set; }
}

public class PanelGridPosition
{
    public int X { get; set; } = 0;
    public int Y { get; set; } = 0;
    public int Width { get; set; } = 12;
    public int Height { get; set; } = 8;
}

public class PanelQuery
{
    /// <summary>
    /// Query reference ID (A, B, C, etc.)
    /// </summary>
    public string RefId { get; set; } = "A";
    
    /// <summary>
    /// Query expression (can contain variables like $metric, $instance)
    /// </summary>
    public string Expression { get; set; } = string.Empty;
    
    /// <summary>
    /// Query format hint
    /// </summary>
    public string? Format { get; set; }
    
    /// <summary>
    /// Legend format
    /// </summary>
    public string? LegendFormat { get; set; }
    
    /// <summary>
    /// Query interval (can use $__interval)
    /// </summary>
    public string? Interval { get; set; }
    
    /// <summary>
    /// Whether this query is hidden from the legend
    /// </summary>
    public bool Hidden { get; set; } = false;
    
    /// <summary>
    /// Query-type specific options
    /// </summary>
    public Dictionary<string, object> QueryOptions { get; set; } = new();
}

public class PanelFieldConfig
{
    public PanelFieldDefaults Defaults { get; set; } = new();
    public List<PanelFieldOverride> Overrides { get; set; } = new();
}

public class PanelFieldDefaults
{
    public string? Unit { get; set; }
    public int? Decimals { get; set; }
    public double? Min { get; set; }
    public double? Max { get; set; }
    public string? Color { get; set; }
    public List<Threshold> Thresholds { get; set; } = new();
    public List<ValueMapping> Mappings { get; set; } = new();
}

public class PanelFieldOverride
{
    public FieldMatcher Matcher { get; set; } = new();
    public Dictionary<string, object> Properties { get; set; } = new();
}

public class FieldMatcher
{
    public string Id { get; set; } = "byName";
    public string? Options { get; set; }
}

public class Threshold
{
    public double Value { get; set; }
    public string Color { get; set; } = "green";
    public string? Label { get; set; }
}

public class ValueMapping
{
    public string Type { get; set; } = "value";
    public object? Match { get; set; }
    public MappingResult Result { get; set; } = new();
}

public class MappingResult
{
    public string? Text { get; set; }
    public string? Color { get; set; }
    public int? Index { get; set; }
}

public class PanelRepeat
{
    public string Variable { get; set; } = string.Empty;
    public string Direction { get; set; } = "horizontal";
    public int? MaxPerRow { get; set; }
}

public class PanelLink
{
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public bool TargetBlank { get; set; } = true;
}

public class PanelAlert
{
    public string Name { get; set; } = string.Empty;
    public List<AlertCondition> Conditions { get; set; } = new();
    public int EvaluateEverySeconds { get; set; } = 60;
    public int ForSeconds { get; set; } = 300;
}

public class AlertCondition
{
    public string Type { get; set; } = "threshold";
    public string Evaluator { get; set; } = "gt";
    public double Value { get; set; }
    public string Reducer { get; set; } = "avg";
}

public class TimeRangeConfig
{
    public string From { get; set; } = "now-1h";
    public string To { get; set; } = "now";
}

public class DashboardLayout
{
    /// <summary>
    /// Number of columns in the grid (default 24 like Grafana)
    /// </summary>
    public int Columns { get; set; } = 24;
    
    /// <summary>
    /// Row height in pixels
    /// </summary>
    public int RowHeight { get; set; } = 30;
    
    /// <summary>
    /// Whether panels can be dragged
    /// </summary>
    public bool Draggable { get; set; } = true;
    
    /// <summary>
    /// Whether panels can be resized
    /// </summary>
    public bool Resizable { get; set; } = true;
}

public class DashboardAnnotation
{
    public string Name { get; set; } = string.Empty;
    public string DataSourceRef { get; set; } = string.Empty;
    public string Query { get; set; } = string.Empty;
    public string IconColor { get; set; } = "#10b981";
    public bool Enabled { get; set; } = true;
}

