import { PluginSummaryDto, PluginManifest } from './types';

const API_BASE = '/api/v1';

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
