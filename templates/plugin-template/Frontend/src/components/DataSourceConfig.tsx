/**
 * Data Source Configuration Component
 * 
 * This component renders the configuration form for the template data source.
 */

import React from 'react';
import {
  FormField,
  FormSection,
  ConnectionTest,
  type DataSourceConfigProps,
  type FormFieldDefinition,
} from '@metricsapp/plugin-sdk';

const fields: FormFieldDefinition[] = [
  {
    name: 'endpoint',
    label: 'Endpoint URL',
    type: 'text',
    description: 'The API endpoint to connect to',
    placeholder: 'https://api.example.com',
    required: true,
  },
  {
    name: 'apiKey',
    label: 'API Key',
    type: 'password',
    description: 'Your API key for authentication',
    required: true,
    secret: true,
  },
  {
    name: 'timeout',
    label: 'Timeout (seconds)',
    type: 'number',
    description: 'Request timeout in seconds',
    defaultValue: 30,
    validation: {
      min: 1,
      max: 300,
    },
  },
];

export function DataSourceConfig({
  config,
  onChange,
  onTest,
  readOnly,
  errors,
}: DataSourceConfigProps) {
  const handleFieldChange = (name: string, value: unknown) => {
    onChange({ ...config, [name]: value });
  };

  return (
    <div className="space-y-6">
      <FormSection
        title="Connection Settings"
        description="Configure the connection to your data source"
      >
        {fields.map((field) => (
          <FormField
            key={field.name}
            field={field}
            value={config[field.name]}
            onChange={(value) => handleFieldChange(field.name, value)}
            error={errors?.[field.name]}
            disabled={readOnly}
          />
        ))}
      </FormSection>

      <FormSection title="Test Connection">
        <ConnectionTest onTest={onTest} disabled={readOnly} />
      </FormSection>
    </div>
  );
}

