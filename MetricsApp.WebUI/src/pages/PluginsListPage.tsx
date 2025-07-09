import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PluginSummaryDto } from '../plugins/types';
import { loadPluginSummaries } from '../plugins/api';

export default function PluginsListPage() {
  const [plugins, setPlugins] = useState<PluginSummaryDto[]>([]);

  useEffect(() => {
    loadPluginSummaries().then(setPlugins);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-4">
      {plugins.map(p => (
        <div key={p.pluginId} className="bg-themed-bg-tertiary overflow-hidden shadow-lg rounded-lg border border-themed-border-primary hover:shadow-xl transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between">
        <Link
          key={p.pluginId}
          to={`/plugins/${p.pluginId}`}
        >
          <h3 className="text-lg font-semibold text-themed-text-primary">{p.title}</h3>
          <p className="text-themed-text-secondary">{p.description}</p>
          <small className="text-themed-text-secondary">{p.version} • {p.type}</small>
        </Link></div></div></div>
      ))}
    </div>
  );
}
