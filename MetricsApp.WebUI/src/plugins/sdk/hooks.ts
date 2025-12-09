/**
 * Plugin SDK React Hooks
 */

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PluginContextProvider } from './context';
import type {
  DataSourceInstance,
  PluginApi,
  PluginContext,
  PluginEvent,
  PluginEventHandler,
  TestConnectionResult,
  TimeRange,
} from './types';

// ============================================================================
// Core Hooks
// ============================================================================

/**
 * Access the current plugin context
 */
export function usePluginContext(): PluginContext {
  const context = useContext(PluginContextProvider);
  if (!context) {
    throw new Error('usePluginContext must be used within a PluginProvider');
  }
  return context;
}

/**
 * Get the plugin API client
 */
export function usePluginApi(): PluginApi {
  const { api } = usePluginContext();
  return api;
}

// ============================================================================
// Data Source Hooks
// ============================================================================

/**
 * Hook for managing data source configuration
 */
export function useDataSourceConfig<T extends Record<string, unknown>>(
  initialConfig: T
) {
  const [config, setConfig] = useState<T>(initialConfig);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const api = usePluginApi();

  const updateConfig = useCallback((updates: Partial<T>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
    setTestResult(null);
  }, []);

  const setFieldError = useCallback((field: string, error: string | null) => {
    setErrors((prev) => {
      if (error === null) {
        const { [field]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [field]: error };
    });
  }, []);

  const testConnection = useCallback(async (): Promise<TestConnectionResult> => {
    setIsTesting(true);
    try {
      const result = await api.post<TestConnectionResult>('/test-connection', config);
      setTestResult(result);
      return result;
    } catch (error) {
      const result: TestConnectionResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      };
      setTestResult(result);
      return result;
    } finally {
      setIsTesting(false);
    }
  }, [api, config]);

  const reset = useCallback(() => {
    setConfig(initialConfig);
    setErrors({});
    setIsDirty(false);
    setTestResult(null);
  }, [initialConfig]);

  return {
    config,
    setConfig,
    updateConfig,
    errors,
    setFieldError,
    isDirty,
    isTesting,
    testConnection,
    testResult,
    reset,
  };
}

/**
 * Hook for fetching available data sources
 */
export function useDataSources() {
  const [dataSources, setDataSources] = useState<DataSourceInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = usePluginApi();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<DataSourceInstance[]>('/datasources');
      setDataSources(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data sources');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { dataSources, loading, error, refresh };
}

// ============================================================================
// Query Hooks
// ============================================================================

interface QueryOptions {
  dataSourceId: string;
  query: string;
  timeRange: TimeRange;
  refreshInterval?: number;
}

interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for executing queries against a data source
 */
export function useQuery<T = unknown>(options: QueryOptions): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = usePluginApi();

  const execute = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.post<T>('/query', {
        dataSourceId: options.dataSourceId,
        query: options.query,
        timeRange: {
          from: options.timeRange.from.toISOString(),
          to: options.timeRange.to.toISOString(),
        },
      });
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  }, [api, options.dataSourceId, options.query, options.timeRange]);

  useEffect(() => {
    execute();
  }, [execute]);

  useEffect(() => {
    if (options.refreshInterval && options.refreshInterval > 0) {
      const interval = setInterval(execute, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [options.refreshInterval, execute]);

  return { data, loading, error, refetch: execute };
}

// ============================================================================
// Time Range Hooks
// ============================================================================

/**
 * Hook for managing time range selection
 */
export function useTimeRange(initialRange?: TimeRange) {
  const [timeRange, setTimeRange] = useState<TimeRange>(
    initialRange ?? {
      from: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      to: new Date(),
    }
  );

  const setRelativeRange = useCallback((duration: string) => {
    const now = new Date();
    let from: Date;

    switch (duration) {
      case '5m':
        from = new Date(now.getTime() - 5 * 60 * 1000);
        break;
      case '15m':
        from = new Date(now.getTime() - 15 * 60 * 1000);
        break;
      case '30m':
        from = new Date(now.getTime() - 30 * 60 * 1000);
        break;
      case '1h':
        from = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '6h':
        from = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case '12h':
        from = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        break;
      case '24h':
        from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        from = new Date(now.getTime() - 60 * 60 * 1000);
    }

    setTimeRange({ from, to: now, raw: { from: `now-${duration}`, to: 'now' } });
  }, []);

  const refresh = useCallback(() => {
    if (timeRange.raw?.to === 'now') {
      setTimeRange((prev) => ({
        ...prev,
        to: new Date(),
      }));
    }
  }, [timeRange.raw]);

  return { timeRange, setTimeRange, setRelativeRange, refresh };
}

// ============================================================================
// Theme Hooks
// ============================================================================

/**
 * Hook for accessing theme information
 */
export function usePluginTheme() {
  const { theme } = usePluginContext();
  return theme;
}

// ============================================================================
// Event Hooks
// ============================================================================

const eventListeners = new Map<string, Set<PluginEventHandler>>();

/**
 * Emit a plugin event
 */
export function emitPluginEvent<T>(type: string, pluginId: string, payload: T) {
  const event: PluginEvent<T> = {
    type,
    pluginId,
    payload,
    timestamp: new Date(),
  };

  const handlers = eventListeners.get(type);
  if (handlers) {
    handlers.forEach((handler) => handler(event));
  }
}

/**
 * Subscribe to plugin events
 */
export function usePluginEvent<T = unknown>(
  eventType: string,
  handler: PluginEventHandler<T>
) {
  useEffect(() => {
    if (!eventListeners.has(eventType)) {
      eventListeners.set(eventType, new Set());
    }
    
    const handlers = eventListeners.get(eventType)!;
    handlers.add(handler as PluginEventHandler);

    return () => {
      handlers.delete(handler as PluginEventHandler);
      if (handlers.size === 0) {
        eventListeners.delete(eventType);
      }
    };
  }, [eventType, handler]);
}

// ============================================================================
// Settings Hooks
// ============================================================================

/**
 * Hook for managing plugin settings
 */
export function usePluginSettings<T extends Record<string, unknown>>(
  defaultSettings: T
) {
  const [settings, setSettings] = useState<T>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const api = usePluginApi();
  const { pluginId } = usePluginContext();

  // Load settings on mount
  useEffect(() => {
    const load = async () => {
      try {
        const saved = await api.get<T>(`/plugins/${pluginId}/settings`);
        setSettings({ ...defaultSettings, ...saved });
      } catch {
        // Use defaults if no saved settings
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [api, pluginId, defaultSettings]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/plugins/${pluginId}/settings`, settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [api, pluginId, settings]);

  const updateSettings = useCallback((updates: Partial<T>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  return { settings, updateSettings, save, loading, saving, error };
}

// ============================================================================
// Permission Hooks
// ============================================================================

/**
 * Hook for checking user permissions
 */
export function usePermission(permission: string): boolean {
  const { user } = usePluginContext();
  return useMemo(() => {
    if (!user) return false;
    return user.permissions.includes(permission) || user.permissions.includes('*');
  }, [user, permission]);
}

/**
 * Hook for checking multiple permissions
 */
export function usePermissions(permissions: string[]): Record<string, boolean> {
  const { user } = usePluginContext();
  return useMemo(() => {
    const result: Record<string, boolean> = {};
    for (const perm of permissions) {
      result[perm] = user
        ? user.permissions.includes(perm) || user.permissions.includes('*')
        : false;
    }
    return result;
  }, [user, permissions]);
}

