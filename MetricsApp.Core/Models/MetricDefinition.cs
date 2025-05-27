namespace MetricsApp.Abstractions.Data;

public class MetricDefinition
{
    public string Name { get; set; } = string.Empty;
    //public Dictionary<string, string> Attributes { get; set; } = new Dictionary<string, string>(); // Simplified to string-string for labels
    //public string? Unit {get; set;}
    public Dictionary<string, object> Attributes { get; set; } = new Dictionary<string, object>();
    public Dictionary<string, object> Resource { get; set; } = new Dictionary<string, object>();
        
    // Override Equals and GetHashCode for distinct selection
    public override bool Equals(object? obj)
    {
        if (obj is not MetricDefinition other) return false;
        return Name == other.Name &&
               DictionaryEquals(Attributes, other.Attributes) &&
               DictionaryEquals(Resource, other.Resource);
    }

    public override int GetHashCode()
    {
        int hash = 17;
        hash = hash * 23 + (Name?.GetHashCode() ?? 0);
        hash = hash * 23 + GetDictionaryHashCode(Attributes);
        hash = hash * 23 + GetDictionaryHashCode(Resource);
        return hash;
    }

    private bool DictionaryEquals(Dictionary<string, object> dict1, Dictionary<string, object> dict2)
    {
        if (dict1.Count != dict2.Count) return false;
        foreach (var kvp in dict1)
        {
            if (!dict2.TryGetValue(kvp.Key, out var value2) || !Equals(kvp.Value, value2))
                return false;
        }
        return true;
    }

    private int GetDictionaryHashCode(Dictionary<string, object> dict)
    {
        int hash = 19;
        foreach (var kvp in dict.OrderBy(k => k.Key)) // Order for consistent hash
        {
            hash = hash * 31 + (kvp.Key?.GetHashCode() ?? 0);
            hash = hash * 31 + (kvp.Value?.GetHashCode() ?? 0);
        }
        return hash;
    }
}
