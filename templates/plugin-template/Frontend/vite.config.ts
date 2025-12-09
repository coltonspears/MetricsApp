import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'),
      name: 'TemplatePlugin',
      fileName: 'template-plugin.bundle',
      formats: ['umd'],
    },
    rollupOptions: {
      // Externalize dependencies that are provided by the host app
      external: ['react', 'react-dom', '@metricsapp/plugin-sdk'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@metricsapp/plugin-sdk': 'MetricsAppPluginSDK',
        },
      },
    },
    outDir: 'dist',
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});

