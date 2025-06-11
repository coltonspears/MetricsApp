# JSON Serialization Test for DataSourceTypeInfo

## Problem
The original error occurred because `DataSourceTypeInfo.Factory` property (a `Func<IServiceProvider, IDataSource>` delegate) cannot be serialized to JSON.

## Solution Applied
Added `[JsonIgnore]` attribute to the `Factory` property in `DataSourceTypeInfo` class:

```csharp
/// <summary>
/// Factory function to create instances
/// </summary>
[JsonIgnore]
public Func<IServiceProvider, IDataSource> Factory { get; set; } = _ => throw new NotImplementedException();
```

## Test Code
Here's a simple test to verify the fix works:

```csharp
using System.Text.Json;
using MetricsApp.Abstractions.DataSources;
using MetricsApp.Core.Models;

// Create a test DataSourceTypeInfo instance
var typeInfo = new DataSourceTypeInfo
{
    DataSourceType = "prometheus",
    DisplayName = "Prometheus",
    Description = "Test datasource",
    Version = "1.0.0",
    ConfigurationSchema = new DataSourceConfigurationSchema(),
    Factory = serviceProvider => throw new NotImplementedException() // This should be ignored
};

// Test JSON serialization
try
{
    string json = JsonSerializer.Serialize(typeInfo);
    Console.WriteLine("✅ Serialization successful!");
    Console.WriteLine($"JSON: {json}");
    
    // Verify Factory property is not in JSON
    if (!json.Contains("Factory"))
    {
        Console.WriteLine("✅ Factory property correctly excluded from JSON");
    }
    else
    {
        Console.WriteLine("❌ Factory property still present in JSON");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"❌ Serialization failed: {ex.Message}");
}
```

## Expected Output
```json
{
  "DataSourceType": "prometheus",
  "DisplayName": "Prometheus", 
  "Description": "Test datasource",
  "Version": "1.0.0",
  "ConfigurationSchema": {
    "Fields": [],
    "Defaults": {},
    "ValidationRules": []
  }
}
```

## Verification
The JSON output should:
1. ✅ Not contain a "Factory" property
2. ✅ Include all other properties (DataSourceType, DisplayName, etc.)
3. ✅ Serialize without throwing exceptions

## API Endpoint Test
Once the application is restarted, test the `/api/v1/datasources/types` endpoint:

```bash
curl http://localhost:5000/api/v1/datasources/types
```

Expected response:
```json
[
  {
    "dataSourceType": "prometheus",
    "displayName": "Prometheus",
    "description": "Query metrics from Prometheus time-series database",
    "version": "1.0.0",
    "configurationSchema": {
      "fields": [...],
      "defaults": {...},
      "validationRules": [...]
    }
  }
]
```

## Alternative Solutions (if needed)
If the `JsonIgnore` approach doesn't work for some reason, here are alternatives:

### 1. Create a separate DTO class
```csharp
public class DataSourceTypeInfoDto
{
    public string DataSourceType { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public DataSourceConfigurationSchema ConfigurationSchema { get; set; } = new();
    
    // No Factory property
}
```

### 2. Use JsonSerializerOptions
```csharp
var options = new JsonSerializerOptions
{
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};
// Configure to ignore specific properties
```

### 3. Custom JsonConverter
```csharp
public class DataSourceTypeInfoConverter : JsonConverter<DataSourceTypeInfo>
{
    public override void Write(Utf8JsonWriter writer, DataSourceTypeInfo value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();
        writer.WriteString("dataSourceType", value.DataSourceType);
        writer.WriteString("displayName", value.DisplayName);
        writer.WriteString("description", value.Description);
        writer.WriteString("version", value.Version);
        writer.WritePropertyName("configurationSchema");
        JsonSerializer.Serialize(writer, value.ConfigurationSchema, options);
        writer.WriteEndObject();
    }
    
    // Read implementation...
}
```

## Conclusion
The `[JsonIgnore]` attribute is the simplest and most effective solution for this issue. It prevents the non-serializable `Factory` delegate from being included in JSON serialization while preserving all other functionality. 