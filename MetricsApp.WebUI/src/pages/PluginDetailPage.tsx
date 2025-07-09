import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PluginManifest } from '../plugins/types';
import { loadPluginManifest } from '../plugins/api';
import PluginHost from '../components/PluginHost';

export default function PluginDetailPage() {
  const { pluginId } = useParams<{ pluginId: string }>();
  const [manifest, setManifest] = useState<PluginManifest | null>(null);

  useEffect(() => {
    if (pluginId) loadPluginManifest(pluginId).then(setManifest);
  }, [pluginId]);

  if (!manifest) return <div>Loading…</div>;

  return (
    <div>
      <h1>{manifest.title}</h1>
      <p>{manifest.description}</p>
      <ul>
        {manifest.tags.map(t => <li key={t}>{t}</li>)}
      </ul>

      {manifest.entry.assembly
        ? <PluginHost
            pluginId="initial-setup-plugin"
            bundleUrl="/plugins/initial-setup-plugin.bundle.js" 
          />
        : <em>No front-end UI for this plugin.</em>
      }
    </div>
  );
}
