/**
 * Plugin SDK Context Provider
 */

import React, { createContext, useMemo, type ReactNode } from 'react';
import type { PluginApi, PluginContext, PluginManifest, ThemeContext, UserContext } from './types';

// Create the context with a default value of null
export const PluginContextProvider = createContext<PluginContext | null>(null);

interface PluginProviderProps {
  pluginId: string;
  manifest: PluginManifest;
  baseUrl?: string;
  theme?: ThemeContext;
  user?: UserContext;
  children: ReactNode;
}

/**
 * Provider component that wraps plugin components to provide context
 */
export function PluginProvider({
  pluginId,
  manifest,
  baseUrl = '/api/v1',
  theme,
  user,
  children,
}: PluginProviderProps) {
  // Create the API client
  const api = useMemo<PluginApi>(() => {
    const makeRequest = async <T,>(
      method: string,
      path: string,
      data?: unknown
    ): Promise<T> => {
      const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data !== undefined) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json();
      }

      return undefined as T;
    };

    return {
      get: <T,>(path: string) => makeRequest<T>('GET', path),
      post: <T,>(path: string, data?: unknown) => makeRequest<T>('POST', path, data),
      put: <T,>(path: string, data?: unknown) => makeRequest<T>('PUT', path, data),
      delete: <T,>(path: string) => makeRequest<T>('DELETE', path),
    };
  }, [baseUrl]);

  // Default theme if not provided
  const defaultTheme: ThemeContext = {
    isDark: document.documentElement.classList.contains('dark'),
    colors: {
      primary: 'var(--interactive-primary)',
      secondary: 'var(--interactive-secondary)',
      background: 'var(--bg-primary)',
      surface: 'var(--bg-secondary)',
      text: 'var(--text-primary)',
      textSecondary: 'var(--text-secondary)',
      border: 'var(--border-primary)',
      error: 'var(--status-error)',
      warning: 'var(--status-warning)',
      success: 'var(--status-success)',
    },
  };

  const context = useMemo<PluginContext>(
    () => ({
      pluginId,
      manifest,
      baseUrl,
      api,
      theme: theme ?? defaultTheme,
      user,
    }),
    [pluginId, manifest, baseUrl, api, theme, user]
  );

  return (
    <PluginContextProvider.Provider value={context}>
      {children}
    </PluginContextProvider.Provider>
  );
}

/**
 * Higher-order component to inject plugin context
 */
export function withPluginContext<P extends object>(
  WrappedComponent: React.ComponentType<P & { pluginContext: PluginContext }>
) {
  return function WithPluginContextComponent(props: Omit<P, 'pluginContext'>) {
    return (
      <PluginContextProvider.Consumer>
        {(context) => {
          if (!context) {
            throw new Error('withPluginContext must be used within a PluginProvider');
          }
          return <WrappedComponent {...(props as P)} pluginContext={context} />;
        }}
      </PluginContextProvider.Consumer>
    );
  };
}

