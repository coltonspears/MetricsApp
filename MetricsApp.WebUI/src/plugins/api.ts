import { PluginSummaryDto, PluginManifest } from './types';

export async function loadPluginSummaries(): Promise<PluginSummaryDto[]> {
  const res = await fetch('/api/plugins');
  return res.json();
}

export async function loadPluginManifest(pluginId: string): Promise<PluginManifest> {
  const res = await fetch(`/api/plugins/${pluginId}`);
  return res.json();
}

export async function loadFrontendPlugins() {
  const res = await fetch('/api/plugins/frontend');
  return res.json();
}
