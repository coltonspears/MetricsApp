/**
 * Plugin Registry
 * 
 * Manages registration and discovery of plugins at runtime.
 */

import type { ComponentType } from 'react';
import type {
  DataSourceConfigProps,
  NavigationItem,
  PanelProps,
  PluginDefinition,
  PluginRoute,
  PluginSettingsProps,
} from './types';

// Global plugin registry
const plugins = new Map<string, PluginDefinition>();

// Component registries
const datasourceConfigs = new Map<string, ComponentType<DataSourceConfigProps>>();
const panels = new Map<string, ComponentType<PanelProps>>();
const routes: PluginRoute[] = [];
const navigationItems: NavigationItem[] = [];
const settingsComponents = new Map<string, ComponentType<PluginSettingsProps>>();

/**
 * Register a plugin with the application
 */
export function registerPlugin(definition: PluginDefinition): void {
  if (plugins.has(definition.id)) {
    console.warn(`Plugin ${definition.id} is already registered. Overwriting...`);
  }

  plugins.set(definition.id, definition);

  // Register data source configs
  if (definition.datasourceConfig) {
    for (const [type, component] of Object.entries(definition.datasourceConfig)) {
      datasourceConfigs.set(type, component);
    }
  }

  // Register panels
  if (definition.panels) {
    for (const [type, component] of Object.entries(definition.panels)) {
      panels.set(`${definition.id}:${type}`, component);
    }
  }

  // Register routes
  if (definition.routes) {
    for (const route of definition.routes) {
      routes.push({
        ...route,
        path: route.path.startsWith('/') ? route.path : `/${route.path}`,
      });
    }
  }

  // Register navigation items
  if (definition.navigation) {
    navigationItems.push(...definition.navigation);
    // Sort by order
    navigationItems.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  // Register settings component
  if (definition.settingsComponent) {
    settingsComponents.set(definition.id, definition.settingsComponent);
  }

  // Call onLoad if defined
  if (definition.onLoad) {
    Promise.resolve(definition.onLoad()).catch((err) => {
      console.error(`Error in plugin ${definition.id} onLoad:`, err);
    });
  }

  console.log(`Plugin registered: ${definition.id} v${definition.version}`);
}

/**
 * Unregister a plugin
 */
export function unregisterPlugin(pluginId: string): void {
  const definition = plugins.get(pluginId);
  if (!definition) return;

  // Call onUnload if defined
  if (definition.onUnload) {
    Promise.resolve(definition.onUnload()).catch((err) => {
      console.error(`Error in plugin ${pluginId} onUnload:`, err);
    });
  }

  // Remove data source configs
  if (definition.datasourceConfig) {
    for (const type of Object.keys(definition.datasourceConfig)) {
      datasourceConfigs.delete(type);
    }
  }

  // Remove panels
  if (definition.panels) {
    for (const type of Object.keys(definition.panels)) {
      panels.delete(`${pluginId}:${type}`);
    }
  }

  // Remove routes (can't easily remove, would need to track)
  // For now, routes persist

  // Remove navigation items
  const navIndices: number[] = [];
  definition.navigation?.forEach((nav) => {
    const idx = navigationItems.findIndex((n) => n.id === nav.id);
    if (idx !== -1) navIndices.push(idx);
  });
  navIndices.sort((a, b) => b - a).forEach((idx) => navigationItems.splice(idx, 1));

  // Remove settings component
  settingsComponents.delete(pluginId);

  plugins.delete(pluginId);
  console.log(`Plugin unregistered: ${pluginId}`);
}

/**
 * Get a registered plugin by ID
 */
export function getPlugin(pluginId: string): PluginDefinition | undefined {
  return plugins.get(pluginId);
}

/**
 * Get all registered plugins
 */
export function getAllPlugins(): PluginDefinition[] {
  return Array.from(plugins.values());
}

/**
 * Get a data source configuration component by type
 */
export function getDataSourceConfig(
  type: string
): ComponentType<DataSourceConfigProps> | undefined {
  return datasourceConfigs.get(type);
}

/**
 * Get all registered data source types
 */
export function getDataSourceTypes(): string[] {
  return Array.from(datasourceConfigs.keys());
}

/**
 * Get a panel component by type
 */
export function getPanel(type: string): ComponentType<PanelProps> | undefined {
  return panels.get(type);
}

/**
 * Get all registered panel types
 */
export function getPanelTypes(): string[] {
  return Array.from(panels.keys());
}

/**
 * Get all registered routes
 */
export function getRoutes(): PluginRoute[] {
  return [...routes];
}

/**
 * Get all registered navigation items
 */
export function getNavigationItems(): NavigationItem[] {
  return [...navigationItems];
}

/**
 * Get navigation items by section
 */
export function getNavigationBySection(section: string): NavigationItem[] {
  return navigationItems.filter((item) => item.section === section);
}

/**
 * Get a settings component for a plugin
 */
export function getSettingsComponent(
  pluginId: string
): ComponentType<PluginSettingsProps> | undefined {
  return settingsComponents.get(pluginId);
}

// ============================================================================
// Global Plugin API (exposed on window for UMD bundles)
// ============================================================================

/**
 * The global MetricsApp Plugin SDK object
 */
export const MetricsAppPluginSDK = {
  registerPlugin,
  unregisterPlugin,
  getPlugin,
  getAllPlugins,
  getDataSourceConfig,
  getDataSourceTypes,
  getPanel,
  getPanelTypes,
  getRoutes,
  getNavigationItems,
  getNavigationBySection,
  getSettingsComponent,
};

// Expose globally for UMD plugin bundles
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).MetricsAppPluginSDK = MetricsAppPluginSDK;
}

