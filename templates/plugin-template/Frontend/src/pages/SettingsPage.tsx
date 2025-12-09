/**
 * Plugin Settings Page
 * 
 * A settings/configuration page for the plugin.
 */

import React from 'react';
import {
  usePluginSettings,
  usePluginContext,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  FormField,
  Button,
  Alert,
  type RouteComponentProps,
  type FormFieldDefinition,
} from '@metricsapp/plugin-sdk';

const settingsFields: FormFieldDefinition[] = [
  {
    name: 'enabled',
    label: 'Enable Plugin',
    type: 'boolean',
    description: 'Enable or disable the plugin functionality',
    defaultValue: true,
  },
  {
    name: 'refreshInterval',
    label: 'Refresh Interval (seconds)',
    type: 'number',
    description: 'How often to refresh data automatically',
    defaultValue: 30,
    validation: {
      min: 5,
      max: 3600,
    },
  },
  {
    name: 'maxResults',
    label: 'Maximum Results',
    type: 'number',
    description: 'Maximum number of results to return from queries',
    defaultValue: 1000,
    validation: {
      min: 10,
      max: 10000,
    },
  },
  {
    name: 'debugMode',
    label: 'Debug Mode',
    type: 'boolean',
    description: 'Enable verbose logging for troubleshooting',
    defaultValue: false,
  },
];

const defaultSettings = {
  enabled: true,
  refreshInterval: 30,
  maxResults: 1000,
  debugMode: false,
};

export function SettingsPage({ pluginContext }: RouteComponentProps) {
  const { manifest } = pluginContext;
  const { settings, updateSettings, save, loading, saving, error } = usePluginSettings(defaultSettings);

  const handleFieldChange = (name: string, value: unknown) => {
    updateSettings({ [name]: value });
  };

  const handleSave = async () => {
    try {
      await save();
    } catch {
      // Error is already captured in the hook
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-current border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {manifest.title || manifest.name} Settings
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Configure plugin behavior and preferences
        </p>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader
          title="General Settings"
          description="Configure the basic plugin settings"
        />
        <CardContent className="space-y-4">
          {settingsFields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={settings[field.name]}
              onChange={(value) => handleFieldChange(field.name, value)}
            />
          ))}
        </CardContent>
        <CardFooter>
          <Button variant="secondary" onClick={() => updateSettings(defaultSettings)}>
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save Settings
          </Button>
        </CardFooter>
      </Card>

      <Card className="mt-6">
        <CardHeader
          title="Plugin Information"
          description="Details about this plugin"
        />
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Plugin ID</dt>
              <dd className="text-[var(--text-primary)] font-mono">{manifest.pluginId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Version</dt>
              <dd className="text-[var(--text-primary)]">{manifest.version}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--text-secondary)]">Capabilities</dt>
              <dd className="text-[var(--text-primary)]">
                {manifest.capabilities?.join(', ') || 'None'}
              </dd>
            </div>
            {manifest.author && (
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Author</dt>
                <dd className="text-[var(--text-primary)]">{manifest.author.name}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

