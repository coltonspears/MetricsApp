/**
 * Plugin SDK Type Definitions
 */

import { ComponentType, ReactNode } from 'react';

// ============================================================================
// Core Plugin Types
// ============================================================================

export interface PluginDefinition {
  /** Unique plugin identifier - must match manifest.json plugin_id */
  id: string;
  
  /** Plugin version */
  version: string;
  
  /** Data source configuration components */
  datasourceConfig?: Record<string, ComponentType<DataSourceConfigProps>>;
  
  /** Dashboard panel components */
  panels?: Record<string, ComponentType<PanelProps>>;
  
  /** Custom routes/pages */
  routes?: PluginRoute[];
  
  /** Navigation items to add */
  navigation?: NavigationItem[];
  
  /** Settings/configuration page component */
  settingsComponent?: ComponentType<PluginSettingsProps>;
  
  /** Called when plugin is loaded */
  onLoad?: () => void | Promise<void>;
  
  /** Called when plugin is unloaded */
  onUnload?: () => void | Promise<void>;
}

// ============================================================================
// Data Source Types
// ============================================================================

export interface DataSourceConfigProps {
  /** Current configuration values */
  config: Record<string, unknown>;
  
  /** Called when configuration changes */
  onChange: (config: Record<string, unknown>) => void;
  
  /** Test the connection with current config */
  onTest: () => Promise<TestConnectionResult>;
  
  /** Whether the form is in read-only mode */
  readOnly?: boolean;
  
  /** Validation errors */
  errors?: Record<string, string>;
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface DataSourceInstance {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  status: 'connected' | 'disconnected' | 'error';
}

// ============================================================================
// Dashboard Panel Types
// ============================================================================

export interface PanelProps {
  /** Panel configuration options */
  options: Record<string, unknown>;
  
  /** Data from queries */
  data: PanelData;
  
  /** Panel dimensions */
  width: number;
  height: number;
  
  /** Time range for queries */
  timeRange: TimeRange;
  
  /** Called when panel options change */
  onOptionsChange?: (options: Record<string, unknown>) => void;
  
  /** Whether in edit mode */
  isEditing?: boolean;
}

export interface PanelData {
  series: DataSeries[];
  state: 'loading' | 'done' | 'error';
  error?: string;
}

export interface DataSeries {
  name: string;
  labels?: Record<string, string>;
  values: DataPoint[];
}

export interface DataPoint {
  timestamp: number;
  value: number;
}

export interface TimeRange {
  from: Date;
  to: Date;
  raw?: {
    from: string;
    to: string;
  };
}

export interface PanelEditorProps {
  options: Record<string, unknown>;
  onChange: (options: Record<string, unknown>) => void;
}

// ============================================================================
// Routing Types
// ============================================================================

export interface PluginRoute {
  /** Route path (e.g., "/my-plugin/settings") */
  path: string;
  
  /** React component to render */
  component: ComponentType<RouteComponentProps>;
  
  /** Page title */
  title?: string;
  
  /** Whether route requires authentication */
  requiresAuth?: boolean;
  
  /** Required permissions */
  permissions?: string[];
}

export interface RouteComponentProps {
  /** Current plugin context */
  pluginContext: PluginContext;
  
  /** Route parameters */
  params: Record<string, string>;
}

export interface NavigationItem {
  /** Unique identifier */
  id: string;
  
  /** Display label */
  label: string;
  
  /** Icon name (from lucide-react) */
  icon?: string;
  
  /** Route path */
  path: string;
  
  /** Navigation section: 'main' | 'admin' | 'settings' */
  section?: 'main' | 'admin' | 'settings';
  
  /** Sort order */
  order?: number;
  
  /** Required permissions */
  permissions?: string[];
  
  /** Child items */
  children?: NavigationItem[];
}

// ============================================================================
// Settings Types
// ============================================================================

export interface PluginSettingsProps {
  /** Current settings values */
  settings: Record<string, unknown>;
  
  /** Called when settings change */
  onChange: (settings: Record<string, unknown>) => void;
  
  /** Save settings */
  onSave: () => Promise<void>;
  
  /** Whether save is in progress */
  isSaving?: boolean;
}

// ============================================================================
// Context Types
// ============================================================================

export interface PluginContext {
  /** Plugin ID */
  pluginId: string;
  
  /** Plugin manifest */
  manifest: PluginManifest;
  
  /** Base URL for plugin assets */
  baseUrl: string;
  
  /** API client for plugin-specific endpoints */
  api: PluginApi;
  
  /** Theme information */
  theme: ThemeContext;
  
  /** Current user */
  user?: UserContext;
}

export interface PluginManifest {
  pluginId: string;
  name: string;
  version: string;
  title?: string;
  description?: string;
  capabilities: string[];
  author?: {
    name?: string;
    email?: string;
    homepage?: string;
  };
  entry?: {
    assembly?: string;
    frontendBundle?: string;
  };
}

export interface PluginApi {
  /** Make GET request to plugin API */
  get: <T>(path: string) => Promise<T>;
  
  /** Make POST request to plugin API */
  post: <T>(path: string, data?: unknown) => Promise<T>;
  
  /** Make PUT request to plugin API */
  put: <T>(path: string, data?: unknown) => Promise<T>;
  
  /** Make DELETE request to plugin API */
  delete: <T>(path: string) => Promise<T>;
}

export interface ThemeContext {
  isDark: boolean;
  colors: Record<string, string>;
}

export interface UserContext {
  id: string;
  username: string;
  email?: string;
  permissions: string[];
}

// ============================================================================
// Form Field Types
// ============================================================================

export interface FormFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'select' | 'boolean' | 'textarea' | 'color' | 'json';
  description?: string;
  placeholder?: string;
  required?: boolean;
  secret?: boolean;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;
  validation?: FieldValidation;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export interface PluginEvent<T = unknown> {
  type: string;
  pluginId: string;
  payload: T;
  timestamp: Date;
}

export type PluginEventHandler<T = unknown> = (event: PluginEvent<T>) => void;

