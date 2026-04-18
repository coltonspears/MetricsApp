import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Resolve API target. Honor Aspire-injected service discovery vars first,
  // then VITE_API_PROXY_TARGET, then fall back to the dev API port.
  const apiTarget =
    env['services__metricsapp-api__https__0'] ??
    env['services__metricsapp-api__http__0'] ??
    env.VITE_API_PROXY_TARGET ??
    'https://localhost:7201'

  return {
    plugins: [react()],
    server: {
      port: 3533,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
