export enum PluginType {
  Frontend = "Frontend",
  Backend = "Backend",
  Shared = "Shared"
}

export interface PluginSummaryDto {
  pluginId: string;
  name:     string;
  version:  string;
  type:     PluginType;
  title:    string;
  description: string;
  tags:     string[];
  hasFrontend: boolean;
}

export interface PluginManifest {
  pluginId:    string;
  name:        string;
  version:     string;
  type:        PluginType;
  title:       string;
  description: string;
  bundleUrl?: string;
  tags:        string[];
  author: {
    name:     string;
    email:    string;
    homepage: string;
  };
  entry: {
    assembly:       string;
    frontendBundle?: string;
  };
  assets: {
    dashboards: string[];
    monitors:   string[];
  };
}
