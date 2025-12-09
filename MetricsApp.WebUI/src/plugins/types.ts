export type PluginState = 'Discovered' | 'Loaded' | 'Running' | 'Disabled' | 'Error';

export interface PluginSummaryDto {
  pluginId: string;
  name: string;
  version: string;
  capabilities: string[];
  title: string;
  description: string;
  tags: string[];
  hasFrontend: boolean;
}

export interface LoadedPluginDto {
  pluginId: string;
  name: string;
  version: string;
  title?: string;
  description?: string;
  capabilities: string[];
  state: PluginState;
  error?: string;
  hasFrontend: boolean;
}

export interface DataSourcePluginDto {
  type: string;
  displayName: string;
  description?: string;
  icon?: string;
  categories?: string[];
}

export interface DashboardPanelDto {
  type: string;
  displayName: string;
  description?: string;
  icon?: string;
  defaultSize?: {
    width: number;
    height: number;
  };
}

export interface PluginManifest {
  pluginId: string;
  name: string;
  version: string;
  title?: string;
  description?: string;
  bundleUrl?: string;
  tags?: string[];
  capabilities?: string[];
  author?: {
    name?: string;
    email?: string;
    homepage?: string;
  };
  repository?: string;
  license?: string;
  entry?: {
    assembly?: string;
    frontendBundle?: string;
    frontendStyles?: string;
  };
  dependencies?: {
    plugins?: Record<string, string | { version?: string; optional?: boolean }>;
    platform?: Record<string, string>;
  };
  exports?: {
    datasources?: Array<{
      type: string;
      displayName: string;
      description?: string;
      icon?: string;
      categories?: string[];
    }>;
    dashboardPanels?: Array<{
      type: string;
      displayName: string;
      description?: string;
      icon?: string;
    }>;
    routes?: Array<{
      path: string;
      component: string;
      title?: string;
      requiresAuth?: boolean;
    }>;
    authProviders?: Array<{
      id: string;
      displayName: string;
      icon?: string;
    }>;
    alertChannels?: Array<{
      type: string;
      displayName: string;
      icon?: string;
    }>;
  };
  settings?: {
    schema?: Record<string, unknown>;
  };
  permissions?: string[];
  assets?: {
    dashboards?: string[];
    monitors?: string[];
    alerts?: string[];
    icons?: {
      light?: string;
      dark?: string;
    };
  };
}

// Capability usage statistics
export interface CapabilityUsage {
  capability: string;
  count: number;
  items: Array<{
    id: string;
    name: string;
    type?: string;
  }>;
}

// Capability icons and labels
export const CAPABILITY_INFO: Record<string, { label: string; icon: string; color: string; description: string }> = {
  datasource: { 
    label: 'Data Source', 
    icon: 'Database', 
    color: 'var(--status-info)',
    description: 'Provides data source connectivity for metrics, logs, or traces'
  },
  dashboard: { 
    label: 'Dashboard', 
    icon: 'LayoutDashboard', 
    color: 'var(--status-success)',
    description: 'Provides dashboard panels and visualizations'
  },
  setup: { 
    label: 'Setup', 
    icon: 'Settings', 
    color: 'var(--status-warning)',
    description: 'Provides setup wizards and configuration screens'
  },
  authentication: { 
    label: 'Auth', 
    icon: 'Shield', 
    color: 'var(--interactive-primary)',
    description: 'Provides authentication and authorization providers'
  },
  alertchannel: { 
    label: 'Alerts', 
    icon: 'Bell', 
    color: 'var(--status-error)',
    description: 'Provides alert notification channels'
  },
  routes: { 
    label: 'Routes', 
    icon: 'Route', 
    color: 'var(--text-secondary)',
    description: 'Provides custom routes and pages'
  },
  persistence: { 
    label: 'Storage', 
    icon: 'HardDrive', 
    color: 'var(--text-muted)',
    description: 'Provides data persistence and storage backends'
  },
};

// State colors
export const STATE_COLORS: Record<PluginState, string> = {
  Discovered: 'var(--text-muted)',
  Loaded: 'var(--status-warning)',
  Running: 'var(--status-success)',
  Disabled: 'var(--text-muted)',
  Error: 'var(--status-error)',
};

// State descriptions
export const STATE_DESCRIPTIONS: Record<PluginState, string> = {
  Discovered: 'Plugin found but not yet loaded',
  Loaded: 'Plugin loaded but not initialized',
  Running: 'Plugin is active and operational',
  Disabled: 'Plugin is installed but disabled',
  Error: 'Plugin encountered an error',
};
