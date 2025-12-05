export enum PluginType {
  Frontend = "Frontend",
  Backend = "Backend",
  Shared = "Shared",
  Dashboard = "Dashboard",
  Setup = "Setup"
}

export interface PluginSummaryDto {
  pluginId: string;
  name: string;
  version: string;
  type: string;
  title: string;
  description: string;
  tags: string[];
  hasFrontend: boolean;
}

export interface PluginManifest {
  pluginId: string;
  name: string;
  version: string;
  type: string;
  title: string;
  description: string;
  bundleUrl?: string;
  tags: string[];
  author?: {
    name?: string;
    email?: string;
    homepage?: string;
  };
  entry: {
    assembly?: string;
    frontendBundle?: string;
  };
  assets?: {
    dashboards?: string[];
    monitors?: string[];
  };
  dependencies?: Record<string, string>;
}
