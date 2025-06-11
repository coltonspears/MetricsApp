namespace MetricsApp.Core.Models;

/// <summary>
/// Schema definition for datasource configuration UI
/// </summary>
public class DataSourceConfigurationSchema
{
    /// <summary>
    /// Configuration fields that should be displayed in the UI
    /// </summary>
    public List<ConfigurationField> Fields { get; set; } = new();
    
    /// <summary>
    /// Default values for configuration properties
    /// </summary>
    public Dictionary<string, object> Defaults { get; set; } = new();
    
    /// <summary>
    /// Validation rules for configuration
    /// </summary>
    public List<ValidationRule> ValidationRules { get; set; } = new();
}

/// <summary>
/// Configuration field definition for UI rendering
/// </summary>
public class ConfigurationField
{
    /// <summary>
    /// Field name/key
    /// </summary>
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Display label for the field
    /// </summary>
    public string Label { get; set; } = string.Empty;
    
    /// <summary>
    /// Field description/help text
    /// </summary>
    public string? Description { get; set; }
    
    /// <summary>
    /// Field type (text, password, number, boolean, select)
    /// </summary>
    public ConfigurationFieldType Type { get; set; } = ConfigurationFieldType.Text;
    
    /// <summary>
    /// Whether this field is required
    /// </summary>
    public bool Required { get; set; }
    
    /// <summary>
    /// Default value for this field
    /// </summary>
    public object? DefaultValue { get; set; }
    
    /// <summary>
    /// Options for select fields
    /// </summary>
    public List<SelectOption>? Options { get; set; }
    
    /// <summary>
    /// Placeholder text
    /// </summary>
    public string? Placeholder { get; set; }
}

/// <summary>
/// Configuration field types
/// </summary>
public enum ConfigurationFieldType
{
    Text,
    Password,
    Number,
    Boolean,
    Select,
    Textarea,
    Url,
    TextArea
}

/// <summary>
/// Select option for dropdown fields
/// </summary>
public class SelectOption
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}

/// <summary>
/// Validation rule for configuration fields
/// </summary>
public class ValidationRule
{
    public string FieldName { get; set; } = string.Empty;
    public ValidationType Type { get; set; }
    public string? Pattern { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
}

/// <summary>
/// Validation types
/// </summary>
public enum ValidationType
{
    Required,
    Regex,
    Url,
    Email,
    MinLength,
    MaxLength
} 