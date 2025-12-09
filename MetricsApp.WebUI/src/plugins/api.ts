import { 
  PluginSummaryDto, 
  PluginManifest, 
  LoadedPluginDto, 
  DataSourcePluginDto, 
  DashboardPanelDto,
  CapabilityUsage
} from './types';
import { DataSourceApi, DataSourceConfiguration } from '../lib/datasource-api';

const API_BASE = '/api/v1';

/**
 * Load all plugin summaries (from manifests)
 */
export async function loadPluginSummaries(): Promise<PluginSummaryDto[]> {
  try {
    const res = await fetch(`${API_BASE}/plugins`);
    if (!res.ok) {
      console.error('Failed to load plugins:', res.status);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error('Error loading plugins:', error);
    return [];
  }
}

/**
 * Load a single plugin manifest by ID
 */
export async function loadPluginManifest(pluginId: string): Promise<PluginManifest | null> {
  try {
    const res = await fetch(`${API_BASE}/plugins/${pluginId}`);
    if (!res.ok) {
      console.error('Failed to load plugin manifest:', res.status);
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Error loading plugin manifest:', error);
    return null;
  }
}

/**
 * Load frontend plugins (for dynamic UI mounting)
 */
export async function loadFrontendPlugins() {
  try {
    const res = await fetch(`${API_BASE}/plugins/frontend`);
    if (!res.ok) {
      console.error('Failed to load frontend plugins:', res.status);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error('Error loading frontend plugins:', error);
    return [];
  }
}

/**
 * Load all loaded plugins with their current state
 */
export async function loadLoadedPlugins(): Promise<LoadedPluginDto[]> {
  try {
    const res = await fetch(`${API_BASE}/plugins/loaded`);
    if (!res.ok) {
      console.error('Failed to load loaded plugins:', res.status);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error('Error loading loaded plugins:', error);
    return [];
  }
}

/**
 * Load plugins by capability
 */
export async function loadPluginsByCapability(capability: string): Promise<LoadedPluginDto[]> {
  try {
    const res = await fetch(`${API_BASE}/plugins/capability/${capability}`);
    if (!res.ok) {
      console.error('Failed to load plugins by capability:', res.status);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error('Error loading plugins by capability:', error);
    return [];
  }
}

/**
 * Load all data sources from plugins
 */
export async function loadDataSourcePlugins(): Promise<DataSourcePluginDto[]> {
  try {
    const res = await fetch(`${API_BASE}/plugins/datasources`);
    if (!res.ok) {
      console.error('Failed to load data source plugins:', res.status);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error('Error loading data source plugins:', error);
    return [];
  }
}

/**
 * Load all dashboard panels from plugins
 */
export async function loadDashboardPanels(): Promise<DashboardPanelDto[]> {
  try {
    const res = await fetch(`${API_BASE}/plugins/panels`);
    if (!res.ok) {
      console.error('Failed to load dashboard panels:', res.status);
      return [];
    }
    return res.json();
  } catch (error) {
    console.error('Error loading dashboard panels:', error);
    return [];
  }
}

/**
 * Enable a plugin
 */
export async function enablePlugin(pluginId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/plugins/${pluginId}/enable`, {
      method: 'POST'
    });
    return res.ok;
  } catch (error) {
    console.error('Error enabling plugin:', error);
    return false;
  }
}

/**
 * Disable a plugin
 */
export async function disablePlugin(pluginId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/plugins/${pluginId}/disable`, {
      method: 'POST'
    });
    return res.ok;
  } catch (error) {
    console.error('Error disabling plugin:', error);
    return false;
  }
}

/**
 * Reload a plugin
 */
export async function reloadPlugin(pluginId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/plugins/${pluginId}/reload`, {
      method: 'POST'
    });
    return res.ok;
  } catch (error) {
    console.error('Error reloading plugin:', error);
    return false;
  }
}

/**
 * Get capability usage statistics for a plugin
 * This counts how many instances of each capability are being used
 */
export async function getPluginCapabilityUsage(pluginId: string, manifest: PluginManifest): Promise<CapabilityUsage[]> {
  const usages: CapabilityUsage[] = [];
  
  try {
    // Check datasource usage
    if (manifest.exports?.datasources && manifest.exports.datasources.length > 0) {
      const dataSources = await DataSourceApi.getDataSources();
      
      for (const dsExport of manifest.exports.datasources) {
        const matchingDs = dataSources.filter(
          (ds: DataSourceConfiguration) => ds.dataSourceType.toLowerCase() === dsExport.type.toLowerCase()
        );
        
        usages.push({
          capability: 'datasource',
          count: matchingDs.length,
          items: matchingDs.map((ds: DataSourceConfiguration) => ({
            id: ds.id,
            name: ds.name,
            type: ds.dataSourceType
          }))
        });
      }
    }
    
    // TODO: Add dashboard usage counting when dashboard API is available
    // TODO: Add alert channel usage counting when alert API is available
    
  } catch (error) {
    console.error('Error getting capability usage:', error);
  }
  
  return usages;
}

/**
 * Get all configured datasources
 */
export async function getConfiguredDataSources(): Promise<DataSourceConfiguration[]> {
  try {
    return await DataSourceApi.getDataSources();
  } catch (error) {
    console.error('Error getting configured datasources:', error);
    return [];
  }
}
