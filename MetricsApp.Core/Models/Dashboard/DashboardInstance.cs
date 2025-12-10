namespace MetricsApp.Core.Models.Dashboard;

/// <summary>
/// A dashboard instance is a specific implementation of a template (or standalone)
/// bound to a tenant with resolved data sources and customizations.
/// </summary>
public class DashboardInstance
{
    /// <summary>
    /// Unique identifier for this dashboard instance
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    /// <summary>
    /// The tenant/organization this dashboard belongs to
    /// </summary>
    public string TenantId { get; set; } = string.Empty;
    
    /// <summary>
    /// The application/project context (for multi-app tenants)
    /// </summary>
    public string? AppId { get; set; }
    
    /// <summary>
    /// Dashboard name
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Dashboard description
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Slug for URL-friendly access
    /// </summary>
    public string Slug { get; set; } = string.Empty;
    
    /// <summary>
    /// Reference to the template this was created from (null if standalone)
    /// </summary>
    public string? TemplateId { get; set; }
    
    /// <summary>
    /// Version of the template when this instance was created/synced
    /// </summary>
    public string? TemplateVersion { get; set; }
    
    /// <summary>
    /// User ID who owns this dashboard
    /// </summary>
    public string? OwnerId { get; set; }
    
    /// <summary>
    /// Folder/directory for organization
    /// </summary>
    public string? FolderId { get; set; }
    
    /// <summary>
    /// Tags for filtering
    /// </summary>
    public List<string> Tags { get; set; } = new();
    
    /// <summary>
    /// Resolved variable values (data source bindings, etc.)
    /// </summary>
    public Dictionary<string, DashboardVariableValue> VariableValues { get; set; } = new();
    
    /// <summary>
    /// Overridden/customized panels (merged with template panels)
    /// </summary>
    public List<DashboardPanel>? PanelOverrides { get; set; }
    
    /// <summary>
    /// Full panel definitions (if standalone or significantly modified)
    /// </summary>
    public List<DashboardPanel>? Panels { get; set; }
    
    /// <summary>
    /// Time range configuration for this instance
    /// </summary>
    public TimeRangeConfig? TimeRange { get; set; }
    
    /// <summary>
    /// Auto-refresh interval in seconds (0 = disabled)
    /// </summary>
    public int? RefreshIntervalSeconds { get; set; }
    
    /// <summary>
    /// Whether this dashboard is starred/favorited
    /// </summary>
    public bool IsStarred { get; set; } = false;
    
    /// <summary>
    /// Access permissions
    /// </summary>
    public DashboardPermissions Permissions { get; set; } = new();
    
    /// <summary>
    /// Dashboard versioning for history
    /// </summary>
    public int Version { get; set; } = 1;
    
    /// <summary>
    /// Whether changes should sync from template updates
    /// </summary>
    public bool SyncWithTemplate { get; set; } = true;
    
    /// <summary>
    /// Snapshot/sharing configuration
    /// </summary>
    public DashboardSharing? Sharing { get; set; }
    
    /// <summary>
    /// Custom metadata
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }
    
    /// <summary>
    /// When this instance was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// When this instance was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// User who last modified this dashboard
    /// </summary>
    public string? LastModifiedBy { get; set; }
}

/// <summary>
/// Resolved value for a dashboard variable
/// </summary>
public class DashboardVariableValue
{
    /// <summary>
    /// The resolved value(s)
    /// </summary>
    public object Value { get; set; } = string.Empty;
    
    /// <summary>
    /// For data source variables, the data source ID
    /// </summary>
    public string? DataSourceId { get; set; }
    
    /// <summary>
    /// Whether this is using the default value
    /// </summary>
    public bool IsDefault { get; set; } = true;
    
    /// <summary>
    /// For multi-select, all selected values
    /// </summary>
    public List<string>? SelectedValues { get; set; }
}

/// <summary>
/// Dashboard access permissions
/// </summary>
public class DashboardPermissions
{
    /// <summary>
    /// Visibility level
    /// </summary>
    public DashboardVisibility Visibility { get; set; } = DashboardVisibility.Private;
    
    /// <summary>
    /// Users with explicit access (userId -> permission level)
    /// </summary>
    public Dictionary<string, DashboardPermissionLevel> UserPermissions { get; set; } = new();
    
    /// <summary>
    /// Teams with access (teamId -> permission level)
    /// </summary>
    public Dictionary<string, DashboardPermissionLevel> TeamPermissions { get; set; } = new();
    
    /// <summary>
    /// Whether anonymous users can view (for public dashboards)
    /// </summary>
    public bool AllowAnonymous { get; set; } = false;
}

public enum DashboardVisibility
{
    /// <summary>
    /// Only owner and explicit permissions
    /// </summary>
    Private,
    
    /// <summary>
    /// Anyone in the tenant can view
    /// </summary>
    TenantPublic,
    
    /// <summary>
    /// Anyone with the link can view
    /// </summary>
    LinkShared,
    
    /// <summary>
    /// Fully public (for embedded dashboards)
    /// </summary>
    Public
}

public enum DashboardPermissionLevel
{
    View = 1,
    Edit = 2,
    Admin = 4
}

/// <summary>
/// Configuration for sharing/embedding dashboards
/// </summary>
public class DashboardSharing
{
    /// <summary>
    /// Whether sharing is enabled
    /// </summary>
    public bool Enabled { get; set; } = false;
    
    /// <summary>
    /// Share token for link sharing
    /// </summary>
    public string? ShareToken { get; set; }
    
    /// <summary>
    /// Expiration time for share link
    /// </summary>
    public DateTime? ExpiresAt { get; set; }
    
    /// <summary>
    /// Whether to allow embedding in iframes
    /// </summary>
    public bool AllowEmbed { get; set; } = false;
    
    /// <summary>
    /// Snapshot ID if this is a point-in-time snapshot
    /// </summary>
    public string? SnapshotId { get; set; }
}

/// <summary>
/// Folder for organizing dashboards
/// </summary>
public class DashboardFolder
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string TenantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ParentId { get; set; }
    public string? Description { get; set; }
    public int SortOrder { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Dashboard version history entry
/// </summary>
public class DashboardVersion
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string DashboardId { get; set; } = string.Empty;
    public int Version { get; set; }
    public string? UserId { get; set; }
    public string? Message { get; set; }
    public string Data { get; set; } = string.Empty; // JSON snapshot
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

