/**
 * Template Plugin Frontend Entry Point
 * 
 * This file registers the plugin with the MetricsApp frontend.
 */

import { registerPlugin } from '@metricsapp/plugin-sdk';
import { DataSourceConfig } from './components/DataSourceConfig';
import { TemplateChartPanel } from './components/TemplateChartPanel';
import { SettingsPage } from './pages/SettingsPage';

// Register the plugin with the application
registerPlugin({
  id: 'template-plugin',
  version: '1.0.0',

  // Data source configuration component
  datasourceConfig: {
    'template': DataSourceConfig,
  },

  // Dashboard panel components
  panels: {
    'template-chart': TemplateChartPanel,
  },

  // Custom routes
  routes: [
    {
      path: '/plugins/template-plugin/settings',
      component: SettingsPage,
      title: 'Template Plugin Settings',
    },
  ],

  // Navigation items
  navigation: [
    {
      id: 'template-plugin-settings',
      label: 'Template Plugin',
      icon: 'puzzle',
      path: '/plugins/template-plugin/settings',
      section: 'admin',
      order: 200,
    },
  ],

  // Lifecycle hooks
  onLoad: () => {
    console.log('Template Plugin loaded');
  },

  onUnload: () => {
    console.log('Template Plugin unloaded');
  },
});

