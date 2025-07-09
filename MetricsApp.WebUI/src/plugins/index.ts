export interface FrontendPluginManifest {
    pluginId:     string;
    name:         string;
    version:      string;
    mountPointId: string;
    bundleUrl:    string;
  }
  
  export async function loadPlugins(): Promise<FrontendPluginManifest[]> {
    const res = await fetch('/api/plugins/frontend');
    return res.json();
  }