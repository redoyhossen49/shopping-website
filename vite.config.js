import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend origin used by the dev/preview proxy. Override with
// VITE_API_PROXY_TARGET if the API runs somewhere other than :5000.
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:5000'

// Forward /api/* to the backend so the browser only ever talks to the Vite
// origin. This removes cross-origin requests (and CORS) in development while
// working on whichever port Vite happens to bind (5173, 5174, ...).
const proxy = {
  '/api': {
    target: apiProxyTarget,
    changeOrigin: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // No strictPort: if the preferred port is busy, Vite moves to the next one.
    proxy,
  },
  preview: {
    proxy,
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    // Route-level code splitting keeps the initial bundle small; keep this
    // generous enough that a legitimately large admin chunk does not warn.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Pull the framework runtime into a long-lived, cacheable chunk so it
        // is not re-downloaded when application code changes.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-router')) return 'vendor-router'
          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react'
          }
          return undefined
        },
      },
    },
  },
})
